import { Schema, model, type Document } from "mongoose";

export interface IPizza extends Document {
  name: string;
  image: string;
  description: string;
  basePrice: number;
  category: "veg" | "non-veg";
  isCustom: boolean;
  tags: string[];
  ingredients: string[];
  isAvailable: boolean;
  orderCount: number;
}

const pizzaSchema = new Schema<IPizza>(
  {
    name: { type: String, required: true, trim: true },
    image: { type: String, default: "" },
    description: { type: String, default: "" },
    basePrice: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, enum: ["veg", "non-veg"] },
    isCustom: { type: Boolean, default: false },
    tags: { type: [String], default: [] },
    ingredients: { type: [String], default: [] },
    isAvailable: { type: Boolean, default: true },
    orderCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const Pizza = model<IPizza>("Pizza", pizzaSchema);
