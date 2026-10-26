import mongoose from "mongoose";

const roadmapSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  kind: { type: String, enum: ["academic", "career"], default: "academic", index: true },
  careerGoalId: { type: mongoose.Schema.Types.ObjectId, ref: "Goal", default: null },
  sourceSyllabusId: { type: mongoose.Schema.Types.ObjectId, ref: "Syllabus", default: null },
  sourceVersion: { type: String, trim: true, default: null },
  title: { type: String, required: true, trim: true },
  goal: { type: String, trim: true },
  status: { type: String, enum: ["draft", "active", "completed", "archived"], default: "draft" },
  startDate: Date,
  endDate: Date,
  progress: { type: Number, min: 0, max: 100, default: 0 }
}, { timestamps: true, collection: "roadmaps" });

roadmapSchema.index({ userId: 1, kind: 1, careerGoalId: 1 });
roadmapSchema.index({ userId: 1, sourceSyllabusId: 1 }, { unique: true, partialFilterExpression: { sourceSyllabusId: { $type: "objectId" } } });

export default mongoose.models.Roadmap || mongoose.model("Roadmap", roadmapSchema);
