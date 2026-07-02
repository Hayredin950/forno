import cron from "node-cron";
import { logger } from "../lib/logger";

export const startCronJobs = (): void => {
  // Cron jobs disabled in mock mode (no database connection)
  logger.info("Cron jobs disabled in mock mode");
};
