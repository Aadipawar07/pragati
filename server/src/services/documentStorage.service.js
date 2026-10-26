import { createWriteStream } from "node:fs";
import { mkdir, readFile, unlink } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const storageDirectory = path.resolve(process.cwd(), "storage", "documents");

export async function saveDocument(buffer, extension = ".pdf") {
  await mkdir(storageDirectory, { recursive: true });
  const safeExtension = /^\.[a-z0-9]{1,8}$/i.test(extension) ? extension.toLowerCase() : ".bin";
  const storageKey = `${randomUUID()}${safeExtension}`;
  const absolutePath = path.join(storageDirectory, storageKey);
  await pipeline(bufferToStream(buffer), createWriteStream(absolutePath));
  return storageKey;
}

export async function readDocument(storageKey) {
  if (!storageKey || path.basename(storageKey) !== storageKey) {
    throw new Error("Invalid document storage key.");
  }
  return readFile(path.join(storageDirectory, storageKey));
}

export async function deleteDocument(storageKey) {
  if (!storageKey || path.basename(storageKey) !== storageKey) return;
  try {
    await unlink(path.join(storageDirectory, storageKey));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

function bufferToStream(buffer) {
  return Readable.from(buffer);
}

import { Readable } from "node:stream";
