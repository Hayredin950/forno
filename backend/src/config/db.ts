import mongoose from "mongoose";
import { logger } from "../lib/logger";

const RETRY_DELAY_MS = 30_000;

export const connectDB = async (): Promise<void> => {
  const uri = process.env["MONGO_URI"];
  if (!uri) {
    logger.warn("MONGO_URI not set - running in mock mode (no database connection)");
    return;
  }

  mongoose.connection.on("connected", () => logger.info("MongoDB connected"));
  mongoose.connection.on("error", (err) => logger.error({ err }, "MongoDB error"));
  mongoose.connection.on("disconnected", () => logger.warn("MongoDB disconnected"));

  // Try to connect now. If it fails (e.g. transient network error, Atlas IP
  // whitelist not yet updated, DB still provisioning), keep retrying in the
  // background so the server self-heals without needing a manual redeploy.
  const connect = async (): Promise<boolean> => {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
      return true;
    } catch (err) {
      logger.warn({ err }, "Failed to connect to MongoDB - retrying");
      return false;
    }
  };

  if (await connect()) return;

  const timer = setInterval(async () => {
    const ok = await connect();
    if (ok) clearInterval(timer);
  }, RETRY_DELAY_MS);
  timer.unref?.();
};
