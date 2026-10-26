import mongoose from "mongoose";

const documentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  filename: { type: String, required: true, trim: true },
  originalName: { type: String, required: true, trim: true },
  type: { type: String, enum: ["PDF"], required: true, default: "PDF" },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", default: null },
  topic: { type: mongoose.Schema.Types.ObjectId, ref: "Topic", default: null },
  size: { type: Number, required: true, min: 1 },
  mimeType: { type: String, required: true },
  storageKey: { type: String, required: true, unique: true },
  status: { type: String, enum: ["uploaded", "processing", "ready", "failed"], required: true, default: "uploaded" },
  pageCount: { type: Number, default: null },
  extractedTextLength: { type: Number, default: 0 },
  chunkCount: { type: Number, default: 0 },
  processingError: { type: String, default: null },
  processedAt: { type: Date, default: null }
}, { timestamps: true, collection: "documents" });

documentSchema.index({ userId: 1, createdAt: -1 });
documentSchema.index({ userId: 1, status: 1 });

export default mongoose.models.Document || mongoose.model("Document", documentSchema);
