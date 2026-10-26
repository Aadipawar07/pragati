import assert from "node:assert/strict";
import test from "node:test";
import {
  validateCreateMemoryItem,
  validateCreateMemoryItemFromPractice,
  validateMemoryId,
  validateMemoryReview
} from "../src/validators/memory.validators.js";

function runValidation(validator, request) {
  let result;
  validator(request, {}, (error) => { result = error || null; });
  return result;
}

test("validates memory item content and rejects invalid topic IDs", () => {
  assert.equal(runValidation(validateCreateMemoryItem, {
    body: { front: "Recall prompt", back: "Expected answer" }
  }), null);
  assert.equal(runValidation(validateCreateMemoryItem, {
    body: { front: "Prompt", back: "Answer", topicId: "not-an-object-id" }
  }).status, 400);
});

test("validates practice-to-memory source identifiers and rejects extra client fields", () => {
  const body = { sessionId: "507f1f77bcf86cd799439011", questionId: "507f1f77bcf86cd799439012" };
  assert.equal(runValidation(validateCreateMemoryItemFromPractice, { body }), null);
  assert.equal(runValidation(validateCreateMemoryItemFromPractice, {
    body: { ...body, front: "client supplied answer" }
  }).status, 400);
  assert.equal(runValidation(validateCreateMemoryItemFromPractice, {
    body: { sessionId: "not-an-id", questionId: body.questionId }
  }).status, 400);
});

test("rejects invalid ratings, malformed IDs, and client scheduler fields", () => {
  assert.equal(runValidation(validateMemoryReview, {
    body: { rating: "perfect", requestId: "memory-request-0001" }
  }).status, 400);
  assert.equal(runValidation(validateMemoryReview, {
    body: { rating: "good", requestId: "memory-request-0001", intervalDays: 999 }
  }).status, 400);
  assert.equal(runValidation(validateMemoryId, {
    params: { itemId: "bad-id" }
  }).status, 400);
});
