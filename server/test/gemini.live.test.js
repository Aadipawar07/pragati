import assert from "node:assert/strict";
import test from "node:test";
import { env } from "../src/config/env.js";
import { embed, generate } from "../src/ai/gateway.js";
import app from "../src/app.js";
import { AiUsage, Profile } from "../src/models/index.js";
import { generateToken } from "../src/utils/jwt.js";

const enabled = process.env.GEMINI_LIVE_TEST === "true" && Boolean(env.geminiApiKey);
const originalProfileFindOne = Profile.findOne;
const originalAiUsageCreate = AiUsage.create;
const originalJwtSecret = env.jwtSecret;
let server;
let apiBaseUrl;

test.before(async () => {
  if (!enabled) return;
  env.jwtSecret = "local-live-test-secret";
  Profile.findOne = () => ({ select: () => ({ lean: async () => null }) });
  AiUsage.create = async () => ({});
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  apiBaseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  Profile.findOne = originalProfileFindOne;
  AiUsage.create = originalAiUsageCreate;
  env.jwtSecret = originalJwtSecret;
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test("Gemini live text generation returns a response", { skip: !enabled && "Set GEMINI_LIVE_TEST=true and configure GEMINI_API_KEY." }, async () => {
  const result = await generate({
    task: "simple_generation",
    options: {
      prompt: "In one sentence, explain what cybersecurity protects.",
      timeoutMs: 30_000,
      retryPolicy: { maxAttempts: 1, totalBudgetMs: 32_000 }
    }
  });
  assert.equal(result.provider, "gemini");
  assert.match(result.content.trim(), /\S/);
});

test("Gemini live document embedding returns a vector", { skip: !enabled && "Set GEMINI_LIVE_TEST=true and configure GEMINI_API_KEY." }, async () => {
  const result = await embed({
    input: "A short, non-sensitive document indexing smoke test.",
    options: { timeoutMs: 20_000, retryPolicy: { maxAttempts: 2, totalBudgetMs: 30_000 } }
  });
  assert.equal(result.provider, "gemini");
  assert.ok(result.embedding.length > 0);
});

test("Gemini live concept explanation respects modes and language over HTTP", { skip: !enabled && "Set GEMINI_LIVE_TEST=true and configure GEMINI_API_KEY." }, async () => {
  const cases = [
    { mode: "simple", language: "en", detailLevel: "short" },
    { mode: "beginner", language: "en", detailLevel: "medium" },
    { mode: "technical", language: "en", detailLevel: "detailed" },
    { mode: "simple", language: "mr", detailLevel: "medium" }
  ];
  const token = generateToken("507f1f77bcf86cd799439011");
  for (const input of cases) {
    const response = await fetch(`${apiBaseUrl}/api/concepts/explain`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        concept: "cybersecurity",
        includeExamples: true,
        includeAnalogy: false,
        includeExamAnswer: false,
        ...input
      })
    });
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.equal(payload.success, true);
    assert.equal(payload.data.concept, "cybersecurity");
    assert.equal(payload.data.mode, input.mode);
    assert.equal(payload.data.language, input.language);
    assert.ok(payload.data.summary.trim());
    assert.ok(payload.data.explanation.length);
    console.info(`Live HTTP concept request succeeded for mode=${input.mode}, language=${input.language}.`);
  }
});
