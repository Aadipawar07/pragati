import { env } from "../../config/env.js";
import { providerResponseError } from "./providerError.js";

export async function generate(request) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${request.model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": env.geminiApiKey },
    body: JSON.stringify({
      generationConfig: {
        temperature: request.options?.temperature ?? 0,
        responseMimeType: request.schema ? "application/json" : "text/plain",
        maxOutputTokens: request.options?.maxTokens || 6000
      },
      contents: [{ parts: [{ text: request.prompt }] }]
    }),
    signal: request.signal
  });
  if (!response.ok) throw await providerResponseError("Gemini", response, request.model);
  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  if (!content.trim()) {
    const finishReason = data.candidates?.[0]?.finishReason || data.promptFeedback?.blockReason || "EMPTY_RESPONSE";
    const error = new Error(`Gemini returned no content (${finishReason}).`);
    error.name = "AiProviderError";
    error.provider = "Gemini";
    error.model = request.model;
    error.providerCode = finishReason;
    error.providerMessage = "Gemini returned no generated text.";
    error.category = "invalid_provider_response";
    error.code = "AI_EMPTY_PROVIDER_RESPONSE";
    throw error;
  }
  let structuredData = null;
  if (request.schema) {
    try {
      structuredData = JSON.parse(content);
    } catch {
      const error = new Error("Gemini returned invalid JSON for structured output.");
      error.code = "AI_INVALID_OUTPUT";
      error.category = "invalid_structured_output";
      throw error;
    }
  }
  return {
    content,
    structuredData,
    inputTokens: data.usageMetadata?.promptTokenCount ?? null,
    outputTokens: data.usageMetadata?.candidatesTokenCount ?? null
  };
}

export async function embed(request) {
  const model = request.model.startsWith("models/") ? request.model : `models/${request.model}`;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${model}:embedContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": env.geminiApiKey },
    body: JSON.stringify({ content: { parts: [{ text: request.input }] } }),
    signal: request.signal
  });
  if (!response.ok) throw await providerResponseError("Gemini", response, model);
  const data = await response.json();
  const embedding = data.embedding?.values;
  if (!Array.isArray(embedding) || !embedding.length) throw new Error("Gemini returned an invalid embedding.");
  return { embedding, inputTokens: null, outputTokens: null };
}
