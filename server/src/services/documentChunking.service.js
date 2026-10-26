import { env } from "../config/env.js";

export function chunkText(text, options = {}) {
  const size = options.size || env.documentChunkSize;
  const overlap = options.overlap ?? env.documentChunkOverlap;
  if (!Number.isInteger(size) || size <= 0 || !Number.isInteger(overlap) || overlap < 0 || overlap >= size) {
    const error = new Error("Invalid document chunk configuration.");
    error.status = 500;
    error.code = "DOCUMENT_CHUNK_CONFIG_INVALID";
    throw error;
  }
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + size, text.length);
    if (end < text.length) {
      const boundary = text.lastIndexOf("\n\n", end);
      if (boundary > start + Math.floor(size * 0.6)) end = boundary;
    }
    const value = text.slice(start, end).trim();
    if (value) chunks.push(value);
    if (end >= text.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks;
}
