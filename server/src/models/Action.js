import mongoose from "mongoose";

const actionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  type: { type: String, enum: ["revision", "study", "practice", "exam", "career", "project", "memory", "resource"] },
  candidateKey: { type: String, trim: true, maxlength: 200, default: null },
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  reason: { type: String, trim: true },
  priority: { type: String, enum: ["high", "medium", "low"], default: "medium" },
  estimatedMinutes: { type: Number, min: 1 },
  status: { type: String, enum: ["pending", "in_progress", "completed", "snoozed", "dismissed"], default: "pending", index: true },
  route: { type: String, trim: true },
  context: { type: mongoose.Schema.Types.Mixed },
  scheduledFor: { type: Date, index: true },
  completedAt: Date,
  snoozedUntil: Date
}, { timestamps: true, collection: "actions" });

actionSchema.index(
  { userId: 1, candidateKey: 1 },
  { unique: true, partialFilterExpression: { candidateKey: { $type: "string" } } }
);

export default mongoose.models.Action || mongoose.model("Action", actionSchema);
