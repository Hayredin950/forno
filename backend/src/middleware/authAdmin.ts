import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { ApiError } from "../utils/apiError";

export interface AuthAdminRequest extends Request {
  adminId?: string;
}

export const authAdmin = (req: AuthAdminRequest, _res: Response, next: NextFunction): void => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(new ApiError(401, "Authentication token missing"));
  }
  const token = header.split(" ")[1];
  const secret = process.env["JWT_ADMIN_SECRET"];
  if (!secret) return next(new ApiError(500, "JWT_ADMIN_SECRET not configured"));

  try {
    const payload = jwt.verify(token, secret) as { id: string; role: string };
    if (payload.role !== "admin") return next(new ApiError(403, "Admin access required"));
    req.adminId = payload.id;
    next();
  } catch {
    next(new ApiError(401, "Invalid or expired token"));
  }
};
