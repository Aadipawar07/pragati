import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { MemoryItem, MemoryReview, PracticeSession } from "../src/models/index.js";
import { archiveMemoryItem, createMemoryItem, createMemoryItemFromPractice, getDueMemoryItems, submitMemoryReview } from "../src/services/memory.service.js";

const userId = new mongoose.Types.ObjectId().toString();
const itemId = new mongoose.Types.ObjectId();

function mockMethod(object, name, implementation, originals) {
  originals.push([object, name, object[name]]);
  object[name] = implementation;
}

function restoreMethods(originals) {
  for (const [object, name, original] of originals) object[name] = original;
}

test("persists a self-reported review once and returns the same result on retry", async () => {
  const originals = [];
  const item = {
    _id: itemId,
    userId: new mongoose.Types.ObjectId(userId),
    topicId: null,
    status: "active",
    repetitionCount: 0,
    intervalDays: 0,
    easeFactor: 2.3,
    nextReviewAt: new Date("2026-10-26T00:00:00Z"),
    schedulerRevision: 0,
    lastReviewRequest: null
  };
  let storedReview = null;
  let schedulerWrites = 0;
  mockMethod(MemoryReview, "findOne", () => ({ lean: async () => storedReview }), originals);
  mockMethod(MemoryItem, "findOne", () => ({ lean: async () => item }), originals);
  mockMethod(MemoryItem, "updateOne", async (_filter, update) => {
    schedulerWrites += 1;
    Object.assign(item, update.$set);
    item.schedulerRevision += update.$inc.schedulerRevision;
    return { modifiedCount: 1 };
  }, originals);
  mockMethod(MemoryReview, "findOneAndUpdate", (_filter, update) => {
    storedReview = {
      _id: new mongoose.Types.ObjectId(),
      memoryItemId: itemId,
      userId: new mongoose.Types.ObjectId(userId),
      wasCorrect: null,
      ...update.$setOnInsert
    };
    return { lean: async () => storedReview };
  }, originals);

  try {
    const request = { rating: "good", requestId: "memory-review-request-001" };
    const now = new Date("2026-10-26T12:00:00Z");
    const first = await submitMemoryReview(userId, itemId.toString(), request, { now });
    const retried = await submitMemoryReview(userId, itemId.toString(), request, { now });

    assert.equal(first.selfReported, true);
    assert.equal(first.wasCorrect, null);
    assert.equal(first.nextIntervalDays, 1);
    assert.equal(retried.id, first.id);
    assert.equal(retried.idempotent, true);
    assert.equal(schedulerWrites, 1);
  } finally {
    restoreMethods(originals);
  }
});

test("rejects access to a memory item not owned by the requesting student", async () => {
  const originals = [];
  mockMethod(MemoryReview, "findOne", () => ({ lean: async () => null }), originals);
  mockMethod(MemoryItem, "findOne", () => ({ lean: async () => null }), originals);

  try {
    await assert.rejects(
      submitMemoryReview(userId, itemId.toString(), { rating: "good", requestId: "memory-review-request-002" }),
      (error) => error.status === 404 && error.code === "NOT_FOUND"
    );
  } finally {
    restoreMethods(originals);
  }
});

test("creates a manual item and initial schedule without an AI provider", async () => {
  const originals = [];
  let created;
  mockMethod(MemoryItem, "create", async (document) => {
    created = {
      _id: itemId,
      ...document,
      createdAt: new Date("2026-10-26T00:00:00Z"),
      updatedAt: new Date("2026-10-26T00:00:00Z")
    };
    return created;
  }, originals);

  try {
    const result = await createMemoryItem(userId, { front: "Recall this", back: "Remember that" });
    assert.equal(result.front, "Recall this");
    assert.equal(result.back, undefined);
    assert.equal(created.sourceType, "manual");
    assert.equal(created.repetitionCount, 0);
    assert.equal(created.intervalDays, 0);
  } finally {
    restoreMethods(originals);
  }
});

test("creates a practice memory item from an owned completed, graded question and is idempotent", async () => {
  const originals = [];
  const questionId = new mongoose.Types.ObjectId();
  const practiceSession = {
    _id: new mongoose.Types.ObjectId(),
    topicId: new mongoose.Types.ObjectId(),
    questions: [{
      _id: questionId,
      type: "mcq",
      topicId: null,
      prompt: "Which layer routes packets?",
      options: [{ id: "a", text: "Application" }, { id: "b", text: "Network" }],
      correctOptionId: "b",
      explanation: "Routers operate at the network layer.",
      attempt: { gradingStatus: "graded" }
    }]
  };
  let created;
  mockMethod(PracticeSession, "findOne", () => ({
    select() { return this; },
    lean: async () => practiceSession
  }), originals);
  mockMethod(MemoryItem, "findOne", () => ({ lean: async () => created }), originals);
  mockMethod(MemoryItem, "create", async (document) => {
    created = { _id: itemId, ...document, createdAt: new Date(), updatedAt: new Date() };
    return created;
  }, originals);

  try {
    const first = await createMemoryItemFromPractice(userId, practiceSession._id.toString(), questionId.toString());
    const retried = await createMemoryItemFromPractice(userId, practiceSession._id.toString(), questionId.toString());

    assert.equal(first.id, retried.id);
    assert.equal(first.front, "Which layer routes packets?");
    assert.equal(created.back, "Network\n\nRouters operate at the network layer.");
    assert.equal(created.topicId.toString(), practiceSession.topicId.toString());
    assert.equal(created.sourceType, "practice_question");
    assert.equal(created.sourceId.toString(), questionId.toString());
  } finally {
    restoreMethods(originals);
  }
});

test("does not create practice memory items from ungraded questions", async () => {
  const originals = [];
  const questionId = new mongoose.Types.ObjectId();
  const practiceSession = {
    questions: [{ _id: questionId, attempt: { gradingStatus: "pending" } }]
  };
  mockMethod(PracticeSession, "findOne", () => ({
    select() { return this; },
    lean: async () => practiceSession
  }), originals);

  try {
    await assert.rejects(
      createMemoryItemFromPractice(userId, new mongoose.Types.ObjectId().toString(), questionId.toString()),
      (error) => error.status === 404 && error.code === "NOT_FOUND"
    );
  } finally {
    restoreMethods(originals);
  }
});

test("due queue queries only active owned items and archives by owner", async () => {
  const originals = [];
  const filters = [];
  const archived = { _id: itemId, status: "archived" };
  mockMethod(MemoryItem, "find", (filter) => {
    filters.push(filter);
    return {
      select() { return this; },
      sort() { return this; },
      limit() { return this; },
      lean: async () => []
    };
  }, originals);
  mockMethod(MemoryItem, "countDocuments", async (filter) => {
    filters.push(filter);
    return filter.nextReviewAt?.$lt ? 1 : 2;
  }, originals);
  mockMethod(MemoryItem, "findOneAndUpdate", (filter, update) => {
    filters.push(filter);
    assert.equal(update.$set.status, "archived");
    return { lean: async () => archived };
  }, originals);

  try {
    const due = await getDueMemoryItems(userId, { now: new Date("2026-10-26T12:00:00Z") });
    const result = await archiveMemoryItem(userId, itemId.toString());
    assert.equal(due.dueCount, 2);
    assert.equal(due.overdueCount, 1);
    assert.ok(filters.every((filter) => filter.userId?.toString() === userId));
    assert.equal(result.status, "archived");
  } finally {
    restoreMethods(originals);
  }
});
