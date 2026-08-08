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
    changeAmount = Math.min(amount, ingredient.maxCapacity) - ingredient.currentStock;
    ingredient.currentStock = Math.min(amount, ingredient.maxCapacity);
  } else if (action === "increment") {
    changeAmount = Math.min(amount, ingredient.maxCapacity - ingredient.currentStock);
    ingredient.currentStock = Math.min(
      ingredient.maxCapacity,
      ingredient.currentStock + amount,
    );
    if (changeAmount > 0) ingredient.lastRestockedAt = new Date();
  } else {
    changeAmount = -Math.min(amount, ingredient.currentStock);
    ingredient.currentStock = Math.max(0, ingredient.currentStock - amount);
  }

  ingredient.isAvailable = ingredient.currentStock > 0;
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

export const createIngredient = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { type, name, unit, price, currentStock, maxCapacity, lowStockThreshold, image } = req.body as {
    type: "base" | "sauce" | "cheese" | "vegetable";
    name: string;
    unit: string;
    price?: number;
    currentStock?: number;
    maxCapacity?: number;
    lowStockThreshold?: number;
    image?: string;
  };

  if (!["base", "sauce", "cheese", "vegetable"].includes(type)) {
    return next(new ApiError(400, "type must be base, sauce, cheese, or vegetable"));
  }
  if (!name?.trim() || !unit?.trim()) {
    return next(new ApiError(400, "name and unit are required"));
  }

  const existing = await Ingredient.findOne({ name: name.trim() });
  if (existing) return next(new ApiError(409, "An ingredient with this name already exists"));

  const ingredient = await Ingredient.create({
    type,
    name: name.trim(),
    unit,
    price: price ?? 0,
    currentStock: currentStock ?? 0,
    maxCapacity: maxCapacity ?? 50,
    lowStockThreshold: lowStockThreshold ?? 10,
    image: image ?? "",
    isAvailable: (currentStock ?? 0) > 0,
  });

  sendSuccess(res, ingredient, "Ingredient created", 201);
});

export const updateIngredientDetails = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params as { id: string };
  const { name, unit, price, image } = req.body as {
    name?: string;
    unit?: string;
    price?: number;
    image?: string;
  };

  const updates: Record<string, unknown> = {};
  if (name !== undefined) {
    if (!String(name).trim()) return next(new ApiError(400, "name cannot be empty"));
    updates.name = String(name).trim();
  }
  if (unit !== undefined) {
    if (!String(unit).trim()) return next(new ApiError(400, "unit cannot be empty"));
    updates.unit = String(unit).trim();
  }
  if (price !== undefined) {
    const p = Number(price);
    if (!Number.isFinite(p) || p < 0) return next(new ApiError(400, "price must be a non-negative number"));
    updates.price = p;
  }
  if (image !== undefined) updates.image = String(image);

  // Reject renames that collide with an existing ingredient (same guard as create).
  if (updates.name) {
    const existing = await Ingredient.findOne({ name: updates.name, _id: { $ne: id } });
    if (existing) return next(new ApiError(409, "An ingredient with this name already exists"));
  }

  const ingredient = await Ingredient.findByIdAndUpdate(id, updates, { new: true });
  if (!ingredient) return next(new ApiError(404, "Ingredient not found"));

  sendSuccess(res, ingredient, "Ingredient updated");
});

export const deleteIngredient = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params as { id: string };
  const ingredient = await Ingredient.findByIdAndDelete(id);
  if (!ingredient) return next(new ApiError(404, "Ingredient not found"));

  await StockLog.deleteMany({ ingredient: id });
  sendSuccess(res, {}, "Ingredient deleted");
});

export const adjustStock = asyncHandler(async (req: AuthAdminRequest, res: Response, next: NextFunction) => {
  const { id } = req.params as { id: string };
  const { amount } = req.body as { amount: number };

  if (typeof amount !== "number") {
    return next(new ApiError(400, "amount must be a number"));
  }

  const ingredient = await Ingredient.findById(id);
  if (!ingredient) return next(new ApiError(404, "Ingredient not found"));

  ingredient.currentStock = Math.max(0, Math.min(ingredient.maxCapacity, ingredient.currentStock + amount));
  if (amount > 0) {
    ingredient.lastRestockedAt = new Date();
  }
  ingredient.isAvailable = ingredient.currentStock > 0;
  await ingredient.save();

  const reason = amount > 0 ? "restock" : "manual_update";
  await StockLog.create({ ingredient: id, changeAmount: amount, reason, adminId: req.adminId, timestamp: new Date() });

  sendSuccess(res, ingredient, "Stock adjusted");
});
