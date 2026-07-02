import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiError";
import { logger } from "../lib/logger";

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

  logger.error({ err }, "Unhandled error");

  res.status(500).json({
    success: false,
    message: process.env["NODE_ENV"] === "production" ? "Internal server error" : err.message,
  });
};
