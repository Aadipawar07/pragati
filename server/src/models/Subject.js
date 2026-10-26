import mongoose from "mongoose";

const subjectSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  syllabusId: { type: mongoose.Schema.Types.ObjectId, ref: "Syllabus", required: true },
  name: { type: String, required: true, trim: true },
  code: { type: String, trim: true },
  description: { type: String, trim: true },
  order: { type: Number, min: 0 },
  status: { type: String, enum: ["active", "archived"], default: "active" }
}, { timestamps: true, collection: "subjects" });

subjectSchema.index({ userId: 1 });
subjectSchema.index({ syllabusId: 1 });

export default mongoose.models.Subject || mongoose.model("Subject", subjectSchema);
