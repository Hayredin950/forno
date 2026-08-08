import type { Request, Response, NextFunction } from "express";
import { User } from "../models/User";
import { sendSuccess } from "../utils/apiResponse";
import { ApiError } from "../utils/apiError";
import { asyncHandler } from "../utils/asyncHandler";

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const { search, page = "1", limit = "20", status, provider, sort = "newest" } = req.query as Record<string, string>;

  const filter: Record<string, unknown> = {};
  if (search) {
    const rx = escapeRegExp(search);
    filter["$or"] = [
      { name: { $regex: rx, $options: "i" } },
      { email: { $regex: rx, $options: "i" } },
    ];
  }
  if (status === "active") filter["isActive"] = true;
  if (status === "banned") filter["isActive"] = false;
  if (provider === "email") filter["googleId"] = null; // { $eq: null } matches missing too
  if (provider === "google") filter["googleId"] = { $ne: null };

  const sortMap: Record<string, Record<string, 1 | -1>> = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    name_asc: { name: 1 },
    name_desc: { name: -1 },
  };

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(100, Math.max(1, Number(limit)));
  const skip = (pageNum - 1) * limitNum;

  const [users, total] = await Promise.all([
    User.find(filter)
      .select("name email phone isVerified isActive googleId createdAt")
      .sort(sortMap[sort] ?? { createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    User.countDocuments(filter),
  ]);

  sendSuccess(res, { users, total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) });
});

export const toggleUserActive = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params as { id: string };
  const user = await User.findById(id);
  if (!user) return next(new ApiError(404, "User not found"));

  user.isActive = !user.isActive;
  await user.save();

  sendSuccess(res, { id: user._id, isActive: user.isActive }, `User ${user.isActive ? "activated" : "deactivated"}`);
});

export const deleteUser = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params as { id: string };
  const user = await User.findByIdAndDelete(id);
  if (!user) return next(new ApiError(404, "User not found"));

  sendSuccess(res, {}, "User deleted");
});
