import mongoose from "mongoose";
import { Ingredient } from "../models/Ingredient";
import { Pizza } from "../models/Pizza";
import { StockLog } from "../models/StockLog";
import { ApiError } from "../utils/apiError";
import type { IOrderItem } from "../models/Order";

const UNITS_PER_PIZZA: Record<string, number> = {
  base: 1,
  sauce: 1,
  cheese: 1,
  vegetable: 1,
};

/** Resolve ingredient docs referenced by an order item (custom build ids). */
const resolveCustomIds = async (item: IOrderItem): Promise<string[]> => {
  const { base, sauce, cheese, vegetables } = item.customBuild!;
  return [base, sauce, cheese, ...(vegetables ?? [])].filter(Boolean);
};

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Resolve ingredient ids for a preset pizza by fuzzy-matching the pizza's
 * ingredient names against inventory items. Pizza recipes use display names
 * ("Mozzarella Cheese", "Tomato Sauce", "Grilled Chicken") while inventory
 * uses shorter names ("Mozzarella", "Classic Tomato") — so a plain exact
 * match leaves preset orders consuming ZERO stock. Strategy: exact match
 * first, then either name containing the other (case-insensitive).
 */
const resolvePresetIngredients = async (pizzaRef: unknown): Promise<string[]> => {
  const pizza = await Pizza.findById(pizzaRef);
  if (!pizza || !pizza.ingredients?.length) return [];

  const inventory = await Ingredient.find({});
  const ids: string[] = [];
  for (const name of pizza.ingredients) {
    const needle = name.trim().toLowerCase();
    if (!needle) continue;
    const exact = inventory.find((i) => i.name.toLowerCase() === needle);
    const match =
      exact ??
      inventory.find(
        (i) => i.name.toLowerCase().includes(needle) || needle.includes(i.name.toLowerCase()),
      );
    if (match) ids.push(String(match._id));
  }
  return ids;
};

/** Ingredient ids an order item consumes. */
const ingredientIdsForItem = async (item: IOrderItem): Promise<string[]> => {
  if (item.type === "custom" && item.customBuild) return resolveCustomIds(item);
  if (item.type === "preset") return resolvePresetIngredients(item.pizzaRef);
  return [];
};

export const checkStockAvailability = async (
  items: IOrderItem[],
): Promise<{ available: boolean; shortfall?: string }> => {
  for (const item of items) {
    const qty = item.quantity;
    const ids = await ingredientIdsForItem(item);
    for (const id of ids) {
      const ing = await Ingredient.findById(id);
      if (!ing) return { available: false, shortfall: `Ingredient ${id} not found` };
      if (ing.currentStock < qty * UNITS_PER_PIZZA[ing.type]) {
        return { available: false, shortfall: `${ing.name} is out of stock` };
      }
    }
  }
  return { available: true };
};

/**
 * Atomically decrement stock for an order. Uses conditional $inc updates
 * (currentStock >= qty) instead of a read-then-write, so concurrent orders
 * can't oversell. Mongo transactions are NOT used because they require a
 * replica set — this must work on a standalone dev/CI database too.
 */
export const decrementStockForOrder = async (
  items: IOrderItem[],
  orderId: string,
): Promise<void> => {
  const updates: Array<{ id: string; qty: number }> = [];
  for (const item of items) {
    const qty = item.quantity;
    const ids = await ingredientIdsForItem(item);
    for (const id of ids) updates.push({ id, qty });
  }

  for (const { id, qty } of updates) {
    const updated = await Ingredient.findOneAndUpdate(
      { _id: id, currentStock: { $gte: qty } },
      { $inc: { currentStock: -qty }, $set: { isAvailable: true } },
      { new: true },
    );
    if (!updated) {
      const ing = await Ingredient.findById(id);
      throw new ApiError(409, `Insufficient stock for ${ing?.name ?? "an ingredient"} (order ${orderId})`);
    }
    if (updated.currentStock === 0) {
      await Ingredient.updateOne({ _id: id }, { isAvailable: false });
    }
    await StockLog.create({
      ingredient: id,
      changeAmount: -qty,
      reason: "order",
      adminId: null,
      timestamp: new Date(),
    });
  }
};

/**
 * Return stock to inventory for a cancelled order. Mirrors
 * decrementStockForOrder: each ingredient the order consumed gets its
 * quantity added back, `isAvailable` is re-enabled once stock is back
 * above zero, and every change is logged with reason "cancel". No
 * conditional guard is needed here — restoring can't oversell.
 */
export const restoreStockForOrder = async (items: IOrderItem[]): Promise<void> => {
  const updates: Array<{ id: string; qty: number }> = [];
  for (const item of items) {
    const qty = item.quantity;
    const ids = await ingredientIdsForItem(item);
    for (const id of ids) updates.push({ id, qty });
  }

  for (const { id, qty } of updates) {
    const ing = await Ingredient.findByIdAndUpdate(id, { $inc: { currentStock: qty } }, { new: true });
    // Ingredient may have been deleted since the order was placed — skip it.
    if (!ing) continue;
    if (ing.currentStock > 0 && !ing.isAvailable) {
      await Ingredient.updateOne({ _id: id }, { isAvailable: true });
    }
    await StockLog.create({
      ingredient: id,
      changeAmount: qty,
      reason: "cancel",
      adminId: null,
      timestamp: new Date(),
    });
  }
};

// Keep the session-based API shape available (used only where the caller
// opted into transactions) without breaking existing imports.
export const supportsTransactions = (): boolean => !!mongoose.connection.replset;
