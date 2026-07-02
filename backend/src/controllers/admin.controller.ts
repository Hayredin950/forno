import type { Request, Response, NextFunction } from "express";
import { Order } from "../models/Order";
import { sendSuccess } from "../utils/apiResponse";
import { ApiError } from "../utils/apiError";
import { asyncHandler } from "../utils/asyncHandler";

const VALID_STATUSES = ["Order Received", "In Kitchen", "Sent to Delivery", "Delivered"] as const;
type OrderStatus = (typeof VALID_STATUSES)[number];

export const getAllOrders = asyncHandler(async (req: Request, res: Response) => {
  const { status, from, to, page = "1", limit = "20" } = req.query as Record<string, string>;

  const filter: Record<string, unknown> = {};
  if (status) filter["orderStatus"] = status;
  if (from || to) {
    filter["createdAt"] = {};
    if (from) (filter["createdAt"] as Record<string, unknown>)["$gte"] = new Date(from);
    if (to) (filter["createdAt"] as Record<string, unknown>)["$lte"] = new Date(to);
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

  const order = await Order.findByIdAndUpdate(
    id,
    { orderStatus, statusUpdatedAt: new Date() },
    { new: true },
  );
  if (!order) return next(new ApiError(404, "Order not found"));

  sendSuccess(res, { orderId: order._id, orderStatus: order.orderStatus, statusUpdatedAt: order.statusUpdatedAt });
});
