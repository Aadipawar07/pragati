import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDatabase() {
  if (!env.mongoUri) {
    console.log("MongoDB connection skipped: MONGODB_URI is not configured.");
    return;
  }

  if (mongoose.connection.readyState === 1) return;

  mongoose.connection.on("error", () => {
    console.error("MongoDB connection error.");
  });
  await mongoose.connect(env.mongoUri, { dbName: env.mongoDbName });
  console.log("MongoDB connected successfully");
}

export async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
