import type { Request, Response, NextFunction } from "express";
import { Order } from "../models/Order";
import { checkStockAvailability, decrementStockForOrder, restoreStockForOrder } from "../services/stock.service";
import { sendSuccess } from "../utils/apiResponse";
import { ApiError } from "../utils/apiError";
import { asyncHandler } from "../utils/asyncHandler";

const VALID_STATUSES = ["Order Received", "In Kitchen", "Sent to Delivery", "Delivered", "Cancelled"] as const;
type OrderStatus = (typeof VALID_STATUSES)[number];

// Forward-only flow; Cancelled is a terminal state that can only be entered
// before dispatch. "Approved" / "Ready" are legacy statuses that may still
// exist on older orders — they are mapped forward so those orders can be
// brought back into the clean pipeline, but they're no longer selectable.
const CAN_TRANSITION: Record<string, string[]> = {
  "Order Received": ["In Kitchen", "Cancelled"],
  "In Kitchen": ["Sent to Delivery", "Cancelled"],
  "Sent to Delivery": ["Delivered"],
  Delivered: [],
  // Cancelled isn't terminal: an admin may have hit it by accident, so allow
  // reopening the order back to the start of the pipeline.
  Cancelled: ["Order Received"],
  // Legacy (pre-3-phase-rollback) cleanup paths:
  Approved: ["In Kitchen", "Cancelled"],
  Ready: ["Sent to Delivery"],
};

export const getAllOrders = asyncHandler(async (req: Request, res: Response) => {
  const { status, from, to, page = "1", limit = "20", search, sort = "newest" } = req.query as Record<string, string>;

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

const sortMap: Record<string, Record<string, 1 | -1>> = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    total_desc: { totalAmount: -1 },
    total_asc: { totalAmount: 1 },
  };

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort(sortMap[sort] ?? { createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate("user", "name email phone"),
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

    // Cancelling a PAID order: it already consumed stock at payment time, so
    // hand that stock back to inventory (once — guarded by stockRestored).
    if (orderStatus === "Cancelled" && order.paymentStatus === "paid" && !order.stockRestored) {
      await restoreStockForOrder(order.items);
      order.stockRestored = true;
    }

    // Reopening a cancelled order: stock was already committed (or held) for it,
    // so don't let an unfulfillable order back into the kitchen.
    if (orderStatus === "Order Received" && order.orderStatus === "Cancelled") {
      const stockCheck = await checkStockAvailability(order.items);
      if (!stockCheck.available) {
        return next(new ApiError(409, `Cannot reopen: ${stockCheck.shortfall ?? "insufficient stock"}`));
      }
      // If this order's stock was returned on cancellation, commit it again.
      // (Legacy cancelled orders that predate restore keep stock held — the
      // flag stays false and nothing is double-committed.)
      if (order.stockRestored) {
        await decrementStockForOrder(order.items, String(order._id));
        order.stockRestored = false;
      }
    }
  }

  const prevStatus = order.orderStatus;
  order.orderStatus = orderStatus;
  order.statusUpdatedAt = new Date();
  if (orderStatus === "Delivered") order.estimatedTime = new Date();
  // Mark reopen transitions in the timeline so staff can see the order was
  // brought back after a cancellation (drives the admin UI marker).
  const reopened = orderStatus === "Order Received" && prevStatus === "Cancelled";
  order.statusHistory.push({
    status: orderStatus,
    timestamp: new Date(),
    updatedBy: "admin",
    ...(reopened ? { note: "Reopened after cancellation" } : {}),
  });
  await order.save();

  sendSuccess(res, { orderId: order._id, orderStatus: order.orderStatus, statusUpdatedAt: order.statusUpdatedAt });
});
