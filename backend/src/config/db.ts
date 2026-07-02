import mongoose from "mongoose";
import { logger } from "../lib/logger";

export const connectDB = async (): Promise<void> => {
  const uri = process.env["MONGO_URI"];
  if (!uri) {
    logger.warn("MONGO_URI not set - running in mock mode (no database connection)");
    return;
  }

  mongoose.connection.on("connected", () => logger.info("MongoDB connected"));
  mongoose.connection.on("error", (err) => logger.error({ err }, "MongoDB error"));
  mongoose.connection.on("disconnected", () => logger.warn("MongoDB disconnected"));

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  } catch (err) {
    logger.warn({ err }, "Failed to connect to MongoDB - running in mock mode");
  }
};
