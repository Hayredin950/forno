import type { Request, Response, NextFunction } from "express";
import { Order } from "../models/Order";
import { sendSuccess } from "../utils/apiResponse";
import { ApiError } from "../utils/apiError";
import { asyncHandler } from "../utils/asyncHandler";

const VALID_STATUSES = ["Order Received", "In Kitchen", "Sent to Delivery", "Delivered", "Cancelled"] as const;
type OrderStatus = (typeof VALID_STATUSES)[number];

// Forward-only flow; Cancelled is a terminal state that can only be entered
// before the order is out for delivery.
const CAN_TRANSITION: Record<string, string[]> = {
  "Order Received": ["In Kitchen", "Cancelled"],
  "In Kitchen": ["Sent to Delivery", "Cancelled"],
  "Sent to Delivery": ["Delivered"],
  Delivered: [],
  Cancelled: [],
};

export const getAllOrders = asyncHandler(async (req: Request, res: Response) => {
  const { status, from, to, page = "1", limit = "20", search } = req.query as Record<string, string>;

  const filter: Record<string, unknown> = {};
  if (status && VALID_STATUSES.includes(status as OrderStatus)) filter["orderStatus"] = status;
  if (from || to) {
    filter["createdAt"] = {};
    if (from) (filter["createdAt"] as Record<string, unknown>)["$gte"] = new Date(from);
    if (to) (filter["createdAt"] as Record<string, unknown>)["$lte"] = new Date(to);
  }
  if (search) {
    const rx = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter["$or"] = [
      { _id: new RegExp(`^${rx}`, "i") },
      { "deliveryAddress.city": new RegExp(rx, "i") },
      { "deliveryAddress.street": new RegExp(rx, "i") },
    ];
  }

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(100, Math.max(1, Number(limit)));
  const skip = (pageNum - 1) * limitNum;

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate("user", "name email"),
    Order.countDocuments(filter),
  ]);

  sendSuccess(res, { orders, total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) });
});

export const updateOrderStatus = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params as { id: string };
  const { orderStatus } = req.body as { orderStatus: OrderStatus };

  if (!VALID_STATUSES.includes(orderStatus)) {
    return next(new ApiError(400, `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`));
  }

  const order = await Order.findById(id);
  if (!order) return next(new ApiError(404, "Order not found"));

  if (orderStatus !== order.orderStatus) {
    const allowed = CAN_TRANSITION[order.orderStatus] ?? [];
    if (!allowed.includes(orderStatus)) {
      return next(new ApiError(400, `Cannot move order from "${order.orderStatus}" to "${orderStatus}"`));
    }
  }

  order.orderStatus = orderStatus;
  order.statusUpdatedAt = new Date();
  if (orderStatus === "Delivered") order.estimatedTime = new Date();
  order.statusHistory.push({ status: orderStatus, timestamp: new Date(), updatedBy: "admin" });
  await order.save();

  sendSuccess(res, { orderId: order._id, orderStatus: order.orderStatus, statusUpdatedAt: order.statusUpdatedAt });
});
