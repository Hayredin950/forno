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
  // Optional marker shown in the admin timeline (e.g. "Reopened after
  // cancellation") so staff can tell a restore/reopen apart from a normal
  // transition.
  note?: string;
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
  // Snapshot of who the delivery driver needs to reach (customer name +
  // phone), captured when the order is placed so it survives profile edits.
  customerName: string;
  contactPhone: string;
  orderStatus: "Order Received" | "In Kitchen" | "Sent to Delivery" | "Delivered" | "Cancelled";
  // True once the order's committed stock has been returned to inventory
  // (set when a paid order is cancelled, cleared when it's reopened). Guards
  // the restore/re-commit so it can never happen twice for the same order.
  stockRestored: boolean;
  deliveryAddress: DeliveryAddress;
  statusHistory: IStatusEntry[];
  estimatedTime: Date;
  statusUpdatedAt: Date;
  // Real road route (OSRM) captured when the order is placed: distance,
  // driving duration and the polyline used to draw the tracking map. All
  // zero/null when coordinates or routing are unavailable.
  routeDistanceKm: number;
  routeDurationMin: number;
  routeGeometry: [number, number][] | null;
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
    // Clean 3-phase pipeline: Received → In Kitchen → Sent to Delivery →
    // Delivered (Cancelled can be entered before dispatch). "Approved" and
    // "Ready" were removed from the enum — they no longer exist.
    orderStatus: {
      type: String,
      default: "Order Received",
      enum: ["Order Received", "In Kitchen", "Sent to Delivery", "Delivered", "Cancelled"],
    },
    // See the interface note above — used to make stock restore idempotent.
    stockRestored: { type: Boolean, default: false },
    customerName: { type: String, default: "" },
    contactPhone: { type: String, default: "" },
    deliveryAddress: { type: deliveryAddressSchema, default: () => ({}) },
    statusHistory: {
      type: [{ status: String, timestamp: { type: Date, default: Date.now }, updatedBy: { type: String, default: "system" }, note: { type: String, default: null } }],
      default: [],
    },
    estimatedTime: { type: Date, default: null },
    routeDistanceKm: { type: Number, default: 0 },
    routeDurationMin: { type: Number, default: 0 },
    routeGeometry: { type: [[Number, Number]], default: null },
    statusUpdatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1 });

export const Order = model<IOrder>("Order", orderSchema);
