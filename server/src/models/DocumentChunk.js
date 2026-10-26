import mongoose from "mongoose";

const documentChunkSchema = new mongoose.Schema({
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: "Document", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, required: true },
  chunkIndex: { type: Number, required: true, min: 0 },
  embedding: { type: [Number], default: undefined },
  metadata: {
    pageStart: { type: Number, default: null },
    pageEnd: { type: Number, default: null }
  }
}, { timestamps: { createdAt: true, updatedAt: false }, collection: "documentChunks" });

documentChunkSchema.index({ documentId: 1, chunkIndex: 1 }, { unique: true });
documentChunkSchema.index({ userId: 1 });

export default mongoose.models.DocumentChunk || mongoose.model("DocumentChunk", documentChunkSchema);
