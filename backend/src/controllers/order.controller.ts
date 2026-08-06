import type { Request, Response, NextFunction } from "express";
import { Order } from "../models/Order";
import { Pizza } from "../models/Pizza";
import { Ingredient } from "../models/Ingredient";
import {
  createRazorpayOrder,
  createMockRazorpayOrder,
  isMockRazorpayOrderId,
  isRazorpayConfigured,
  verifyRazorpaySignature,
} from "../services/payment.service";
import { checkStockAvailability, decrementStockForOrder } from "../services/stock.service";
import { sendSuccess } from "../utils/apiResponse";
import { ApiError } from "../utils/apiError";
import { asyncHandler } from "../utils/asyncHandler";
import type { AuthUserRequest } from "../middleware/authUser";
import type { IOrderItem } from "../models/Order";

export const createOrder = asyncHandler(async (req: AuthUserRequest, res: Response, next: NextFunction) => {
  const userId = req.userId!;
  const { items } = req.body as { items: IOrderItem[] };

  if (!items?.length) return next(new ApiError(400, "Order must contain at least one item"));

  let totalAmount = 0;
  const resolvedItems: IOrderItem[] = [];

  for (const item of items) {
    if (item.type === "preset") {
      if (!item.pizzaRef) return next(new ApiError(400, "pizzaRef required for preset pizza"));
      const pizza = await Pizza.findById(item.pizzaRef);
      if (!pizza) return next(new ApiError(404, `Pizza ${String(item.pizzaRef)} not found`));
      const price = pizza.basePrice * item.quantity;
      totalAmount += price;
      resolvedItems.push({ type: "preset", pizzaRef: item.pizzaRef, quantity: item.quantity, price });
    } else if (item.type === "custom") {
      if (!item.customBuild) return next(new ApiError(400, "customBuild required for custom pizza"));
      const { base, sauce, cheese, vegetables } = item.customBuild;
      const ids = [base, sauce, cheese, ...(vegetables ?? [])];
      const ingredients = await Ingredient.find({ _id: { $in: ids } });

      let customPrice = 0;
      for (const ing of ingredients) {
        if (ing.type === "vegetable") customPrice += ing.price;
      }
      const baseIng = ingredients.find((i) => i.type === "base");
      const baseCost = baseIng ? 150 : 150;
      customPrice += baseCost;
      const total = customPrice * item.quantity;
      totalAmount += total;
      resolvedItems.push({ type: "custom", customBuild: item.customBuild, quantity: item.quantity, price: total });
    } else {
      return next(new ApiError(400, `Invalid item type: ${item.type as string}`));
    }
  }

  const stockCheck = await checkStockAvailability(resolvedItems);
  if (!stockCheck.available) return next(new ApiError(409, stockCheck.shortfall ?? "Insufficient stock"));

  const order = await Order.create({ user: userId, items: resolvedItems, totalAmount });
  sendSuccess(res, order, "Order created", 201);
});

export const initiatePayment = asyncHandler(async (req: AuthUserRequest, res: Response, next: NextFunction) => {
  const { id } = req.params as { id: string };
  const order = await Order.findOne({ _id: id, user: req.userId });
  if (!order) return next(new ApiError(404, "Order not found"));
  if (order.paymentStatus === "paid") return next(new ApiError(409, "Order already paid"));

  const amountInPaise = Math.round(order.totalAmount * 100);
  const configured = isRazorpayConfigured();
  const rzpOrder = configured
    ? await createRazorpayOrder(amountInPaise, String(order._id))
    : createMockRazorpayOrder(amountInPaise);

  order.razorpayOrderId = rzpOrder.id;
  await order.save();

  const keyId = process.env["RAZORPAY_KEY_ID"];
  sendSuccess(res, {
    razorpayOrderId: rzpOrder.id,
    amount: rzpOrder.amount,
    currency: rzpOrder.currency,
    keyId,
    mock: !configured,
  });
});

export const verifyPayment = asyncHandler(async (req: AuthUserRequest, res: Response, next: NextFunction) => {
  const { id } = req.params as { id: string };
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body as {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  };

  const order = await Order.findOne({ _id: id, user: req.userId });
  if (!order) return next(new ApiError(404, "Order not found"));
  if (order.paymentStatus === "paid") return next(new ApiError(409, "Order already paid"));

  // Orders paid through the simulated (no real Razorpay credentials) flow
  // never had a genuine HMAC signature to check — trust the mock handshake
  // instead of calling verifyRazorpaySignature, which would always fail it.
  const valid = isMockRazorpayOrderId(order.razorpayOrderId)
    ? razorpayOrderId === order.razorpayOrderId && !!razorpayPaymentId
    : verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
  if (!valid) {
    order.paymentStatus = "failed";
    await order.save();
    return next(new ApiError(400, "Payment verification failed"));
  }

  order.paymentStatus = "paid";
  order.paymentId = razorpayPaymentId;
  order.orderStatus = "Order Received";
  order.statusUpdatedAt = new Date();
  await order.save();

  await decrementStockForOrder(order.items, String(order._id));

  sendSuccess(res, { orderId: order._id, orderStatus: order.orderStatus }, "Payment verified. Order placed!");
});

export const myOrders = asyncHandler(async (req: AuthUserRequest, res: Response) => {
  const orders = await Order.find({ user: req.userId })
    .sort({ createdAt: -1 })
    .populate("items.pizzaRef", "name image basePrice");
  sendSuccess(res, orders);
});

export const getOrderById = asyncHandler(async (req: AuthUserRequest, res: Response, next: NextFunction) => {
  const { id } = req.params as { id: string };
  const order = await Order.findOne({ _id: id, user: req.userId }).populate(
    "items.pizzaRef",
    "name image basePrice",
  );
  if (!order) return next(new ApiError(404, "Order not found"));
  sendSuccess(res, order);
});

export const orderStatus = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params as { id: string };
  const order = await Order.findById(id).select("orderStatus statusUpdatedAt paymentStatus");
  if (!order) return next(new ApiError(404, "Order not found"));
  sendSuccess(res, { orderStatus: order.orderStatus, statusUpdatedAt: order.statusUpdatedAt, paymentStatus: order.paymentStatus });
});
