import { Schema, model, type Document } from "mongoose";

export interface IIngredient extends Document {
  type: "base" | "sauce" | "cheese" | "vegetable";
  name: string;
  image: string;
  currentStock: number;
  maxCapacity: number;
  lowStockThreshold: number;
  unit: string;
  price: number;
  isAvailable: boolean;
  lastRestockedAt: Date | null;
  lastAlertSentAt: Date | null;
}

const ingredientSchema = new Schema<IIngredient>(
  {
    type: { type: String, required: true, enum: ["base", "sauce", "cheese", "vegetable"] },
    name: { type: String, required: true, trim: true },
    image: { type: String, default: "" },
    currentStock: { type: Number, required: true, min: 0 },
    maxCapacity: { type: Number, required: true, default: 50 },
    lowStockThreshold: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true },
    price: { type: Number, default: 0 },
    isAvailable: { type: Boolean, default: true },
    lastRestockedAt: { type: Date, default: null },
    lastAlertSentAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const Ingredient = model<IIngredient>("Ingredient", ingredientSchema);
