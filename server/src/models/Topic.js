import mongoose from "mongoose";

const topicSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  syllabusId: { type: mongoose.Schema.Types.ObjectId, ref: "Syllabus", required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
  unitId: { type: mongoose.Schema.Types.ObjectId, ref: "Unit" },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  sourcePages: [{ type: Number, min: 1 }],
  order: { type: Number, min: 0 },
  difficulty: { type: String, enum: ["beginner", "intermediate", "advanced"] },
  prerequisites: [{
    topicId: { type: mongoose.Schema.Types.ObjectId, ref: "Topic" },
    title: { type: String, trim: true },
    source: { type: String, enum: ["explicit", "inferred"] }
  }],
  status: { type: String, enum: ["active", "archived"], default: "active" }
}, { timestamps: true, collection: "topics" });

topicSchema.index({ userId: 1 });
topicSchema.index({ syllabusId: 1 });
topicSchema.index({ subjectId: 1 });

export default mongoose.models.Topic || mongoose.model("Topic", topicSchema);
