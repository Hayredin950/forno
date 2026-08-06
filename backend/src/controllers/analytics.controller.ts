import type { Request, Response } from "express";
import { Order } from "../models/Order";
import { Pizza } from "../models/Pizza";
import { sendSuccess } from "../utils/apiResponse";
import { asyncHandler } from "../utils/asyncHandler";

const DAY_MS = 24 * 60 * 60 * 1000;

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Returns ISO date (YYYY-MM-DD) for the given offset in days (0 = today). */
const dateKey = (offsetDays = 0): string =>
  new Date(Date.now() - offsetDays * DAY_MS).toISOString().slice(0, 10);

/** Builds { labels: [...], data: [...] } for the last N days, zero-filled. */
const emptySeries = (days: number): { labels: string[]; data: number[] } => {
  const labels: string[] = [];
  const data: number[] = [];
  for (let i = days - 1; i >= 0; i--) {
    labels.push(dateKey(i).slice(5)); // MM-DD
    data.push(0);
  }
  return { labels, data };
};

// ─── Endpoints ─────────────────────────────────────────────────────────────

/** Safely parse and clamp the `days` query param (default 7). */
const parseDays = (raw: unknown): number => {
  const n = Number(raw);
  return Number.isFinite(n) ? Math.min(90, Math.max(1, Math.trunc(n))) : 7;
};

/** Orders per day for the last N days. */
export const getOrdersSeries = asyncHandler(async (req: Request, res: Response) => {
  const days = parseDays(req.query.days);
  const since = new Date(Date.now() - (days - 1) * DAY_MS);
  since.setHours(0, 0, 0, 0);

  const series = emptySeries(days);
  const rows = await Order.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 },
      },
    },
  ]);
  for (const r of rows) {
    const idx = series.labels.findIndex((l) => l === r._id.slice(5));
    if (idx !== -1) series.data[idx] = r.count;
  }
  sendSuccess(res, series);
});

/** Revenue (paid orders only) per day for the last N days. */
export const getRevenueSeries = asyncHandler(async (req: Request, res: Response) => {
  const days = parseDays(req.query.days);
  const since = new Date(Date.now() - (days - 1) * DAY_MS);
  since.setHours(0, 0, 0, 0);

  const series = emptySeries(days);
  const rows = await Order.aggregate([
    { $match: { createdAt: { $gte: since }, paymentStatus: "paid" } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        revenue: { $sum: "$totalAmount" },
      },
    },
  ]);
  for (const r of rows) {
    const idx = series.labels.findIndex((l) => l === r._id.slice(5));
    if (idx !== -1) series.data[idx] = Math.round(r.revenue);
  }
  sendSuccess(res, series);
});

/** Total revenue today (paid orders). */
export const getTodayRevenue = asyncHandler(async (_req: Request, res: Response) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const rows = await Order.aggregate([
    { $match: { createdAt: { $gte: start }, paymentStatus: "paid" } },
    { $group: { _id: null, revenue: { $sum: "$totalAmount" } } },
  ]);
  sendSuccess(res, { revenue: Math.round(rows[0]?.revenue ?? 0) });
});

/** Most-ordered pizzas — derived from real order data. */
export const getPopularPizzas = asyncHandler(async (_req: Request, res: Response) => {
  const rows = await Order.aggregate([
    { $match: { paymentStatus: "paid" } },
    { $unwind: "$items" },
    { $match: { "items.type": "preset" } },
    {
      $group: {
        _id: "$items.pizzaRef",
        count: { $sum: "$items.quantity" },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);

  const ids = rows.filter((r) => r._id).map((r) => r._id);
  const pizzas = ids.length
    ? await Pizza.find({ _id: { $in: ids } }).select("name image")
    : [];

  const nameById = new Map(pizzas.map((p) => [String(p._id), p.name]));
  const data = rows
    .filter((r) => r._id && nameById.has(String(r._id)))
    .map((r) => ({ name: nameById.get(String(r._id)), count: r.count }));

  // Fall back to orderCount-based ranking for pizzas ordered but not yet in
  // any paid order (e.g. fresh installs) — still database-driven, never hardcoded.
  if (data.length < 5) {
    const byCount = await Pizza.find({ isAvailable: true })
      .sort({ orderCount: -1 })
      .limit(10)
      .select("name image orderCount");
    for (const p of byCount) {
      if (!data.some((d) => d.name === p.name)) {
        data.push({ name: p.name, count: p.orderCount });
      }
      if (data.length >= 8) break;
    }
  }

  sendSuccess(res, data.slice(0, 8));
});

/** Order status distribution (count per status). */
export const getStatusDistribution = asyncHandler(async (_req: Request, res: Response) => {
  const rows = await Order.aggregate([
    { $group: { _id: "$orderStatus", value: { $sum: 1 } } },
  ]);
  const data = rows.map((r) => ({ name: r._id, value: r.value }));
  sendSuccess(res, data);
});

/** Orders grouped by hour of day (last 7 days). */
export const getHourlyOrders = asyncHandler(async (_req: Request, res: Response) => {
  const since = new Date(Date.now() - 7 * DAY_MS);
  const rows = await Order.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: { $hour: "$createdAt" },
        count: { $sum: 1 },
      },
    },
  ]);

  const hourMap = new Map(rows.map((r) => [r._id, r.count]));
  const labels: string[] = [];
  const data: number[] = [];
  for (let h = 10; h <= 23; h++) {
    labels.push(`${h}:00`);
    data.push(hourMap.get(h) ?? 0);
  }
  sendSuccess(res, { labels, data });
});
