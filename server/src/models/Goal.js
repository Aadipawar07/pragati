import mongoose from "mongoose";

const careerDetailsSchema = new mongoose.Schema({
  careerPathId: { type: String, trim: true, maxlength: 80, default: null },
  category: { type: String, trim: true, maxlength: 80, default: null },
  experienceLevel: { type: String, enum: ["exploring", "beginner", "intermediate", "experienced"], default: "exploring" },
  preferredIndustries: [{ type: String, trim: true, maxlength: 80 }],
  shortTermGoal: { type: String, trim: true, maxlength: 500 },
  longTermGoal: { type: String, trim: true, maxlength: 500 },
  availableHoursPerWeek: { type: Number, min: 1, max: 112, default: null },
  targetMilestone: { type: String, trim: true, maxlength: 200 },
  preferredProjectTypes: [{ type: String, trim: true, maxlength: 80 }],
  existingExperience: { type: String, trim: true, maxlength: 1000 }
}, { _id: false });

const goalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  type: { type: String, enum: ["academic", "exam", "career", "skill", "project"] },
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  target: { type: String, trim: true },
  deadline: Date,
  careerDetails: { type: careerDetailsSchema, default: undefined },
  status: { type: String, enum: ["active", "completed", "paused"], default: "active" }
}, { timestamps: true, collection: "goals" });

export default mongoose.models.Goal || mongoose.model("Goal", goalSchema);
