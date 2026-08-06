import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { ApiError } from "../utils/apiError";
import { logger } from "../lib/logger";

interface MongoLikeError extends Error {
  code?: number;
  keyValue?: Record<string, unknown>;
  path?: string;
  name: string;
}

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof ApiError && err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
    });
    return;
  }

  // CastError: an invalid ObjectId (e.g. GET /orders/not-an-id) — 400, not 500.
  if (err instanceof mongoose.Error.CastError || (err as MongoLikeError).name === "CastError") {
    res.status(400).json({ success: false, message: "Invalid id format", errors: [] });
    return;
  }

  // ValidationError: schema violations (bad enum, negative values, …) — 400.
  if (err instanceof mongoose.Error.ValidationError) {
    const fields = Object.values(err.errors).map((e) => e.message);
    res.status(400).json({ success: false, message: "Invalid data", errors: fields });
    return;
  }

  // Duplicate key (E11000): register/logic races — 409.
  if ((err as MongoLikeError).code === 11000) {
    res.status(409).json({ success: false, message: "Duplicate value — that record already exists", errors: [] });
    return;
  }

  logger.error({ err }, "Unhandled error");

  res.status(500).json({
    success: false,
    message: process.env["NODE_ENV"] === "production" ? "Internal server error" : err.message,
  });
};