import mongoose from "mongoose";
import { Ingredient } from "../models/Ingredient";
import { StockLog } from "../models/StockLog";
import { ApiError } from "../utils/apiError";
import type { IOrderItem } from "../models/Order";

const UNITS_PER_PIZZA: Record<string, number> = {
  base: 1,
  sauce: 1,
  cheese: 1,
  vegetable: 1,
};

export const checkStockAvailability = async (
  items: IOrderItem[],
): Promise<{ available: boolean; shortfall?: string }> => {
  for (const item of items) {
    const qty = item.quantity;
    if (item.type === "custom" && item.customBuild) {
      const { base, sauce, cheese, vegetables } = item.customBuild;
      const ids = [base, sauce, cheese, ...vegetables];
      for (const id of ids) {
        const ing = await Ingredient.findById(id);
        if (!ing) return { available: false, shortfall: `Ingredient ${id} not found` };
        if (ing.currentStock < qty * UNITS_PER_PIZZA[ing.type]) {
          return { available: false, shortfall: `${ing.name} is out of stock` };
        }
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
      if (item.type === "custom" && item.customBuild) {
        const { base, sauce, cheese, vegetables } = item.customBuild;
        const ids = [base, sauce, cheese, ...vegetables];
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
    }
    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};
