import "dotenv/config";
import app from "./app";
import { logger } from "./lib/logger";
import { connectDB } from "./config/db";
import { startCronJobs } from "./services/cron.service";

const rawPort = process.env["PORT"] ?? "5000";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const bootstrap = async (): Promise<void> => {
  try {
    await connectDB();
  } catch (err) {
    logger.warn({ err }, "Database connection failed - continuing without database");
  }
  startCronJobs();

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
