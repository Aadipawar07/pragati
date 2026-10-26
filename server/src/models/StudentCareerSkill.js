import mongoose from "mongoose";

const evidenceSchema = new mongoose.Schema({
  source: { type: String, enum: ["self_reported", "learning", "practice", "completed_project"], required: true },
  detail: { type: String, trim: true, maxlength: 500 },
  referenceId: { type: mongoose.Schema.Types.ObjectId, default: null },
  recordedAt: { type: Date, default: Date.now }
}, { _id: true });

const studentCareerSkillSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  skillId: { type: String, required: true, trim: true, maxlength: 100 },
  evidence: { type: [evidenceSchema], default: [], validate: (items) => items.length <= 30 }
}, { timestamps: true, collection: "studentCareerSkills" });

studentCareerSkillSchema.index({ userId: 1, skillId: 1 }, { unique: true });

export default mongoose.models.StudentCareerSkill || mongoose.model("StudentCareerSkill", studentCareerSkillSchema);
