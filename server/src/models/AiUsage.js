import mongoose from "mongoose";

const aiUsageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  provider: { type: String, required: true, index: true },
  model: { type: String, required: true },
  task: { type: String, required: true, index: true },
  inputTokens: { type: Number, default: null },
  outputTokens: { type: Number, default: null },
  latency: { type: Number, required: true },
  status: { type: String, enum: ["success", "error", "timeout", "fallback"], required: true, index: true },
  estimatedCost: { type: Number, default: null }
}, { timestamps: { createdAt: true, updatedAt: false }, collection: "aiUsage" });

aiUsageSchema.index({ userId: 1, createdAt: -1 });
aiUsageSchema.index({ provider: 1, createdAt: -1 });
aiUsageSchema.index({ task: 1, createdAt: -1 });
aiUsageSchema.index({ status: 1, createdAt: -1 });

export default mongoose.models.AiUsage || mongoose.model("AiUsage", aiUsageSchema);
