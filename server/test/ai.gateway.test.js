import assert from "node:assert/strict";
import test from "node:test";
import { env } from "../src/config/env.js";
import { embed, generate } from "../src/ai/gateway.js";

const originalEnv = { ...env };
const originalFetch = globalThis.fetch;

test.afterEach(() => {
  Object.assign(env, originalEnv);
  globalThis.fetch = originalFetch;
});

function configureGemini() {
  env.geminiApiKey = "test-gemini-key";
  env.geminiModel = "gemini-test";
}

function providerError(status, message, retryAfter = "0") {
  return new Response(JSON.stringify({
    error: { code: status, status: status === 429 ? "RESOURCE_EXHAUSTED" : "UNAVAILABLE", message }
  }), {
    status,
    headers: { "Content-Type": "application/json", "Retry-After": retryAfter, "x-request-id": "provider-request-123" }
  });
}

const quickRetryPolicy = { maxAttempts: 3, totalBudgetMs: 2_000, baseDelayMs: 1, maxDelayMs: 1 };

test("retries Gemini 503 and succeeds", async () => {
  configureGemini();
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    if (calls === 1) return providerError(503, "Model is temporarily overloaded", "0.01");
    return new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: "A concept explanation." }] } }]
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  const result = await generate({
    task: "simple_generation",
    options: { prompt: "safe probe", retryPolicy: quickRetryPolicy }
  });

  assert.equal(calls, 2);
  assert.equal(result.content, "A concept explanation.");
  assert.equal(result.provider, "gemini");
});

test("exhausts bounded retries and uses a concept-specific unavailable message", async () => {
  configureGemini();
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return providerError(503, "Model is temporarily overloaded");
  };

  await assert.rejects(
    generate({
      task: "concept_explanation",
      options: { prompt: "safe probe", retryPolicy: quickRetryPolicy }
    }),
    (error) => {
      assert.equal(error.code, "AI_PROVIDER_TEMPORARILY_UNAVAILABLE");
      assert.equal(error.status, 503);
      assert.equal(error.attempts.length, 3);
      assert.equal(error.attempts[0].providerCode, "UNAVAILABLE");
      assert.equal(error.attempts[0].requestId, "provider-request-123");
      assert.match(error.message, /Concept explanation is temporarily unavailable/);
      assert.doesNotMatch(error.message, /syllabus|saved/i);
      return true;
    }
  );
  assert.equal(calls, 3);
});

test("does not retry malformed requests", async () => {
  configureGemini();
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return providerError(400, "Invalid request payload");
  };

  await assert.rejects(
    generate({
      task: "simple_generation",
      options: { prompt: "safe probe", retryPolicy: quickRetryPolicy }
    }),
    (error) => {
      assert.equal(error.attempts.length, 1);
      assert.equal(error.attempts[0].retryable, false);
      assert.equal(error.attempts[0].httpStatus, 400);
      return true;
    }
  );
  assert.equal(calls, 1);
});

test("retries network failures within the bounded budget", async () => {
  configureGemini();
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    if (calls === 1) throw new TypeError("fetch failed");
    return new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: "Recovered response." }] } }]
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  const result = await generate({
    task: "simple_generation",
    options: { prompt: "safe probe", retryPolicy: quickRetryPolicy }
  });

  assert.equal(calls, 2);
  assert.equal(result.content, "Recovered response.");
});

test("retries transient Gemini embedding failures", async () => {
  configureGemini();
  env.geminiEmbeddingModel = "gemini-embedding-test";
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    if (calls === 1) return providerError(503, "Embedding service is temporarily overloaded");
    return new Response(JSON.stringify({ embedding: { values: [0.1, 0.2, 0.3] } }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };

  const result = await embed({
    input: "safe embedding probe",
    options: { retryPolicy: quickRetryPolicy }
  });

  assert.equal(calls, 2);
  assert.deepEqual(result.embedding, [0.1, 0.2, 0.3]);
  assert.equal(result.provider, "gemini");
  assert.equal(result.model, "gemini-embedding-test");
});

test("reports exhausted Gemini quota as a quota-specific error", async () => {
  configureGemini();
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response(JSON.stringify({
      error: { code: 429, status: "RESOURCE_EXHAUSTED", message: "Quota exceeded for the free tier request limit." }
    }), { status: 429, headers: { "Content-Type": "application/json" } });
  };

  await assert.rejects(
    generate({
      task: "concept_explanation",
      options: { prompt: "safe probe", retryPolicy: quickRetryPolicy }
    }),
    (error) => {
      assert.equal(error.code, "AI_PROVIDER_QUOTA_EXCEEDED");
      assert.equal(error.status, 429);
      assert.equal(error.attempts.length, 1);
      assert.match(error.message, /Gemini AI usage quota is exhausted/);
      return true;
    }
  );
  assert.equal(calls, 1);
});

test("returns a sanitized configuration error when Gemini is not configured", async () => {
  env.geminiApiKey = "";
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    throw new Error("A provider should not be called.");
  };

  await assert.rejects(
    generate({ task: "concept_explanation" }),
    { code: "GEMINI_NOT_CONFIGURED", status: 503 }
  );
  assert.equal(calls, 0);
});
