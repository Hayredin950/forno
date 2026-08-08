import type { Request, Response } from "express";
import { SiteConfig, getOrCreateSiteConfig } from "../models/SiteConfig";
import { Subscriber } from "../models/Subscriber";
import { Order } from "../models/Order";
import { Ingredient } from "../models/Ingredient";
import { sendSuccess } from "../utils/apiResponse";
import { ApiError } from "../utils/apiError";
import { asyncHandler } from "../utils/asyncHandler";

// ─── Public site config (social links, contact, delivery origin) ──────────

export const getPublicSiteConfig = asyncHandler(async (_req: Request, res: Response) => {
  const config = await getOrCreateSiteConfig();
  sendSuccess(res, {
    contactPhone: config.contactPhone,
    supportEmail: config.supportEmail,
    social: config.social,
    deliveryOrigin: config.deliveryOrigin,
    pricing: config.pricing,
  });
});

// ─── Real, database-driven homepage stats ─────────────────────────────────

export const getStats = asyncHandler(async (_req: Request, res: Response) => {
  // Pizzas Baked = total quantity of every item across PAID orders.
  const bakedAgg = await Order.aggregate([
    { $match: { paymentStatus: "paid" } },
    { $unwind: "$items" },
    { $group: { _id: null, total: { $sum: "$items.quantity" } } },
  ]);
  const pizzasBaked = bakedAgg[0]?.total ?? 0;

  // Average delivery minutes = mean time an order spent on the actual last leg
  // (from when it entered "Sent to Delivery" until it was marked "Delivered"),
  // taken from statusHistory. This reflects real delivery time and ignores how
  // long an order idled in earlier stages (kitchen) — otherwise old/stale test
  // orders that sat in the pipeline for a day would inflate the stat.
  const delivered = await Order.find({
    paymentStatus: "paid",
    orderStatus: "Delivered",
  }).select("createdAt statusUpdatedAt statusHistory");
  let avgDeliveryMinutes = 0;
  if (delivered.length > 0) {
    const totalMin = delivered.reduce((sum, o) => {
      const history = (o.statusHistory ?? []) as {
        status: string;
        timestamp?: Date;
      }[];
      const sent = history.find((h) => h.status === "Sent to Delivery");
      const done = history.find((h) => h.status === "Delivered");
      const start = sent?.timestamp ? sent.timestamp.getTime() : 0;
      const end = done?.timestamp ? done.timestamp.getTime() : 0;
      if (start > 0 && end > start) return sum + (end - start) / 60000;
      // Fallback for orders placed before statusHistory was populated:
      // use the order's whole lifetime (placement → delivery).
      const t = o.statusUpdatedAt ? o.statusUpdatedAt.getTime() : 0;
      const c = o.createdAt ? o.createdAt.getTime() : 0;
      return sum + (t > c ? (t - c) / 60000 : 0);
    }, 0);
    avgDeliveryMinutes = Math.round((totalMin / delivered.length) * 10) / 10;
  }

  // Ingredient choices = number of currently available ingredients.
  const ingredientChoices = await Ingredient.countDocuments({ isAvailable: true });

  // Happy customers = distinct users who placed at least one paid order.
  const customers = await Order.distinct("user", { paymentStatus: "paid" });

  sendSuccess(res, {
    pizzasBaked,
    avgDeliveryMinutes,
    ingredientChoices,
    happyCustomers: customers.length,
  });
});

// ─── Newsletter ────────────────────────────────────────────────────────────

export const subscribeNewsletter = asyncHandler(async (req: Request, res: Response) => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError(400, "A valid email address is required");
  }

  await Subscriber.updateOne(
    { email },
    { $setOnInsert: { email } },
    { upsert: true },
  );

  sendSuccess(res, { email }, "Thanks for subscribing! You're on the list.");
});

// ─── Admin settings (protected; mounted under /admin) ─────────────────────

export const getAdminSettings = asyncHandler(async (_req: Request, res: Response) => {
  const config = await getOrCreateSiteConfig();
  sendSuccess(res, config);
});

export const updateAdminSettings = asyncHandler(async (req: Request, res: Response) => {
  const config = await getOrCreateSiteConfig();

  const { contactPhone, supportEmail, social, deliveryOrigin, pricing } = req.body;

  if (contactPhone !== undefined) config.contactPhone = String(contactPhone);
  if (supportEmail !== undefined) config.supportEmail = String(supportEmail);
  if (social && typeof social === "object") {
    config.social = {
      instagram: String(social.instagram ?? config.social?.instagram ?? ""),
      twitter: String(social.twitter ?? config.social?.twitter ?? ""),
      facebook: String(social.facebook ?? config.social?.facebook ?? ""),
    };
  }
  if (deliveryOrigin && typeof deliveryOrigin === "object") {
    config.deliveryOrigin = {
      label: String(deliveryOrigin.label ?? config.deliveryOrigin?.label ?? "Forno Kitchen"),
      address: String(deliveryOrigin.address ?? config.deliveryOrigin?.address ?? ""),
      lat: Number(deliveryOrigin.lat ?? config.deliveryOrigin?.lat ?? 0),
      lng: Number(deliveryOrigin.lng ?? config.deliveryOrigin?.lng ?? 0),
    };
  }
  if (pricing && typeof pricing === "object") {
    config.pricing = {
      customBasePrice: Number(pricing.customBasePrice ?? config.pricing?.customBasePrice ?? 200),
      taxRate: Number(pricing.taxRate ?? config.pricing?.taxRate ?? 0.05),
      deliveryFee: Number(pricing.deliveryFee ?? config.pricing?.deliveryFee ?? 40),
      freeDeliveryThreshold: Number(pricing.freeDeliveryThreshold ?? config.pricing?.freeDeliveryThreshold ?? 500),
    };
  }

  await config.save();
  sendSuccess(res, config, "Settings saved successfully");
});

// ─── Admin: newsletter subscribers ────────────────────────────────────────

export const listSubscribers = asyncHandler(async (_req: Request, res: Response) => {
  const subscribers = await Subscriber.find().sort({ createdAt: -1 }).select("email createdAt");
  sendSuccess(res, subscribers);
});
