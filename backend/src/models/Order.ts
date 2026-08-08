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
  name?: string;
  quantity: number;
  price: number;
}

export interface DeliveryAddress {
  street: string;
  city: string;
  state: string;
  pincode: string;
  lat?: number;
  lng?: number;
}

export interface IStatusEntry {
  status: string;
  timestamp: Date;
  updatedBy: string;
}

export interface IOrder extends Document {
  user: Types.ObjectId;
  items: IOrderItem[];
  subtotal: number;
  tax: number;
  deliveryFee: number;
  totalAmount: number;
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  paymentId: string | null;
  razorpayOrderId: string | null;
  orderStatus: "Order Received" | "Approved" | "In Kitchen" | "Ready" | "Sent to Delivery" | "Delivered" | "Cancelled";
  deliveryAddress: DeliveryAddress;
  statusHistory: IStatusEntry[];
  estimatedTime: Date;
  statusUpdatedAt: Date;
  createdAt: Date;
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
    name: { type: String, default: "" },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const deliveryAddressSchema = new Schema(
  {
    street: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    pincode: { type: String, default: "" },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
  },
  { _id: false },
);

const orderSchema = new Schema<IOrder>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    items: [orderItemSchema],
    subtotal: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    deliveryFee: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    paymentStatus: { type: String, default: "pending", enum: ["pending", "paid", "failed", "refunded"] },
    paymentId: { type: String, default: null },
    razorpayOrderId: { type: String, default: null },
    orderStatus: {
      type: String,
      default: "Order Received",
      enum: ["Order Received", "Approved", "In Kitchen", "Ready", "Sent to Delivery", "Delivered", "Cancelled"],
    },
    deliveryAddress: { type: deliveryAddressSchema, default: () => ({}) },
    statusHistory: {
      type: [{ status: String, timestamp: { type: Date, default: Date.now }, updatedBy: { type: String, default: "system" } }],
      default: [],
    },
    estimatedTime: { type: Date, default: null },
    statusUpdatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1 });

export const Order = model<IOrder>("Order", orderSchema);
