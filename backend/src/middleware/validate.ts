import type { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import { ApiError } from "../utils/apiError";

export const validate = (req: Request, _res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ApiError(422, "Validation failed", errors.array()));
  }
  next();
};
