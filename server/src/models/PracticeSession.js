import mongoose from "mongoose";

const optionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  text: { type: String, required: true, trim: true }
}, { _id: false });

const attemptSchema = new mongoose.Schema({
  answer: { type: String, trim: true, maxlength: 5000 },
  answeredAt: Date,
  isCorrect: { type: Boolean, default: null },
  awardedMarks: { type: Number, default: null, min: 0 },
  feedback: { type: String, trim: true, maxlength: 1600 },
  missingConcepts: [{ type: String, trim: true, maxlength: 200 }],
  suggestedNextStep: { type: String, trim: true, maxlength: 400 },
  gradingMethod: { type: String, enum: ["deterministic", "ai"], default: null },
  gradingStatus: { type: String, enum: ["pending", "graded"], default: null }
}, { _id: false });

const questionSchema = new mongoose.Schema({
  type: { type: String, enum: ["mcq", "short_answer", "long_answer"], required: true },
  topicId: { type: mongoose.Schema.Types.ObjectId, ref: "Topic", default: null },
  topicName: { type: String, required: true, trim: true },
  difficulty: { type: String, enum: ["easy", "medium", "hard"], required: true },
  prompt: { type: String, required: true, trim: true, maxlength: 1200 },
  options: { type: [optionSchema], default: [] },
  correctOptionId: { type: String, default: null, select: false },
  expectedAnswer: { type: String, required: true, trim: true, maxlength: 2000, select: false },
  rubric: { type: [String], default: [], select: false },
  explanation: { type: String, required: true, trim: true, maxlength: 1600 },
  marks: { type: Number, required: true, min: 1, max: 10 },
  attempt: { type: attemptSchema, default: () => ({}) }
}, { _id: true });

const practiceSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
  topicId: { type: mongoose.Schema.Types.ObjectId, ref: "Topic", required: true },
  subjectName: { type: String, required: true },
  topicName: { type: String, required: true },
  mode: { type: String, enum: ["mcq", "short_answer", "long_answer", "conceptual", "application", "quick_quiz", "topic_revision", "weak_area"], required: true },
  difficulty: { type: String, enum: ["easy", "medium", "hard"], required: true },
  language: { type: String, enum: ["en", "mr", "hi"], default: "en" },
  status: { type: String, enum: ["in_progress", "completed"], default: "in_progress" },
  questions: { type: [questionSchema], required: true, validate: (questions) => questions.length >= 1 && questions.length <= 20 },
  startedAt: { type: Date, default: Date.now },
  submittedAt: { type: Date, default: null }
}, { timestamps: true, collection: "practiceSessions" });

practiceSessionSchema.index({ userId: 1, createdAt: -1 });
practiceSessionSchema.index({ userId: 1, topicId: 1, status: 1 });

export default mongoose.models.PracticeSession || mongoose.model("PracticeSession", practiceSessionSchema);
