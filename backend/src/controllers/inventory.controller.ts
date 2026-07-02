import type { Request, Response, NextFunction } from "express";
import { Ingredient } from "../models/Ingredient";
import { StockLog } from "../models/StockLog";
import { sendSuccess } from "../utils/apiResponse";
import { ApiError } from "../utils/apiError";
import { asyncHandler } from "../utils/asyncHandler";
import type { AuthAdminRequest } from "../middleware/authAdmin";

export const listInventory = asyncHandler(async (req: Request, res: Response) => {
  const { category } = req.query;
  let query: any = {};
  if (category) {
    query.type = category;
  }
  const items = await Ingredient.find(query).sort({ type: 1, name: 1 });
  sendSuccess(res, items);
});

export const updateStock = asyncHandler(async (req: AuthAdminRequest, res: Response, next: NextFunction) => {
  const { id } = req.params as { id: string };
  const { action, amount } = req.body as { action: "set" | "increment" | "decrement"; amount: number };

  if (!["set", "increment", "decrement"].includes(action)) {
    return next(new ApiError(400, "action must be 'set', 'increment', or 'decrement'"));
  }
  if (typeof amount !== "number" || amount < 0) {
    return next(new ApiError(400, "amount must be a non-negative number"));
  }

  const ingredient = await Ingredient.findById(id);
  if (!ingredient) return next(new ApiError(404, "Ingredient not found"));

  let changeAmount = 0;
  if (action === "set") {
    changeAmount = amount - ingredient.currentStock;
    ingredient.currentStock = amount;
  } else if (action === "increment") {
    changeAmount = amount;
    ingredient.currentStock += amount;
    ingredient.lastRestockedAt = new Date();
  } else {
    changeAmount = -amount;
    ingredient.currentStock = Math.max(0, ingredient.currentStock - amount);
  }

  await ingredient.save();

  const reason = action === "increment" ? "restock" : "manual_update";
  await StockLog.create({ ingredient: id, changeAmount, reason, adminId: req.adminId, timestamp: new Date() });

  sendSuccess(res, ingredient, "Stock updated");
});

export const updateThreshold = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params as { id: string };
  const { lowStockThreshold } = req.body as { lowStockThreshold: number };

  if (typeof lowStockThreshold !== "number" || lowStockThreshold < 0) {
    return next(new ApiError(400, "lowStockThreshold must be a non-negative number"));
  }

  const ingredient = await Ingredient.findByIdAndUpdate(id, { lowStockThreshold }, { new: true });
  if (!ingredient) return next(new ApiError(404, "Ingredient not found"));

  sendSuccess(res, ingredient, "Threshold updated");
});

export const adjustStock = asyncHandler(async (req: AuthAdminRequest, res: Response, next: NextFunction) => {
  const { id } = req.params as { id: string };
  const { amount } = req.body as { amount: number };

  if (typeof amount !== "number") {
    return next(new ApiError(400, "amount must be a number"));
  }

  const ingredient = await Ingredient.findById(id);
  if (!ingredient) return next(new ApiError(404, "Ingredient not found"));

  ingredient.currentStock = Math.max(0, ingredient.currentStock + amount);
  if (amount > 0) {
    ingredient.lastRestockedAt = new Date();
  }
  await ingredient.save();

  const reason = amount > 0 ? "restock" : "usage";
  await StockLog.create({ ingredient: id, changeAmount: amount, reason, adminId: req.adminId, timestamp: new Date() });

  sendSuccess(res, ingredient, "Stock adjusted");
});
