import type { Response } from "express";

export const sendSuccess = (
  res: Response,
  data: unknown,
  message = "Success",
  statusCode = 200,
): void => {
  res.status(statusCode).json({ success: true, message, data });
};

export const sendError = (
  res: Response,
  message: string,
  statusCode = 500,
  errors: unknown[] = [],
): void => {
  res.status(statusCode).json({ success: false, message, errors });
};
