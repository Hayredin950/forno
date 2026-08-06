import cron from "node-cron";
import mongoose from "mongoose";
import { Ingredient } from "../models/Ingredient";
import { Admin } from "../models/Admin";
import { sendLowStockAlertEmail } from "./email.service";
import { logger } from "../lib/logger";

// Runs every 30 minutes. Checks every ingredient whose current stock has
// fallen below its configured lowStockThreshold and emails the admin(s).
// Uses lastAlertLevel so an item only re-alerts once its stock drops to a
// brand-new low (prevents email spam while still notifying on each decline).
const LOW_STOCK_CRON = "*/30 * * * *";

export const startCronJobs = (): void => {
  if (mongoose.connection.readyState !== 1) {
    logger.warn("MongoDB not connected - cron jobs will not start");
    return;
  }

  const job = cron.schedule(LOW_STOCK_CRON, async () => {
    try {
      // All ingredients currently below their threshold (field-to-field compare)
      const allLow = await Ingredient.find({
        $expr: { $lt: ["$currentStock", "$lowStockThreshold"] },
      });

      // Only those that never alerted, or whose stock sank below the level
      // recorded when we last emailed about them. lastAlertLevel === null
      // means "never alerted" — a 0 is a REAL alert level, not "no alert".
      const pending = allLow.filter(
        (i) => i.lastAlertLevel === null || i.currentStock < i.lastAlertLevel,
      );

      if (pending.length === 0) return;

      const admins = await Admin.find().select("email");
      if (admins.length === 0) {
        logger.warn("No admin emails configured - skipping low stock email");
        return;
      }

      const payload = pending.map((i) => ({
        name: i.name,
        currentStock: i.currentStock,
        unit: i.unit,
        lowStockThreshold: i.lowStockThreshold,
      }));

      for (const admin of admins) {
        try {
          await sendLowStockAlertEmail(admin.email, payload);
        } catch (err) {
          logger.error({ err, admin: admin.email }, "Failed to send low stock alert email");
        }
      }

      await Promise.all(
        pending.map((i) =>
          Ingredient.updateOne(
            { _id: i._id },
            { lastAlertSentAt: new Date(), lastAlertLevel: i.currentStock },
          ),
        ),
      );

      logger.info({ count: pending.length }, "Low stock alert emails sent");
    } catch (err) {
      logger.error({ err }, "Low stock cron job failed");
    }
  });

  logger.info({ schedule: LOW_STOCK_CRON }, "Low stock alert cron job started");
  job.start();
};
