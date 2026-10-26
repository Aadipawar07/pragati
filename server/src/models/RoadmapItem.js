import mongoose from "mongoose";

const roadmapItemSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  roadmapId: { type: mongoose.Schema.Types.ObjectId, ref: "Roadmap", required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject" },
  topicId: { type: mongoose.Schema.Types.ObjectId, ref: "Topic" },
  careerSkillId: { type: String, trim: true, maxlength: 100, default: null },
  rationale: { type: String, trim: true, maxlength: 500 },
  actionRoute: { type: String, trim: true, maxlength: 200 },
  title: { type: String, required: true, trim: true },
  type: { type: String, trim: true },
  order: { type: Number, min: 0 },
  estimatedMinutes: { type: Number, min: 1 },
  status: { type: String, enum: ["pending", "in_progress", "completed", "skipped"], default: "pending" },
  scheduledDate: Date,
  completedAt: Date
}, { timestamps: true, collection: "roadmapItems" });

roadmapItemSchema.index({ userId: 1 });
roadmapItemSchema.index({ roadmapId: 1 });
roadmapItemSchema.index(
  { roadmapId: 1, careerSkillId: 1 },
  { unique: true, partialFilterExpression: { careerSkillId: { $type: "string" } } }
);

export default mongoose.models.RoadmapItem || mongoose.model("RoadmapItem", roadmapItemSchema);
