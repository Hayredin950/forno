import type { Request, Response } from "express";
import { isValidObjectId } from "mongoose";
import { Upload } from "../models/Upload";
import { sendSuccess } from "../utils/apiResponse";
import { ApiError } from "../utils/apiError";
import { asyncHandler } from "../utils/asyncHandler";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

// Magic bytes per extension, used to verify the decoded content is really an
// image of the claimed format (not just a spoofed data-URL header).
const MAGIC: [Buffer, string[]][] = [
  [Buffer.from([0x89, 0x50, 0x4e, 0x47]), ["png"]],
  [Buffer.from([0xff, 0xd8, 0xff]), ["jpg"]],
  [Buffer.from([0x47, 0x49, 0x46, 0x38]), ["gif"]],
  [Buffer.from([0x52, 0x49, 0x46, 0x46]), ["webp"]], // RIFF....WEBP
];

/**
 * POST /admin/upload
 * Accepts a base64 data URL (or a plain http(s) URL, passed through unchanged).
 * Images are stored in MongoDB so they survive redeploys, and served back via
 * the public GET /uploads/:id route. Returns the URL to store on pizzas and
 * ingredients (e.g. "/uploads/507f1f77bcf86cd799439011").
 */
export const uploadImage = asyncHandler(async (req: Request, res: Response) => {
  const dataUrl = String(req.body?.image ?? "").trim();
  if (!dataUrl) throw new ApiError(400, "image (data URL or image URL) is required");

  // Already a hosted URL — nothing to store.
  if (/^https?:\/\//.test(dataUrl)) {
    return sendSuccess(res, { url: dataUrl });
  }

  const match = /^data:image\/(png|jpe?g|webp|gif);base64,(.+)$/s.exec(dataUrl);
  if (!match) {
    throw new ApiError(400, "image must be a base64 data URL (data:image/png;base64,...)");
  }

  const ext = match[1] === "jpeg" ? "jpg" : match[1];
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length === 0) throw new ApiError(400, "image data is empty");
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new ApiError(400, `image is too large (max ${MAX_IMAGE_BYTES / 1024 / 1024}MB)`);
  }

  const valid = MAGIC.some(([sig, exts]) => exts.includes(ext) && buffer.subarray(0, sig.length).equals(sig));
  if (!valid) throw new ApiError(400, "file content does not match an image format");

  const upload = await Upload.create({
    mime: `image/${ext === "jpg" ? "jpeg" : ext}`,
    data: buffer,
    size: buffer.length,
  });

  sendSuccess(res, { url: `/uploads/${upload._id.toString()}` });
});

/**
 * GET /uploads/:id — public, serves a stored image with the correct content
 * type and long-lived cache headers (uploaded images never change).
 */
export const getUpload = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  // Reject non-ObjectId values up front so a bad id returns a clean 404
  // instead of a mongoose CastError (500).
  if (!isValidObjectId(id)) throw new ApiError(404, "Image not found");
  const upload = await Upload.findById(id);
  if (!upload) throw new ApiError(404, "Image not found");

  res.setHeader("Content-Type", upload.mime);
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.send(upload.data);
});
