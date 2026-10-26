import { env } from "../config/env.js";

const providers = {
  gemini: {
    available: () => Boolean(env.geminiApiKey && env.geminiModel),
    model: () => env.geminiModel,
    embeddingAvailable: () => Boolean(env.geminiApiKey && env.geminiEmbeddingModel),
    embeddingModel: () => env.geminiEmbeddingModel,
    supportsStructuredOutput: true
  }
};

const policy = {
  assessment_evaluation: ["gemini"],
  mentor_reasoning: ["gemini"],
  simple_generation: ["gemini"],
  concept_explanation: ["gemini"],
  practice_question_generation: ["gemini"],
  practice_answer_evaluation: ["gemini"]
};

function isCompatible(provider, { structured = false } = {}) {
  const supportsStructuredOutput = providers[provider]?.supportsStructuredOutput;
  return !structured || (typeof supportsStructuredOutput === "function" ? supportsStructuredOutput() : supportsStructuredOutput === true);
}

function routeEmbedding(preferredProvider) {
  if (preferredProvider && preferredProvider !== "gemini") {
    throw providerNotConfigured("Gemini is the only supported AI provider.");
  }
  if (!providers.gemini.embeddingAvailable()) {
    const error = new Error("No compatible embedding provider is configured.");
    error.status = 503;
    error.code = "EMBEDDING_PROVIDER_NOT_CONFIGURED";
    throw error;
  }
  return { provider: "gemini", model: providers.gemini.embeddingModel(), fallback: [] };
}

export function routeTask(task, preferredProvider, { structured = false } = {}) {
  if (task === "document_embedding") {
    return routeEmbedding(preferredProvider);
  }
  if (preferredProvider && preferredProvider !== "gemini") {
    throw providerNotConfigured("Gemini is the only supported AI provider.");
  }
  const compatible = (policy[task] || ["gemini"]).filter((provider) => isCompatible(provider, { structured }));
  if (!compatible.includes("gemini") || !providers.gemini.available()) throw providerNotConfigured();
  return {
    provider: "gemini",
    model: providers.gemini.model(),
    fallback: []
  };
}

function providerNotConfigured(message = "Gemini is not configured. Set GEMINI_API_KEY and GEMINI_MODEL in the server environment.") {
  const error = new Error(message);
  error.status = 503;
  error.code = "GEMINI_NOT_CONFIGURED";
  return error;
}
