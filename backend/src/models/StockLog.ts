import { Schema, model, type Document, type Types } from "mongoose";

export interface IStockLog extends Document {
  ingredient: Types.ObjectId;
  changeAmount: number;
  reason: "order" | "manual_update" | "restock" | "cancel";
  adminId: Types.ObjectId | null;
  timestamp: Date;
}

const stockLogSchema = new Schema<IStockLog>(
  {
    ingredient: { type: Schema.Types.ObjectId, ref: "Ingredient", required: true },
    changeAmount: { type: Number, required: true },
    reason: { type: String, required: true, enum: ["order", "manual_update", "restock", "cancel"] },
    adminId: { type: Schema.Types.ObjectId, ref: "Admin", default: null },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

stockLogSchema.index({ ingredient: 1, timestamp: -1 });

export const StockLog = model<IStockLog>("StockLog", stockLogSchema);
