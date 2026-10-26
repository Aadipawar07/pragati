import assert from "node:assert/strict";
import test from "node:test";
import { env } from "../src/config/env.js";
import * as gemini from "../src/ai/providers/gemini.js";

const originalFetch = globalThis.fetch;
const originalEnv = { ...env };

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  Object.assign(env, originalEnv);
});

test("Gemini uses the configured model and native JSON output", async () => {
  env.geminiApiKey = "test-secret";
  let requestUrl;
  let requestBody;
  let requestHeaders;
  globalThis.fetch = async (url, options) => {
    requestUrl = url;
    requestBody = JSON.parse(options.body);
    requestHeaders = options.headers;
    return new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: '{"summary":"A safe test response"}' }] } }],
      usageMetadata: { promptTokenCount: 21, candidatesTokenCount: 13 }
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  const result = await gemini.generate({
    model: "gemini-test",
    prompt: "Explain cybersecurity in simple terms.",
    schema: (data) => data,
    options: { maxTokens: 4321 }
  });

  assert.equal(result.structuredData.summary, "A safe test response");
  assert.equal(result.inputTokens, 21);
  assert.equal(result.outputTokens, 13);
  assert.equal(requestUrl, "https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent");
  assert.equal(new URL(requestUrl).search, "");
  assert.equal(requestHeaders["x-goog-api-key"], "test-secret");
  assert.equal(requestBody.contents[0].parts[0].text, "Explain cybersecurity in simple terms.");
  assert.equal(requestBody.generationConfig.responseMimeType, "application/json");
  assert.equal(requestBody.generationConfig.maxOutputTokens, 4321);
});

test("Gemini text generation returns a non-empty response", async () => {
  env.geminiApiKey = "test-secret";
  let requestBody;
  globalThis.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: "Cybersecurity protects systems and information." }] } }]
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  const result = await gemini.generate({
    model: "gemini-test",
    prompt: "Explain cybersecurity in one sentence.",
    options: {}
  });

  assert.match(result.content, /Cybersecurity/);
  assert.equal(requestBody.generationConfig.responseMimeType, "text/plain");
});

test("Gemini embeddings keep the API key out of the request URL", async () => {
  env.geminiApiKey = "test-secret";
  let requestUrl;
  let requestHeaders;
  globalThis.fetch = async (url, options) => {
    requestUrl = url;
    requestHeaders = options.headers;
    return new Response(JSON.stringify({ embedding: { values: [0.1, 0.2] } }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };

  const result = await gemini.embed({ model: "gemini-embedding-test", input: "safe text" });

  assert.equal(new URL(requestUrl).search, "");
  assert.equal(requestHeaders["x-goog-api-key"], "test-secret");
  assert.deepEqual(result.embedding, [0.1, 0.2]);
});

test("Gemini authentication failures retain safe categorized diagnostics", async () => {
  env.geminiApiKey = "test-secret";
  globalThis.fetch = async () => new Response(JSON.stringify({
    error: {
      code: 401,
      status: "UNAUTHENTICATED",
      message: "Invalid key AIzaSyDummYKeyThatShouldNeverBeLogged1234567"
    }
  }), {
    status: 401,
    headers: { "Content-Type": "application/json", "x-request-id": "gemini-test-request" }
  });

  await assert.rejects(
    gemini.generate({ model: "gemini-test", prompt: "safe test prompt", options: {} }),
    (error) => {
      assert.equal(error.provider, "Gemini");
      assert.equal(error.httpStatus, 401);
      assert.equal(error.category, "authentication_rejected");
      assert.equal(error.providerCode, "UNAUTHENTICATED");
      assert.equal(error.requestId, "gemini-test-request");
      assert.equal(error.retryable, false);
      assert.doesNotMatch(error.providerMessage, /AIza/);
      return true;
    }
  );
});
