import { env } from "../config/env.js";
import { routeTask } from "./router.js";
import * as gemini from "./providers/gemini.js";
import { trackUsage } from "./usage.js";

const providerModules = { gemini };
const DEFAULT_RETRY_POLICY = {
  maxAttempts: 3,
  totalBudgetMs: 45_000,
  baseDelayMs: 250,
  maxDelayMs: 2_000
};

export async function generate({ task, context = {}, schema = null, options = {}, userId }) {
  if (!task || typeof task !== "string") {
    const error = new Error("AI task is required.");
    error.status = 400;
    error.code = "AI_TASK_REQUIRED";
    throw error;
  }
  const prompt = options.prompt || JSON.stringify({ task, context, schema });
  const route = routeTask(task, options.preferredProvider, {
    structured: schema !== null && options.requireNativeStructuredOutput !== false
  });
  let lastError;
  const failures = [];
  const candidates = [{ provider: route.provider, model: route.model }, ...route.fallback];
  for (const [index, candidate] of candidates.entries()) {
    const provider = candidate.provider;
    try {
      const { result, structuredData, latency } = await generateWithRetries({
        provider,
        model: candidate.model,
        task,
        prompt,
        schema,
        options,
        userId
      });
      await trackUsage({
        userId,
        provider,
        model: candidate.model,
        task,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        latency,
        status: index === 0 ? "success" : "fallback",
        estimatedCost: null
      });
      console.info(JSON.stringify({
        event: "ai_provider_attempt_succeeded",
        provider,
        task,
        model: candidate.model,
        elapsedMs: latency,
        status: index === 0 ? "success" : "fallback"
      }));
      return { content: result.content, structuredData, provider, model: candidate.model, usage: { inputTokens: result.inputTokens, outputTokens: result.outputTokens }, latency, status: index === 0 ? "success" : "fallback" };
    } catch (error) {
      lastError = error;
      failures.push(...(error.attempts || []));
    }
  }
  const transientOnly = failures.length > 0 && failures.every((failure) => failure.retryable);
  const configurationOnly = failures.length > 0 && failures.every((failure) =>
    ["authentication_rejected", "model_or_endpoint_not_found"].includes(failure.category)
  );
  const quotaOnly = failures.length > 0 && failures.every((failure) => failure.category === "quota_exceeded");
  const invalidOutput = failures.some((failure) =>
    ["invalid_structured_output", "invalid_provider_response"].includes(failure.category)
  );
  const requestRejected = failures.length > 0 && failures.every((failure) => failure.category === "request_rejected");
  const modelNotFound = failures.length > 0 && failures.every((failure) => failure.category === "model_or_endpoint_not_found");
  const code = transientOnly
    ? "AI_PROVIDER_TEMPORARILY_UNAVAILABLE"
    : modelNotFound
      ? "AI_PROVIDER_MODEL_NOT_FOUND"
      : configurationOnly
        ? "AI_PROVIDER_CONFIGURATION_ERROR"
        : quotaOnly
          ? "AI_PROVIDER_QUOTA_EXCEEDED"
          : invalidOutput
            ? "AI_INVALID_OUTPUT"
            : requestRejected
              ? "AI_PROVIDER_REQUEST_REJECTED"
              : "AI_PROVIDER_ERROR";
  const taskLabel = task === "concept_explanation" ? "Concept explanation" : "AI request";
  const message = code === "AI_PROVIDER_TEMPORARILY_UNAVAILABLE"
    ? `${taskLabel} is temporarily unavailable because Gemini is not responding. Please retry shortly.`
    : code === "AI_PROVIDER_MODEL_NOT_FOUND"
      ? "The configured Gemini model was not found. Check GEMINI_MODEL in the server environment."
    : code === "AI_PROVIDER_CONFIGURATION_ERROR"
      ? "Gemini rejected authentication. Check GEMINI_API_KEY in the server environment."
    : code === "AI_PROVIDER_QUOTA_EXCEEDED"
      ? "Gemini AI usage quota is exhausted. Check the API project's usage limits or billing, then retry."
      : code === "AI_INVALID_OUTPUT"
        ? `${taskLabel} failed because Gemini returned invalid structured output. Please retry.`
        : code === "AI_PROVIDER_REQUEST_REJECTED"
          ? "Gemini rejected the request. Check the selected model's supported request format."
          : `${taskLabel} failed. Please retry.`;
  const error = new Error(message);
  error.status = transientOnly || configurationOnly || modelNotFound ? 503 : quotaOnly ? 429 : requestRejected ? 422 : 502;
  error.code = code;
  error.expose = true;
  error.attempts = failures;
  error.cause = lastError;
  throw error;
}

