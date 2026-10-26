import assert from "node:assert/strict";
import test from "node:test";
import { getPerformanceSummary, normalizePerformanceData } from "../src/services/performance.service.js";
import { PracticeSession } from "../src/models/index.js";

test("returns an honest empty performance summary", () => {
  const summary = normalizePerformanceData();
  assert.equal(summary.completedAssessments, 0);
  assert.equal(summary.totalGradedQuestions, 0);
  assert.equal(summary.accuracy, null);
  assert.equal(summary.scorePercentage, null);
  assert.deepEqual(summary.topicsNeedingPractice, []);
  assert.equal(summary.trendState, "insufficient_data");
  assert.deepEqual(summary.trend, []);
});

test("requires repeated evidence before recommending topic practice", () => {
  const summary = normalizePerformanceData({
    sessionCount: [{ count: 3 }],
    overall: [{ gradedQuestions: 5, correctAnswers: 2, accuracy: 40, marksEarned: 4, maximumMarks: 10, scorePercentage: 40 }],
    topics: [
      { _id: "weak-topic", name: "Normalization", sessionCount: 2, gradedQuestions: 4, correctAnswers: 1, accuracy: 25, marksEarned: 2, maximumMarks: 8, scorePercentage: 25 },
      { _id: "single-attempt", name: "Transactions", sessionCount: 1, gradedQuestions: 1, correctAnswers: 0, accuracy: 0, marksEarned: 0, maximumMarks: 2, scorePercentage: 0 }
    ]
  });

  assert.deepEqual(summary.topicsNeedingPractice.map((topic) => topic.name), ["Normalization"]);
  assert.equal(summary.topics[1].evidenceState, "insufficient_data");
});

test("reports trends only with enough actual assessments", () => {
  const trendItem = (id, score) => ({
    _id: id,
    submittedAt: new Date(`2026-01-0${id}T00:00:00.000Z`),
    subjectName: "Mathematics",
    scorePercentage: score
  });
  const summary = normalizePerformanceData({
    sessionCount: [{ count: 4 }],
    trends: [trendItem("1", 40), trendItem("2", 50), trendItem("3", 70), trendItem("4", 80)]
  });

  assert.equal(summary.trendState, "available");
  assert.equal(summary.trendDirection, "improving");
  assert.equal(summary.trendChangePercentagePoints, 30);
  assert.equal(summary.trend.length, 4);
});

test("loads only the requested student's persisted performance", async () => {
  const userId = "64f000000000000000000001";
  const originalAggregate = PracticeSession.aggregate;
  let pipeline;
  PracticeSession.aggregate = async (stages) => {
    pipeline = stages;
    return [{
      sessionCount: [{ count: 1 }],
      overall: [{ gradedQuestions: 1, correctAnswers: 1, incorrectAnswers: 0, accuracy: 100, marksEarned: 1, maximumMarks: 1, scorePercentage: 100 }],
      pendingEvaluations: [{ count: 0 }]
    }];
  };

  try {
    const summary = await getPerformanceSummary(userId);
    assert.equal(pipeline[0].$match.userId.toString(), userId);
    assert.ok(pipeline[1].$facet.topics);
    assert.equal(summary.completedAssessments, 1);
    assert.equal(summary.accuracy, 100);
  } finally {
    PracticeSession.aggregate = originalAggregate;
  }
});
