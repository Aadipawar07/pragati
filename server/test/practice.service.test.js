import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { practiceInternals } from "../src/services/practice.service.js";

const topicId = new mongoose.Types.ObjectId();
const mcq = {
  type: "mcq",
  prompt: "Which normal form removes partial dependencies?",
  options: [{ id: "a", text: "1NF" }, { id: "b", text: "2NF" }, { id: "c", text: "3NF" }, { id: "d", text: "BCNF" }],
  correctOptionId: "b",
  expectedAnswer: "Second Normal Form removes partial dependencies.",
  rubric: ["Identify 2NF"],
  explanation: "2NF removes partial dependencies.",
  marks: 1,
  difficulty: "easy"
};

test("validates generated MCQ answer keys against listed options", () => {
  const questions = practiceInternals.validateQuestions(
    { questions: [mcq] },
    { count: 1, mode: "mcq", difficulty: "medium", topicName: "Normalization", topicId }
  );
  assert.equal(questions[0].correctOptionId, "b");
  assert.equal(questions[0].topicId, topicId);
});

test("rejects malformed MCQs and mode mismatches", () => {
  assert.throws(
    () => practiceInternals.validateQuestions(
      { questions: [{ ...mcq, correctOptionId: "z" }] },
      { count: 1, mode: "mcq", difficulty: "medium", topicName: "Normalization", topicId }
    ),
    { code: "AI_INVALID_OUTPUT" }
  );
  assert.throws(
    () => practiceInternals.validateQuestions(
      { questions: [{ ...mcq, type: "short_answer" }] },
      { count: 1, mode: "mcq", difficulty: "medium", topicName: "Normalization", topicId }
    ),
    { code: "AI_INVALID_OUTPUT" }
  );
});

test("rejects subjective evaluation marks above the rubric maximum", () => {
  assert.throws(
    () => practiceInternals.validateEvaluation({
      awardedMarks: 4,
      feedback: "Good answer.",
      missingConcepts: [],
      suggestedNextStep: "Continue."
    }, 3),
    { code: "AI_INVALID_OUTPUT" }
  );
});

test("calculates results only from graded, determinable persisted attempts", () => {
  const results = practiceInternals.calculateResults({
    questions: [
      { _id: new mongoose.Types.ObjectId(), topicName: "Normalization", marks: 1, attempt: { gradingStatus: "graded", isCorrect: true, awardedMarks: 1 } },
      { _id: new mongoose.Types.ObjectId(), topicName: "Normalization", marks: 3, attempt: { gradingStatus: "graded", isCorrect: null, awardedMarks: 2, missingConcepts: ["partial dependency"] } },
      { _id: new mongoose.Types.ObjectId(), topicName: "Normalization", marks: 1, attempt: { gradingStatus: "pending", answeredAt: new Date() } }
    ]
  });
  assert.equal(results.correctAnswers, 1);
  assert.equal(results.incorrectAnswers, 0);
  assert.equal(results.accuracy, 100);
  assert.equal(results.marksEarned, 3);
  assert.equal(results.pendingGrading, 1);
  assert.equal(results.followUp.topic, "Normalization");
});