async function generateWithRetries({ provider, model, task, prompt, schema, options, userId, operation = "generate", input }) {
  const started = Date.now();
  const policy = {
    ...DEFAULT_RETRY_POLICY,
    totalBudgetMs: options.retryBudgetMs ?? DEFAULT_RETRY_POLICY.totalBudgetMs,
    ...options.retryPolicy
  };
  const deadline = started + policy.totalBudgetMs;
  const attempts = [];
  let lastError;

  for (let attempt = 1; attempt <= policy.maxAttempts; attempt += 1) {
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) break;
    const attemptStarted = Date.now();
    const controller = new AbortController();
    const timeoutMs = Math.min(options.timeoutMs || 20_000, remainingMs);
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let failure;
    try {
      const providerClient = providerModules[provider];
      const requestSignal = options.signal
        ? AbortSignal.any([controller.signal, options.signal])
        : controller.signal;
      const result = operation === "embed"
        ? await providerClient.embed({ input, model, signal: requestSignal })
        : await providerClient.generate({ prompt, schema, model, options, signal: requestSignal });
      const structuredData = schema ? validateStructuredData(result.structuredData, schema) : null;
      return { result, structuredData, latency: Date.now() - started };
    } catch (error) {
      failure = error.name === "AbortError"
        ? Object.assign(new Error("Provider request timed out."), {
          name: "AiProviderError",
          category: "timeout",
          code: "AI_PROVIDER_TIMEOUT",
          retryable: true,
          providerMessage: "Provider request timed out."
        })
        : normalizeProviderFailure(error);
      lastError = failure;
    } finally {
      clearTimeout(timeout);
    }

    const elapsedMs = Date.now() - attemptStarted;
    const safeMessage = failure.providerMessage || safeProviderMessage(failure);
    const attemptFailure = {
      provider,
      model,
      attempt,
      category: categorizeFailure(failure),
      httpStatus: failure.httpStatus || null,
      providerCode: failure.providerCode || null,
      providerReason: failure.providerReason || null,
      message: safeMessage,
      requestId: failure.requestId || null,
      retryable: failure.retryable === true
    };
    attempts.push(attemptFailure);
    console.warn(JSON.stringify({
      event: "ai_provider_attempt_failed",
      provider,
      task,
      model,
      attempt,
      elapsedMs,
      category: attemptFailure.category,
      httpStatus: attemptFailure.httpStatus,
      providerCode: attemptFailure.providerCode,
      providerReason: attemptFailure.providerReason,
      providerMessage: safeMessage,
      requestId: attemptFailure.requestId,
      retryable: attemptFailure.retryable
    }));
    await trackUsage({
      userId,
      provider,
      model,
      task,
      inputTokens: null,
      outputTokens: null,
      latency: elapsedMs,
      status: failure.category === "timeout" ? "timeout" : "error",
      estimatedCost: null
    });

    if (!attemptFailure.retryable || attempt === policy.maxAttempts) break;
    const delayMs = retryDelay(failure, attempt, policy);
    if (delayMs >= deadline - Date.now()) break;
    console.warn(JSON.stringify({
      event: "ai_provider_retry_scheduled",
      provider,
      task,
      model,
      attempt,
      delayMs,
      category: attemptFailure.category,
      httpStatus: attemptFailure.httpStatus
    }));
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  const aggregate = new Error(lastError?.message || "Provider request failed.");
  aggregate.category = lastError?.category || "provider_error";
  aggregate.code = lastError?.code;
  aggregate.retryable = lastError?.retryable === true;
  aggregate.attempts = attempts;
  throw aggregate;
}

function retryDelay(error, attempt, policy) {
  if (Number.isFinite(error.retryAfterMs)) return error.retryAfterMs;
  const ceiling = Math.min(policy.maxDelayMs, policy.baseDelayMs * (2 ** (attempt - 1)));
  return Math.floor(Math.random() * ceiling);
}

