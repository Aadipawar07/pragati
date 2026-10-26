import assert from "node:assert/strict";
import test from "node:test";
import { initialSchedule, scheduleReview } from "../src/services/memoryScheduler.service.js";

test("new items are due immediately with the documented initial ease", () => {
  const now = new Date("2026-10-26T22:30:00.000Z");
  assert.deepEqual(initialSchedule(now), {
    repetitionCount: 0,
    intervalDays: 0,
    easeFactor: 2.3,
    nextReviewAt: now
  });
});

test("Again resets the repetition count and schedules a one-day retry", () => {
  const now = new Date("2026-10-26T23:30:00.000Z");
  const next = scheduleReview({ repetitionCount: 4, intervalDays: 14, easeFactor: 2.3 }, "again", now);
  assert.equal(next.repetitionCount, 0);
  assert.equal(next.intervalDays, 1);
  assert.equal(next.easeFactor, 1.76);
  assert.equal(next.nextReviewAt.toISOString(), "2026-10-27T23:30:00.000Z");
});

test("Hard increases the schedule conservatively", () => {
  const next = scheduleReview({ repetitionCount: 1, intervalDays: 3, easeFactor: 2.3 }, "hard", new Date("2026-10-26T12:00:00Z"));
  assert.equal(next.repetitionCount, 2);
  assert.equal(next.intervalDays, 4);
  assert.equal(next.easeFactor, 2.16);
});

test("Good uses graduated intervals and caps the ease factor", () => {
  const first = scheduleReview({ repetitionCount: 0, intervalDays: 0, easeFactor: 2.3 }, "good", new Date("2026-10-26T12:00:00Z"));
  assert.equal(first.intervalDays, 1);
  assert.equal(first.repetitionCount, 1);

  const later = scheduleReview({ repetitionCount: 2, intervalDays: 100, easeFactor: 3 }, "good", new Date("2026-10-26T12:00:00Z"));
  assert.equal(later.intervalDays, 300);
  assert.equal(later.easeFactor, 3);
});

test("Easy increases intervals more aggressively within the maximum bound", () => {
  const first = scheduleReview({ repetitionCount: 0, intervalDays: 0, easeFactor: 2.3 }, "easy", new Date("2026-10-26T12:00:00Z"));
  assert.equal(first.intervalDays, 3);
  assert.equal(first.repetitionCount, 1);
  assert.equal(first.easeFactor, 2.4);

  const capped = scheduleReview({ repetitionCount: 5, intervalDays: 365, easeFactor: 3 }, "easy", new Date("2026-10-26T12:00:00Z"));
  assert.equal(capped.intervalDays, 365);
  assert.equal(capped.easeFactor, 3);
});

test("rejects invalid ratings", () => {
  assert.throws(
    () => scheduleReview({ repetitionCount: 0, intervalDays: 0, easeFactor: 2.3 }, "perfect"),
    (error) => error.status === 400 && error.code === "INVALID_MEMORY_RATING"
  );
});
