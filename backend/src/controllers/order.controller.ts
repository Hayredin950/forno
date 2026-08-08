import type { Request, Response, NextFunction } from "express";
import { Order, type IOrderItem } from "../models/Order";
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
import { roundMoney } from "../utils/pricing";
import { getPricingConfig, calcTax, calcDeliveryFee } from "../services/pricing.service";
import { getOrCreateSiteConfig } from "../models/SiteConfig";
import type { AuthUserRequest } from "../middleware/authUser";
import type { DeliveryAddress } from "../models/Order";

const normalizeAddress = (raw: unknown): DeliveryAddress => {
  const a = (raw ?? {}) as Record<string, unknown>;
  const num = (v: unknown): number | undefined => {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  return {
    street: String(a.street ?? "").trim(),
    city: String(a.city ?? "").trim(),
    state: String(a.state ?? "").trim(),
    pincode: String(a.pincode ?? "").trim(),
    lat: num(a.lat),
    lng: num(a.lng),
  };
};

/** Great-circle distance in km between two coordinates. */
const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

/**
 * Realistic ETA based on the distance between the kitchen (admin-configured
 * delivery origin) and the customer's chosen location: ~20 min prep time plus
 * travel at ~25 km/h average city delivery speed. Falls back to 30 minutes
 * whenever coordinates aren't available on either side.
 */
const estimateDeliveryDate = async (dest: DeliveryAddress | undefined): Promise<Date> => {
  const fallback = new Date(Date.now() + 30 * 60000);
  const origin = (await getOrCreateSiteConfig()).deliveryOrigin;
  if (!dest?.lat || !dest?.lng || !origin?.lat || !origin?.lng) return fallback;
  const km = haversineKm(origin.lat, origin.lng, dest.lat, dest.lng);
  if (!Number.isFinite(km)) return fallback;
  const minutes = Math.round(20 + (km / 25) * 60);
  return new Date(Date.now() + Math.max(20, minutes) * 60000);
};

/** Resolve and price one order item server-side (never trust client prices). */
const resolveItem = async (item: IOrderItem): Promise<{ resolved: IOrderItem; name: string }> => {
  if (item.type === "preset") {
    if (!item.pizzaRef) throw new ApiError(400, "pizzaRef required for preset pizza");
    const pizza = await Pizza.findOne({ _id: item.pizzaRef, isCustom: false });
    if (!pizza) throw new ApiError(404, `Pizza ${String(item.pizzaRef)} not found`);
    if (!pizza.isAvailable) throw new ApiError(409, `${pizza.name} is currently unavailable`);
    const price = roundMoney(pizza.basePrice * item.quantity);
    return {
      resolved: { type: "preset", pizzaRef: item.pizzaRef, quantity: item.quantity, price, name: pizza.name },
      name: pizza.name,
    };
  }

  if (item.type === "custom") {
    const build = item.customBuild;
    if (!build) throw new ApiError(400, "customBuild required for custom pizza");
    const ids = [build.base, build.sauce, build.cheese, ...(build.vegetables ?? [])].filter(Boolean);
    if (ids.length === 0) throw new ApiError(400, "Custom pizza must include a base, sauce, and cheese");
    const ingredients = await Ingredient.find({ _id: { $in: ids } });
    const found = new Set(ingredients.map((i) => String(i._id)));
    const missing = ids.filter((id) => !found.has(id));
    if (missing.length > 0) throw new ApiError(400, `Unknown ingredient(s): ${missing.join(", ")}`);

    let buildPrice = (await getPricingConfig()).customBasePrice;
    const names: string[] = [];
    for (const ing of ingredients) {
      if (!ing.isAvailable) throw new ApiError(409, `${ing.name} is out of stock`);
      buildPrice += ing.price;
      names.push(ing.name);
    }
    const price = roundMoney(buildPrice * item.quantity);
    return {
      resolved: {
        type: "custom",
        customBuild: build,
        quantity: item.quantity,
        price,
        name: `Custom ${names[0] ?? "Pizza"}`,
      },
      name: `Custom ${names[0] ?? "Pizza"}`,
    };
  }

  throw new ApiError(400, `Invalid item type: ${String(item.type)}`);
};

export const createOrder = asyncHandler(async (req: AuthUserRequest, res: Response, next: NextFunction) => {
  const userId = req.userId!;
  const { items, deliveryAddress } = req.body as {
    items: IOrderItem[];
    deliveryAddress?: DeliveryAddress;
  };

  if (!Array.isArray(items) || items.length === 0) {
    return next(new ApiError(400, "Order must contain at least one item"));
  }
  if (items.length > 20) return next(new ApiError(400, "Too many items in one order"));

  const resolvedItems: IOrderItem[] = [];
  let subtotal = 0;
  for (const item of items) {
    const qty = Number(item.quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > 99) {
      return next(new ApiError(422, "Each item quantity must be a whole number between 1 and 99"));
    }
    const { resolved } = await resolveItem(item);
    resolvedItems.push(resolved);
    subtotal = roundMoney(subtotal + resolved.price);
  }

  const pricing = await getPricingConfig();
  const tax = calcTax(subtotal, pricing.taxRate);
  const deliveryFee = calcDeliveryFee(subtotal, pricing.deliveryFee, pricing.freeDeliveryThreshold);
  const totalAmount = roundMoney(subtotal + tax + deliveryFee);

  const stockCheck = await checkStockAvailability(resolvedItems);
  if (!stockCheck.available) {
    return next(new ApiError(409, stockCheck.shortfall ?? "Insufficient stock"));
  }

  const addr = normalizeAddress(deliveryAddress);
  const order = await Order.create({
    user: userId,
    items: resolvedItems,
    subtotal,
    tax,
    deliveryFee,
    totalAmount,
    deliveryAddress: addr,
    orderStatus: "Order Received",
    statusHistory: [{ status: "Order Received", timestamp: new Date(), updatedBy: "system" }],
    estimatedTime: await estimateDeliveryDate(addr),
  });

  sendSuccess(res, order, "Order created", 201);
});

export const initiatePayment = asyncHandler(async (req: AuthUserRequest, res: Response, next: NextFunction) => {
  const { id } = req.params as { id: string };
  const order = await Order.findOne({ _id: id, user: req.userId });
  if (!order) return next(new ApiError(404, "Order not found"));
  if (order.paymentStatus === "paid") return next(new ApiError(409, "Order already paid"));

  const amountInPaise = Math.round(order.totalAmount * 100);
  const configured = isRazorpayConfigured();

  // Reuse an existing Razorpay order if one was already created for this
  // order — re-creating on every retry orphans the previous payment intent.
  const rzpOrder =
    order.razorpayOrderId && !isMockRazorpayOrderId(order.razorpayOrderId)
      ? { id: order.razorpayOrderId, amount: amountInPaise, currency: "INR" }
      : configured
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

  // Atomically claim the order so two concurrent verifies can't both pass
  // the "not paid yet" check and double-decrement stock.
  const order = await Order.findOneAndUpdate(
    { _id: id, user: req.userId, paymentStatus: { $ne: "paid" } },
    { $set: { paymentStatus: "paid", paymentId: razorpayPaymentId } },
    { new: true },
  );
  if (!order) return next(new ApiError(409, "Order already paid or not found"));

  // The signature only proves the payload was signed by our shop secret —
  // the order id inside must match THIS order, or an attacker could replay
  // a cheap order's signature against an expensive one.
  if (razorpayOrderId !== order.razorpayOrderId) {
    order.paymentStatus = "failed";
    await order.save();
    return next(new ApiError(400, "Payment verification failed: order id mismatch"));
  }

  const valid = isMockRazorpayOrderId(order.razorpayOrderId)
    ? !!razorpayPaymentId
    : verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
  if (!valid) {
    order.paymentStatus = "failed";
    await order.save();
    return next(new ApiError(400, "Payment verification failed"));
  }

  try {
    await decrementStockForOrder(order.items, String(order._id));
    order.orderStatus = "Order Received";
    order.statusUpdatedAt = new Date();
    order.estimatedTime = await estimateDeliveryDate(order.deliveryAddress);
    await order.save();

    // Keep per-pizza popularity counters in sync with real sales.
    for (const item of order.items) {
      if (item.type === "preset" && item.pizzaRef) {
        await Pizza.findByIdAndUpdate(item.pizzaRef, { $inc: { orderCount: item.quantity } });
      }
    }
  } catch (err) {
    // If stock deduction fails, refund the order so the user isn't charged
    // for a pizza we can't make.
    order.paymentStatus = "refunded";
    order.orderStatus = "Cancelled";
    order.statusUpdatedAt = new Date();
    await order.save();
    throw err;
  }

  sendSuccess(res, { orderId: order._id, orderStatus: order.orderStatus }, "Payment verified. Order placed!");
});

export const cancelOrder = asyncHandler(async (req: AuthUserRequest, res: Response, next: NextFunction) => {
  const { id } = req.params as { id: string };
  const order = await Order.findOne({ _id: id, user: req.userId });
  if (!order) return next(new ApiError(404, "Order not found"));
  if (order.paymentStatus === "paid") {
    return next(new ApiError(409, "Paid orders can't be cancelled here — contact support"));
  }
  if (order.orderStatus === "Cancelled" || order.orderStatus === "Delivered") {
    return next(new ApiError(409, `Order is already ${order.orderStatus.toLowerCase()}`));
  }

  order.orderStatus = "Cancelled";
  order.statusUpdatedAt = new Date();
  order.statusHistory.push({ status: "Cancelled", timestamp: new Date(), updatedBy: "customer" });
  await order.save();
  sendSuccess(res, { orderId: order._id, orderStatus: order.orderStatus }, "Order cancelled");
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
  const order = await Order.findById(id).select("orderStatus statusUpdatedAt paymentStatus estimatedTime");
  if (!order) return next(new ApiError(404, "Order not found"));
  sendSuccess(res, {
    orderStatus: order.orderStatus,
    statusUpdatedAt: order.statusUpdatedAt,
    paymentStatus: order.paymentStatus,
    estimatedTime: order.estimatedTime,
  });
});
