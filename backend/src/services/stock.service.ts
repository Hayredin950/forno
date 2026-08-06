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

/**
 * Resolve ingredient ids for a preset pizza: match the pizza's ingredient
 * names against inventory items (case-insensitive). Some preset pizzas use
 * display names (e.g. "Mozzarella Cheese") that may not map 1:1 to an
 * inventory entry — unmatched names are skipped gracefully.
 */
const resolvePresetIngredients = async (pizzaRef: unknown): Promise<string[]> => {
  const pizza = await Pizza.findById(pizzaRef);
  if (!pizza || !pizza.ingredients?.length) return [];

  const inventory = await Ingredient.find({
    name: { $in: pizza.ingredients.map((n) => new RegExp(`^${escapeRegExp(n)}$`, "i")) },
  });
  return inventory.map((i) => String(i._id));
};

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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

export const decrementStockForOrder = async (
  items: IOrderItem[],
  orderId: string,
): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    for (const item of items) {
      const qty = item.quantity;
      const ids = await ingredientIdsForItem(item);
      for (const id of ids) {
        const updated = await Ingredient.findByIdAndUpdate(
          id,
          { $inc: { currentStock: -qty } },
          { new: true, session },
        );
        if (!updated || updated.currentStock < 0) {
          throw new ApiError(409, `Insufficient stock for order ${orderId}`);
        }
        await StockLog.create(
          [
            {
              ingredient: id,
              changeAmount: -qty,
              reason: "order",
              adminId: null,
              timestamp: new Date(),
            },
          ],
          { session },
        );
      }
    }
    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};
