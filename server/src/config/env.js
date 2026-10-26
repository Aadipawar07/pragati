import dotenv from "dotenv";

dotenv.config();

const port = Number(process.env.PORT || 5000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT must be a valid port number");
const clientUrl = process.env.CLIENT_URL || process.env.CLIENT_ORIGIN || "http://localhost:5173";
const mongoDbName = process.env.MONGODB_DB_NAME || "pragati";
const jwtSecret = process.env.JWT_SECRET || "";
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || "7d";
const geminiApiKey = process.env.GEMINI_API_KEY || "";
const geminiModel = process.env.GEMINI_MODEL || "gemini-3.6-flash";
const geminiEmbeddingModel = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-2";
const maxDocumentSizeMb = Number(process.env.MAX_DOCUMENT_SIZE_MB || 20);
const documentChunkSize = Number(process.env.DOCUMENT_CHUNK_SIZE || 1200);
const documentChunkOverlap = Number(process.env.DOCUMENT_CHUNK_OVERLAP || 150);

export const env = {
  port,
  nodeEnv: process.env.NODE_ENV || "development",
  clientUrl,
  mongoUri: process.env.MONGODB_URI || "",
  mongoDbName,
  jwtSecret,
  jwtExpiresIn,
  geminiApiKey,
  geminiModel,
  geminiEmbeddingModel,
  maxDocumentSizeMb,
  documentChunkSize,
  documentChunkOverlap
};
