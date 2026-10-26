import mongoose from "mongoose";

const unitSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  syllabusId: { type: mongoose.Schema.Types.ObjectId, ref: "Syllabus", required: true, index: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true, index: true },
  name: { type: String, required: true, trim: true },
  order: { type: Number, min: 0 },
  status: { type: String, enum: ["active", "archived"], default: "active" }
}, { timestamps: true, collection: "units" });

export default mongoose.models.Unit || mongoose.model("Unit", unitSchema);
