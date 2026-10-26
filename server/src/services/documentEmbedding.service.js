import { embed } from "../ai/gateway.js";

export async function embedChunks(chunks, userId) {
  const embedded = [];
  for (const text of chunks) {
    const result = await embed({ input: text, userId });
    embedded.push(result.embedding);
  }
  return embedded;
}
