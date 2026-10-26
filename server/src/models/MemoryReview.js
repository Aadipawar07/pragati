import mongoose from "mongoose";

const memoryReviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  memoryItemId: { type: mongoose.Schema.Types.ObjectId, ref: "MemoryItem", required: true },
  topicId: { type: mongoose.Schema.Types.ObjectId, ref: "Topic", default: null },
  requestId: { type: String, required: true, maxlength: 128 },
  rating: { type: String, enum: ["again", "hard", "good", "easy"], required: true },
  wasCorrect: { type: Boolean, default: null },
  scheduledReviewAt: { type: Date, required: true },
  nextReviewAt: { type: Date, required: true },
  reviewedAt: { type: Date, required: true },
  previousIntervalDays: { type: Number, required: true },
  nextIntervalDays: { type: Number, required: true },
  algorithmVersion: { type: String, required: true }
}, { timestamps: { createdAt: true, updatedAt: false }, collection: "memoryReviews" });

memoryReviewSchema.index({ userId: 1, requestId: 1 }, { unique: true });
memoryReviewSchema.index({ userId: 1, reviewedAt: -1 });
memoryReviewSchema.index({ userId: 1, topicId: 1, rating: 1, reviewedAt: -1 });
memoryReviewSchema.index({ userId: 1, memoryItemId: 1, reviewedAt: -1 });

export default mongoose.models.MemoryReview || mongoose.model("MemoryReview", memoryReviewSchema);
