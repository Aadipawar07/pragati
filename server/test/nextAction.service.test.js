import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { Action, CareerProject, MemoryItem, PracticeSession, Roadmap, RoadmapItem, Subject, Topic } from "../src/models/index.js";
import { dismissNextAction, getNextActions, rankNextActionCandidates } from "../src/services/nextAction.service.js";
import { validateNextActionId } from "../src/validators/nextAction.validators.js";

const userId = new mongoose.Types.ObjectId().toString();
const now = new Date("2026-10-26T00:00:00.000Z");

function mockMethod(object, name, implementation, originals) {
  originals.push([object, name, object[name]]);
  object[name] = implementation;
}

function restoreMethods(originals) {
  for (const [object, name, original] of originals) object[name] = original;
}

function candidate(overrides = {}) {
  return {
    id: "task:000000000000000000000001",
    candidateKey: "task:000000000000000000000001",
    title: "Study topic",
    reason: "A real unfinished task.",
    confidence: "high",
    baseScore: 20,
    deadlineTime: Number.MAX_SAFE_INTEGER,
    ...overrides
  };
}

function emptyContext() {
  return {
    profile: null,
    academic: { syllabus: null, subjects: [] },
    roadmap: null,
    performance: { state: "available", topics: [], topicsNeedingPractice: [], recurringMistakes: [] },
    memory: { state: "available", activeItems: 0, dueItems: 0, overdueItems: 0 },
    career: { state: "no_goal", goal: null, priorityGap: null, projects: [] },
    capabilities: { knowledge: "unavailable", examIntelligence: "unavailable" }
  };
}

function installEmptySourceMocks(originals, { dueItem = null, untestedTopic = null, subject = null, dismissedKeys = [] } = {}) {
  mockMethod(Action, "find", () => ({
    select() { return this; },
    lean: async () => dismissedKeys.map((candidateKey) => ({ candidateKey }))
  }), originals);
  mockMethod(MemoryItem, "findOne", () => ({
    select() { return this; },
    sort() { return this; },
    lean: async () => dueItem
  }), originals);
  mockMethod(MemoryItem, "countDocuments", async () => dueItem ? 1 : 0, originals);
  mockMethod(PracticeSession, "find", () => ({
    select() { return this; },
    sort() { return this; },
    limit() { return this; },
    lean: async () => []
  }), originals);
  mockMethod(Topic, "findOne", () => ({
    select() { return this; },
    sort() { return this; },
    lean: async () => untestedTopic
  }), originals);
  mockMethod(Subject, "findOne", () => ({
    select() { return this; },
    lean: async () => subject
  }), originals);
  mockMethod(Roadmap, "find", () => ({
    select() { return this; },
    sort() { return this; },
    limit() { return this; },
    lean: async () => []
  }), originals);
  mockMethod(CareerProject, "findOne", () => ({
    select() { return this; },
    sort() { return this; },
    lean: async () => null
  }), originals);
  mockMethod(RoadmapItem, "find", () => ({
    select() { return this; },
    sort() { return this; },
    limit() { return this; },
    lean: async () => []
  }), originals);
}

test("returns no action rather than fabricating a task when no candidates exist", async () => {
  const originals = [];
  let writes = 0;
  installEmptySourceMocks(originals);
  mockMethod(Action, "findOneAndUpdate", async () => { writes += 1; }, originals);

  try {
    const result = await getNextActions(userId, { context: emptyContext(), now });
    assert.equal(result.state, "no_action");
    assert.equal(result.primary, null);
    assert.deepEqual(result.alternatives, []);
    assert.equal(result.availability.state, "not_provided");
    assert.equal(writes, 0);
  } finally {
    restoreMethods(originals);
  }
});