function normalizeProviderFailure(error) {
  if (!error.category && error.name === "TypeError") error.category = "network_error";
  if (error.retryable === undefined) {
    error.retryable = error.category === "timeout"
      || error.category === "network_error"
      || error.code === "AI_PROVIDER_TIMEOUT";
  }
  return error;
}

function safeProviderMessage(error) {
  if (error.category === "timeout") return "Provider request timed out.";
  if (error.code === "AI_INVALID_OUTPUT") return "Provider returned invalid structured output.";
  if (error.category === "network_error") return "Provider could not be reached.";
  if (error.category === "invalid_provider_response") return "Provider returned an invalid response.";
  return "Provider request failed before a valid response.";
}

function categorizeFailure(error) {
  if (error.category) return error.category;
  if (error.code === "AI_INVALID_OUTPUT") return "invalid_structured_output";
  if (error.name === "TypeError") return "network_error";
  if (error.name === "SyntaxError") return "invalid_provider_response";
  return "provider_error";
}

function validateStructuredData(data, schema) {
  if (typeof schema === "function") return schema(data);
  if (!data || typeof data !== "object") {
    const error = new Error("AI provider returned invalid structured data.");
    error.status = 502;
    error.code = "AI_INVALID_OUTPUT";
    throw error;
  }
  return data;
}

export async function embed({ task = "document_embedding", input, options = {}, userId }) {
  if (!input || typeof input !== "string") {
    const error = new Error("Embedding input is required.");
    error.status = 400;
    error.code = "EMBEDDING_INPUT_REQUIRED";
    throw error;
  }
  const route = routeTask(task, options.preferredProvider);
  try {
    const { result, latency } = await generateWithRetries({
      provider: route.provider,
      model: route.model,
      task,
      input,
      schema: null,
      options,
      userId,
      operation: "embed"
    });
    await trackUsage({ userId, provider: route.provider, model: route.model, task, inputTokens: result.inputTokens, outputTokens: result.outputTokens, latency, status: "success", estimatedCost: null });
    return { embedding: result.embedding, provider: route.provider, model: route.model, usage: { inputTokens: result.inputTokens, outputTokens: result.outputTokens }, latency };
  } catch (error) {
    const failures = error.attempts || [];
    const transientOnly = failures.length > 0 && failures.every((failure) => failure.retryable);
    const quotaOnly = failures.length > 0 && failures.every((failure) => failure.category === "quota_exceeded");
    const modelNotFound = failures.length > 0 && failures.every((failure) => failure.category === "model_or_endpoint_not_found");
    const configurationError = failures.length > 0 && failures.every((failure) => failure.category === "authentication_rejected");
    const code = transientOnly
      ? "AI_PROVIDER_TEMPORARILY_UNAVAILABLE"
      : quotaOnly
        ? "AI_PROVIDER_QUOTA_EXCEEDED"
        : modelNotFound
          ? "AI_PROVIDER_MODEL_NOT_FOUND"
          : configurationError
            ? "AI_PROVIDER_CONFIGURATION_ERROR"
            : "EMBEDDING_PROVIDER_ERROR";
    const message = code === "AI_PROVIDER_TEMPORARILY_UNAVAILABLE"
      ? "Gemini document embedding is temporarily unavailable. Please retry shortly."
      : code === "AI_PROVIDER_QUOTA_EXCEEDED"
        ? "Gemini AI usage quota is exhausted. Check the API project's usage limits or billing, then retry."
        : code === "AI_PROVIDER_MODEL_NOT_FOUND"
          ? "The configured Gemini embedding model was not found. Check GEMINI_EMBEDDING_MODEL."
          : code === "AI_PROVIDER_CONFIGURATION_ERROR"
            ? "Gemini rejected authentication. Check GEMINI_API_KEY in the server environment."
            : "Gemini document embedding failed.";
    const wrapped = new Error(message);
    wrapped.status = transientOnly || modelNotFound || configurationError ? 503 : quotaOnly ? 429 : 502;
    wrapped.code = code;
    wrapped.expose = true;
    wrapped.attempts = failures;
    wrapped.cause = error;
    throw wrapped;
  }
}
