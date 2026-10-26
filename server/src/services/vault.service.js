import { Document, DocumentChunk } from "../models/index.js";
import { deleteDocument, saveDocument } from "./documentStorage.service.js";
import { extractPdf } from "./documentExtraction.service.js";
import { chunkText } from "./documentChunking.service.js";
import { embedChunks } from "./documentEmbedding.service.js";

export async function ingestDocument({ userId, file, subject = null, topic = null }) {
  const storageKey = await saveDocument(file.buffer);
  const document = await Document.create({
    userId,
    filename: file.originalname,
    originalName: file.originalname,
    type: "PDF",
    subject: subject || null,
    topic: topic || null,
    size: file.size,
    mimeType: file.mimetype,
    storageKey,
    status: "processing"
  });
  try {
    const extracted = await extractPdf(file.buffer);
    const chunks = chunkText(extracted.text);
    const embeddings = await embedChunks(chunks, userId);
    await DocumentChunk.insertMany(chunks.map((text, index) => ({ documentId: document.id, userId, text, chunkIndex: index, embedding: embeddings[index] })));
    document.status = "ready";
    document.pageCount = extracted.pageCount;
    document.extractedTextLength = extracted.text.length;
    document.chunkCount = chunks.length;
    document.processedAt = new Date();
    await document.save();
    return serializeDocument(document);
  } catch (error) {
    document.status = "failed";
    document.processingError = safeProcessingError(error);
    await document.save();
    throw error;
  }
}

export async function listDocuments(userId) {
  const documents = await Document.find({ userId }).sort({ createdAt: -1 }).lean();
  return documents.map(serializeDocument);
}

export async function getDocument(userId, documentId) {
  const document = await Document.findOne({ _id: documentId, userId }).lean();
  if (!document) return null;
  const previewChunks = await DocumentChunk.find({ documentId: document._id, userId }).sort({ chunkIndex: 1 }).limit(3).select("text chunkIndex").lean();
  return { ...serializeDocument(document), previewText: previewChunks.map((chunk) => chunk.text).join("\n\n") };
}

export async function removeDocument(userId, documentId) {
  const document = await Document.findOne({ _id: documentId, userId });
  if (!document) return false;
  await deleteDocument(document.storageKey);
  await DocumentChunk.deleteMany({ documentId: document._id, userId });
  await document.deleteOne();
  return true;
}

function serializeDocument(document) {
  return {
    id: document._id?.toString() || document.id,
    filename: document.filename,
    originalName: document.originalName,
    type: document.type,
    subject: document.subject,
    topic: document.topic,
    size: document.size,
    status: document.status,
    pageCount: document.pageCount,
    extractedTextLength: document.extractedTextLength,
    chunkCount: document.chunkCount,
    processingError: document.processingError,
    createdAt: document.createdAt,
    processedAt: document.processedAt
  };
}

function safeProcessingError(error) {
  return error.code && error.status && error.status < 500 ? error.message : error.code || "Document processing failed.";
}
