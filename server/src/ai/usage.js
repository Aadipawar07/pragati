import { AiUsage } from "../models/index.js";

export async function trackUsage(record) {
  if (!record.userId) return;
  try {
    await AiUsage.create(record);
  } catch (error) {
    console.error(`AI usage tracking failed: ${error.message}`);
  }
}
