import type { Request, Response, NextFunction } from "express";
import { User } from "../models/User";
import { sendSuccess } from "../utils/apiResponse";
import { ApiError } from "../utils/apiError";
import { asyncHandler } from "../utils/asyncHandler";

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const { search, page = "1", limit = "20" } = req.query as Record<string, string>;

  const filter: Record<string, unknown> = {};
  if (search) {
    const rx = escapeRegExp(search);
    filter["$or"] = [
      { name: { $regex: rx, $options: "i" } },
      { email: { $regex: rx, $options: "i" } },
    ];
  }

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(100, Math.max(1, Number(limit)));
  const skip = (pageNum - 1) * limitNum;

  const [users, total] = await Promise.all([
    User.find(filter)
      .select("name email isVerified isActive googleId createdAt")
      .sort({ createdAt: -1 })
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
