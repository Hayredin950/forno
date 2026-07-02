import { Schema, model, type Document, type Types } from "mongoose";

interface CustomBuild {
  base: string;
  sauce: string;
  cheese: string;
  vegetables: string[];
}

export interface IOrderItem {
  type: "preset" | "custom";
  pizzaRef?: Types.ObjectId;
  customBuild?: CustomBuild;
  quantity: number;
  price: number;
}

export interface IOrder extends Document {
  user: Types.ObjectId;
  items: IOrderItem[];
  totalAmount: number;
  paymentStatus: "pending" | "paid" | "failed";
  paymentId: string | null;
  razorpayOrderId: string | null;
  orderStatus: "Order Received" | "In Kitchen" | "Sent to Delivery" | "Delivered";
  createdAt: Date;
  statusUpdatedAt: Date;
}

const customBuildSchema = new Schema(
  {
    base: { type: String, required: true },
    sauce: { type: String, required: true },
    cheese: { type: String, required: true },
    vegetables: [{ type: String }],
  },
  { _id: false },
);

const orderItemSchema = new Schema(
  {
    type: { type: String, required: true, enum: ["preset", "custom"] },
    pizzaRef: { type: Schema.Types.ObjectId, ref: "Pizza" },
    customBuild: customBuildSchema,
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const orderSchema = new Schema<IOrder>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    items: [orderItemSchema],
    totalAmount: { type: Number, required: true, min: 0 },
    paymentStatus: { type: String, default: "pending", enum: ["pending", "paid", "failed"] },
    paymentId: { type: String, default: null },
    razorpayOrderId: { type: String, default: null },
    orderStatus: {
      type: String,
      default: "Order Received",
      enum: ["Order Received", "In Kitchen", "Sent to Delivery", "Delivered"],
    },
    statusUpdatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1 });

export const Order = model<IOrder>("Order", orderSchema);
