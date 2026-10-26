import assert from "node:assert/strict";
import test from "node:test";
import { env } from "../src/config/env.js";
import { Profile } from "../src/models/index.js";
import { explainConcept } from "../src/services/concept.service.js";
import { validateConceptRequest } from "../src/validators/concept.validators.js";

const originalFetch = globalThis.fetch;
const originalEnv = { ...env };
const originalProfileFindOne = Profile.findOne;

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  Object.assign(env, originalEnv);
  Profile.findOne = originalProfileFindOne;
});

test("passes concept mode, language, detail, and content options to Gemini", async () => {
  env.geminiApiKey = "test-gemini-key";
  env.geminiModel = "gemini-test";
  Profile.findOne = () => ({ select: () => ({ lean: async () => null }) });
  const requestPrompts = [];
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    requestPrompts.push(body.contents[0].parts[0].text);
    return new Response(JSON.stringify({
      candidates: [{
        content: {
          parts: [{
            text: JSON.stringify({
              summary: "Cybersecurity protects systems, networks, and data from digital attacks.",
              explanation: [{ heading: "The idea", content: "It combines practices and technologies to reduce digital risk." }],
              keyPoints: ["Protect systems and information."],
              examples: ["Multi-factor authentication helps prevent account takeover."],
              analogy: null,
              examAnswer: null,
              commonMistakes: ["It is broader than installing antivirus software."],
              quickRevision: ["Protect, detect, and respond."],
              diagram: null
            })
          }]
        }
      }]
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  const inputs = [
    { mode: "simple", language: "en", detailLevel: "short", includeExamples: false, includeAnalogy: false, includeExamAnswer: false },
    { mode: "beginner", language: "en", detailLevel: "medium", includeExamples: true, includeAnalogy: false, includeExamAnswer: false },
    { mode: "technical", language: "en", detailLevel: "detailed", includeExamples: true, includeAnalogy: true, includeExamAnswer: true },
    { mode: "simple", language: "mr", detailLevel: "medium", includeExamples: false, includeAnalogy: false, includeExamAnswer: false }
  ];

  for (const input of inputs) {
    const result = await explainConcept(null, { concept: "cybersecurity", ...input });
    assert.equal(result.concept, "cybersecurity");
    assert.equal(result.mode, input.mode);
    assert.equal(result.language, input.language);
    assert.match(result.summary, /Cybersecurity protects systems/);
  }

  assert.equal(requestPrompts.length, inputs.length);
  assert.match(requestPrompts[0], /Mode: simple\./);
  assert.match(requestPrompts[0], /Detail level: short\./);
  assert.match(requestPrompts[0], /Include examples: false/);
  assert.match(requestPrompts[1], /Mode: beginner\. Start from foundational knowledge/);
  assert.match(requestPrompts[2], /Mode: technical\. Use accurate terminology/);
  assert.match(requestPrompts[2], /Include an exam answer: true/);
  assert.match(requestPrompts[3], /Language: Marathi/);
});

test("rejects malformed concept requests before invoking the service", () => {
  let validationError;
  validateConceptRequest({ body: { concept: " " } }, {}, (error) => { validationError = error; });
  assert.equal(validationError.status, 400);
  assert.equal(validationError.code, "VALIDATION_ERROR");
  assert.match(validationError.message, /Concept must be between 1 and 200 characters/);
});
