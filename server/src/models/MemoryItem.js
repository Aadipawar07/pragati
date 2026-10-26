import mongoose from "mongoose";

const lastReviewSchema = new mongoose.Schema({
  requestId: { type: String, required: true },
  rating: { type: String, enum: ["again", "hard", "good", "easy"], required: true },
  scheduledReviewAt: { type: Date, required: true },
  nextReviewAt: { type: Date, required: true },
  reviewedAt: { type: Date, required: true },
  previousIntervalDays: { type: Number, required: true },
  nextIntervalDays: { type: Number, required: true },
  algorithmVersion: { type: String, required: true }
}, { _id: false });

const memoryItemSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  topicId: { type: mongoose.Schema.Types.ObjectId, ref: "Topic", default: null },
  sourceType: { type: String, enum: ["topic", "manual", "practice_question"], required: true },
  sourceId: { type: mongoose.Schema.Types.ObjectId, default: null },
  front: { type: String, required: true, trim: true, maxlength: 1200 },
  back: { type: String, required: true, trim: true, maxlength: 3000 },
  memoryType: { type: String, enum: ["concept", "definition", "formula", "process", "example", "question"], default: "concept" },
  status: { type: String, enum: ["active", "suspended", "archived"], default: "active" },
  repetitionCount: { type: Number, default: 0, min: 0 },
  intervalDays: { type: Number, default: 0, min: 0, max: 365 },
  easeFactor: { type: Number, default: 2.3, min: 1.3, max: 3 },
  nextReviewAt: { type: Date, required: true, default: Date.now },
  lastReviewedAt: { type: Date, default: null },
  lastRecallRating: { type: String, enum: ["again", "hard", "good", "easy"], default: null },
  schedulerRevision: { type: Number, default: 0, min: 0 },
  lastReviewRequest: { type: lastReviewSchema, default: null }
}, { timestamps: true, collection: "memoryItems" });

memoryItemSchema.index({ userId: 1, status: 1, nextReviewAt: 1 });
memoryItemSchema.index({ userId: 1, topicId: 1, status: 1 });
memoryItemSchema.index(
  { userId: 1, sourceId: 1 },
  { unique: true, partialFilterExpression: { sourceType: "practice_question" } }
);

export default mongoose.models.MemoryItem || mongoose.model("MemoryItem", memoryItemSchema);
