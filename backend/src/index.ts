import "dotenv/config";
import mongoose from "mongoose";
import app from "./app";
import { logger } from "./lib/logger";
import { connectDB } from "./config/db";
import { startCronJobs } from "./services/cron.service";

const rawPort = process.env["PORT"] ?? "5000";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Cron jobs need a live DB connection, which may arrive after boot when
// connectDB is retrying in the background — hook into mongoose's event.
let cronStarted = false;
const ensureCronStarted = (): void => {
  if (cronStarted) return;
  cronStarted = true;
  startCronJobs();
};
mongoose.connection.on("connected", ensureCronStarted);

const bootstrap = async (): Promise<void> => {
  await connectDB();
  if (mongoose.connection.readyState === 1) ensureCronStarted();

  app.listen(port, (err?: Error) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ port }, "Forno API server listening");
  });
};

bootstrap().catch((err: unknown) => {
  logger.error({ err }, "Failed to start server");
  process.exit(1);
});