test("ranks reliable exam preparation above an overdue memory workload", () => {
  const candidates = [
    candidate({
      id: "memory_review:000000000000000000000002",
      candidateKey: "memory_review:000000000000000000000002",
      baseScore: 20,
      overdueCount: 5
    }),
    candidate({
      id: "practice:000000000000000000000003",
      candidateKey: "practice:000000000000000000000003",
      type: "practice",
      baseScore: 20,
      deadline: new Date("2026-10-28T00:00:00.000Z"),
      deadlineSource: "exam",
      deadlineTime: new Date("2026-10-28T00:00:00.000Z").getTime(),
      needsReview: true,
      repeatedMistakes: true
    })
  ];
  const ranked = rankNextActionCandidates(candidates, now);
  assert.equal(ranked[0].type, "practice");
  assert.equal(ranked[0].priorityScore, 95);
  assert.equal(ranked[1].priorityScore, 35);
  assert.match(ranked[0].rankingReasons.join(" "), /exam date/i);
  assert.match(ranked[0].rankingReasons.join(" "), /repeated mistakes/i);
});

test("does not upgrade an untested diagnostic to a confirmed skill gap", () => {
  const [ranked] = rankNextActionCandidates([
    candidate({ type: "diagnostic", confidence: "low", reason: "No graded attempts are recorded." })
  ], now);
  assert.equal(ranked.confidence, "low");
  assert.equal(ranked.priorityScore, 20);
  assert.match(ranked.reason, /No graded attempts/);
});

test("creates a low-confidence diagnostic only for a real untested syllabus topic", async () => {
  const originals = [];
  const topic = {
    _id: new mongoose.Types.ObjectId(),
    subjectId: new mongoose.Types.ObjectId(),
    syllabusId: new mongoose.Types.ObjectId(),
    name: "Normalization"
  };
  installEmptySourceMocks(originals, {
    untestedTopic: topic,
    subject: { _id: topic.subjectId }
  });

  try {
    const result = await getNextActions(userId, {
      context: {
        ...emptyContext(),
        academic: {
          syllabus: { _id: topic.syllabusId, examDate: null },
          subjects: []
        }
      },
      now
    });
    assert.ok(result.primary, JSON.stringify({ unavailableSources: result.unavailableSources, state: result.state, message: result.message }));
    assert.equal(result.primary.type, "diagnostic");
    assert.equal(result.primary.confidence, "low");
    assert.equal(result.primary.navigation.topicId, topic._id.toString());
    assert.match(result.primary.reason, /not a claim that you are weak/i);
  } finally {
    restoreMethods(originals);
  }
});

test("ranking uses stable candidate IDs to break otherwise equal ties", () => {
  const items = [
    candidate({ id: "study:b", candidateKey: "study:b" }),
    candidate({ id: "study:a", candidateKey: "study:a" })
  ];
  assert.deepEqual(
    rankNextActionCandidates(items, now).map((item) => item.id),
    rankNextActionCandidates(items, now).map((item) => item.id)
  );
  assert.equal(rankNextActionCandidates(items, now)[0].id, "study:a");
});

test("stores only an explicit dismissal for the authenticated student's available action", async () => {
  const originals = [];
  const dueItem = {
    _id: new mongoose.Types.ObjectId(),
    nextReviewAt: new Date("2026-10-25T00:00:00.000Z")
  };
  let update;
  const dismissedKeys = [];
  installEmptySourceMocks(originals, { dueItem, dismissedKeys });
  mockMethod(Action, "findOneAndUpdate", async (...args) => {
    update = args;
    dismissedKeys.push(args[0].candidateKey);
  }, originals);

  try {
    const result = await getNextActions(userId, { context: emptyContext(), now });
    assert.equal(result.state, "available");
    assert.equal(result.primary.type, "memory_review");
    const dismissed = await dismissNextAction(userId, result.primary.id, { context: emptyContext(), now });
    assert.equal(dismissed.dismissed, true);
    assert.equal(update[0].userId, userId);
    assert.equal(update[0].candidateKey, result.primary.candidateKey);
    assert.equal(update[1].$set.status, "dismissed");
    assert.equal(update[1].$set.context.source, "next_action_engine");
    const nextRead = await getNextActions(userId, { context: emptyContext(), now });
    assert.equal(nextRead.primary, null);
  } finally {
    restoreMethods(originals);
  }
});

test("validates candidate IDs before dismissal endpoints", () => {
  let error;
  validateNextActionId({ params: { candidateId: "practice:0123456789abcdef01234567:0123abcd" } }, {}, (value) => { error = value; });
  assert.equal(error, undefined);
  validateNextActionId({ params: { candidateId: "../../other-student" } }, {}, (value) => { error = value; });
  assert.equal(error.status, 400);
});
