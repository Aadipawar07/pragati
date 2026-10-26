import mongoose from "mongoose";

const syllabusSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, trim: true },
  sourceType: { type: String, enum: ["legacy", "manual"], default: "legacy" },
  rawText: { type: String, select: false },
  structuredInput: { type: mongoose.Schema.Types.Mixed, select: false },
  requestKey: { type: String, trim: true },
  sourceFileKey: { type: String, trim: true, select: false },
  sourceFileName: { type: String, trim: true },
  sourceMimeType: { type: String, trim: true },
  sourcePageCount: { type: Number, min: 1 },
  courseTitle: { type: String, trim: true },
  studyAvailability: {
    hoursPerDay: { type: Number, min: 1, max: 24 },
    daysPerWeek: { type: Number, min: 1, max: 7 }
  },
  status: { type: String, enum: ["draft", "processing", "ready", "failed"], default: "draft" },
  processingStage: {
    type: String,
    enum: ["queued", "extracting", "analyzing", "validating", "persisting", "roadmap", "complete"],
    default: "queued"
  },
  processingFailureCategory: {
    type: String,
    enum: ["provider_unavailable", "provider_configuration", "provider_quota", "provider_output_invalid", "syllabus_invalid", "unsupported_input", "processing_interrupted", "processing_error"]
  },
  processingDiagnostics: { type: [mongoose.Schema.Types.Mixed], select: false },
  processingError: { type: String },
  processingLeaseUntil: { type: Date, select: false },
  processingLeaseToken: { type: String, select: false },
  processingAttempts: { type: Number, min: 0, default: 0 },
  examDate: Date,
  subjectCount: { type: Number, min: 0 },
  studyPlan: [{
    title: { type: String, trim: true, maxlength: 160 },
    subjectName: { type: String, trim: true, maxlength: 120 },
    unitName: { type: String, trim: true, maxlength: 160 },
    topicNames: [{ type: String, trim: true, maxlength: 160 }],
    outcome: { type: String, trim: true, maxlength: 500 },
    activity: { type: String, trim: true, maxlength: 500 },
    studyMode: { type: String, enum: ["conceptual_understanding", "practice", "memorization", "revision"] },
    estimatedMinutes: { type: Number, min: 5, max: 480 },
    inferred: { type: Boolean, default: false }
  }],
  documentWarnings: [{ type: String, trim: true, maxlength: 300 }],
  needsStudentInput: [{ type: String, trim: true, maxlength: 300 }],
  roadmapStatus: { type: String, enum: ["pending", "ready", "failed"], default: "pending" },
  roadmapError: { type: String, select: false }
}, { timestamps: true, collection: "syllabi" });

syllabusSchema.index({ userId: 1, requestKey: 1 }, { unique: true, partialFilterExpression: { requestKey: { $type: "string" } } });
syllabusSchema.index({ userId: 1, sourceType: 1 }, { unique: true, partialFilterExpression: { sourceType: "manual" } });
syllabusSchema.index({ status: 1, processingLeaseUntil: 1 });

export default mongoose.models.Syllabus || mongoose.model("Syllabus", syllabusSchema);
