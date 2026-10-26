import assert from "node:assert/strict";
import test from "node:test";
import { env } from "../src/config/env.js";
import { routeTask } from "../src/ai/router.js";

const originalEnv = { ...env };

test.afterEach(() => {
  Object.assign(env, originalEnv);
});

test("routes all generation tasks through Gemini without fallback", () => {
  env.geminiApiKey = "configured-for-test";
  env.geminiModel = "gemini-test";

  for (const task of [
    "simple_generation",
    "concept_explanation",
    "assessment_evaluation",
    "mentor_reasoning",
    "practice_question_generation",
    "practice_answer_evaluation"
  ]) {
    assert.deepEqual(routeTask(task, undefined, { structured: true }), {
      provider: "gemini",
      model: "gemini-test",
      fallback: []
    });
  }
});

test("uses Gemini only for document embeddings and requires an embedding model", () => {
  env.geminiApiKey = "configured-for-test";
  env.geminiEmbeddingModel = "gemini-embedding-test";
  assert.deepEqual(routeTask("document_embedding"), {
    provider: "gemini",
    model: "gemini-embedding-test",
    fallback: []
  });

  env.geminiEmbeddingModel = "";
  assert.throws(
    () => routeTask("document_embedding"),
    (error) => error.status === 503 && error.code === "EMBEDDING_PROVIDER_NOT_CONFIGURED"
  );
});

test("does not choose another provider when Gemini is unavailable", () => {
  env.geminiApiKey = "";
  env.geminiModel = "gemini-test";
  assert.throws(
    () => routeTask("concept_explanation"),
    (error) => error.status === 503 && error.code === "GEMINI_NOT_CONFIGURED"
  );
});

test("rejects provider overrides other than Gemini", () => {
  env.geminiApiKey = "configured-for-test";
  env.geminiModel = "gemini-test";
  assert.throws(
    () => routeTask("concept_explanation", "other-provider"),
    (error) => error.status === 503 && error.code === "GEMINI_NOT_CONFIGURED"
  );
});
