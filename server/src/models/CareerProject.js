import mongoose from "mongoose";

const careerProjectSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  goalId: { type: mongoose.Schema.Types.ObjectId, ref: "Goal", required: true },
  templateId: { type: String, required: true, trim: true, maxlength: 100 },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  problem: { type: String, required: true, trim: true, maxlength: 1000 },
  skillIds: [{ type: String, trim: true, maxlength: 100 }],
  deliverables: [{ type: String, trim: true, maxlength: 300 }],
  completionCriteria: { type: String, required: true, trim: true, maxlength: 500 },
  rationale: { type: String, required: true, trim: true, maxlength: 500 },
  level: { type: String, enum: ["beginner", "intermediate", "advanced"], required: true },
  status: { type: String, enum: ["planned", "in_progress", "completed"], default: "planned" },
  completionEvidence: { type: String, trim: true, maxlength: 1000, default: null },
  repositoryUrl: { type: String, trim: true, maxlength: 500, default: null },
  completedAt: { type: Date, default: null }
}, { timestamps: true, collection: "careerProjects" });

careerProjectSchema.index({ userId: 1, goalId: 1, status: 1 });
careerProjectSchema.index({ userId: 1, goalId: 1, templateId: 1 }, { unique: true });

export default mongoose.models.CareerProject || mongoose.model("CareerProject", careerProjectSchema);
