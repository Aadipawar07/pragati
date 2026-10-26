import mongoose from "mongoose";
import { PracticeSession } from "../models/index.js";

const completedSessionMatch = { status: "completed" };
const gradedQuestion = { "questions.attempt.gradingStatus": "graded" };

const groupMetrics = {
  gradedQuestions: { $sum: { $cond: [{ $eq: ["$questions.attempt.gradingStatus", "graded"] }, 1, 0] } },
  correctAnswers: { $sum: { $cond: [{ $eq: ["$questions.attempt.isCorrect", true] }, 1, 0] } },
  incorrectAnswers: { $sum: { $cond: [{ $eq: ["$questions.attempt.isCorrect", false] }, 1, 0] } },
  determinateAnswers: { $sum: { $cond: [{ $in: ["$questions.attempt.isCorrect", [true, false]] }, 1, 0] } },
  marksEarned: {
    $sum: {
      $cond: [
        { $eq: ["$questions.attempt.gradingStatus", "graded"] },
        { $ifNull: ["$questions.attempt.awardedMarks", 0] },
        0
      ]
    }
  },
  maximumMarks: { $sum: "$questions.marks" }
};

const percentageProjection = {
  gradedQuestions: 1,
  correctAnswers: 1,
  incorrectAnswers: 1,
  determinateAnswers: 1,
  marksEarned: 1,
  maximumMarks: 1,
  accuracy: {
    $cond: [
      { $gt: ["$determinateAnswers", 0] },
      { $round: [{ $multiply: [{ $divide: ["$correctAnswers", "$determinateAnswers"] }, 100] }, 1] },
      null
    ]
  },
  scorePercentage: {
    $cond: [
      { $gt: ["$maximumMarks", 0] },
      { $round: [{ $multiply: [{ $divide: ["$marksEarned", "$maximumMarks"] }, 100] }, 1] },
      null
    ]
  }
};

function performanceGroup(groupId) {
  return [
    { $unwind: "$questions" },
    {
      $group: {
        _id: groupId,
        name: { $first: groupId === "$subjectId" ? "$subjectName" : "$questions.topicName" },
        sessions: { $addToSet: "$_id" },
        ...groupMetrics
      }
    },
    { $project: { _id: 1, name: 1, sessionCount: { $size: "$sessions" }, ...percentageProjection } },
    { $sort: { scorePercentage: 1, gradedQuestions: -1 } }
  ];
}

function summarizeGroups(groups) {
  return (groups || []).map((group) => {
    const scorePercentage = group.scorePercentage ?? null;
    const enoughEvidence = group.sessionCount >= 2 && group.gradedQuestions >= 3;
    return {
      id: group._id?.toString() || null,
      name: group.name,
      sessionCount: group.sessionCount,
      gradedQuestions: group.gradedQuestions,
      correctAnswers: group.correctAnswers,
      incorrectAnswers: group.incorrectAnswers,
      accuracy: group.accuracy ?? null,
      marksEarned: group.marksEarned,
      maximumMarks: group.maximumMarks,
      scorePercentage,
      evidenceState: !enoughEvidence ? "insufficient_data" : scorePercentage < 70 ? "needs_review" : "on_track",
      needsPractice: enoughEvidence && scorePercentage < 70
    };
  });
}

export function normalizePerformanceData(data = {}) {
  const totals = data.overall?.[0] || {};
  const completedAssessments = data.sessionCount?.[0]?.count || 0;
  const topics = summarizeGroups(data.topics);
  const subjects = summarizeGroups(data.subjects);
  const trends = (data.trends || []).map((item) => ({
    assessmentId: item._id.toString(),
    submittedAt: item.submittedAt,
    subject: item.subjectName,
    scorePercentage: item.scorePercentage
  }));
  const hasReliableTrend = trends.length >= 4;
  let trendDirection = "insufficient_data";
  let trendChangePercentagePoints = null;
  if (hasReliableTrend) {
    const midpoint = Math.floor(trends.length / 2);
    const average = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
    trendChangePercentagePoints = Math.round((average(trends.slice(midpoint).map((item) => item.scorePercentage)) - average(trends.slice(0, midpoint).map((item) => item.scorePercentage))) * 10) / 10;
    trendDirection = trendChangePercentagePoints > 3 ? "improving" : trendChangePercentagePoints < -3 ? "declining" : "stable";
  }

  return {
    completedAssessments,
    totalGradedQuestions: totals.gradedQuestions || 0,
    correctAnswers: totals.correctAnswers || 0,
    incorrectAnswers: totals.incorrectAnswers || 0,
    accuracy: totals.accuracy ?? null,
    marksEarned: totals.marksEarned || 0,
    maximumMarks: totals.maximumMarks || 0,
    scorePercentage: totals.scorePercentage ?? null,
    pendingEvaluations: data.pendingEvaluations?.[0]?.count || 0,
    subjects,
    topics,
    topicsNeedingPractice: topics.filter((topic) => topic.needsPractice),
    recurringMistakes: (data.recurringMistakes || []).map((item) => ({
      concept: item.concept,
      occurrences: item.occurrences,
      sessionCount: item.sessionCount,
      topics: item.topics
    })),
    trend: hasReliableTrend ? trends : [],
    trendState: hasReliableTrend ? "available" : "insufficient_data",
    trendDirection,
    trendChangePercentagePoints
  };
}

export async function getPerformanceSummary(userId) {
  const ownerId = new mongoose.Types.ObjectId(userId);
  const [result] = await PracticeSession.aggregate([
    { $match: { userId: ownerId } },
    {
      $facet: {
        sessionCount: [
          { $match: completedSessionMatch },
          { $count: "count" }
        ],
        overall: [
          { $match: completedSessionMatch },
          { $unwind: "$questions" },
          {
            $group: {
              _id: null,
              ...groupMetrics
            }
          },
          { $project: percentageProjection }
        ],
        subjects: [
          { $match: completedSessionMatch },
          ...performanceGroup("$subjectId")
        ],
        topics: [
          { $match: completedSessionMatch },
          { $unwind: "$questions" },
          { $match: { "questions.topicId": { $ne: null } } },
          {
            $group: {
              _id: "$questions.topicId",
              name: { $first: "$questions.topicName" },
              sessions: { $addToSet: "$_id" },
              ...groupMetrics
            }
          },
          { $project: { _id: 1, name: 1, sessionCount: { $size: "$sessions" }, ...percentageProjection } },
          { $sort: { scorePercentage: 1, gradedQuestions: -1 } }
        ],
        trends: [
          { $match: completedSessionMatch },
          { $unwind: "$questions" },
          {
            $group: {
              _id: "$_id",
              submittedAt: { $first: "$submittedAt" },
              subjectName: { $first: "$subjectName" },
              ...groupMetrics
            }
          },
          { $match: { gradedQuestions: { $gt: 0 }, maximumMarks: { $gt: 0 }, submittedAt: { $ne: null } } },
          {
            $project: {
              _id: 1,
              submittedAt: 1,
              subjectName: 1,
              scorePercentage: percentageProjection.scorePercentage
            }
          },
          { $sort: { submittedAt: -1 } },
          { $limit: 20 },
          { $sort: { submittedAt: 1 } }
        ],
        pendingEvaluations: [
          { $unwind: "$questions" },
          { $match: { "questions.attempt.gradingStatus": "pending" } },
          { $count: "count" }
        ],
        recurringMistakes: [
          { $match: completedSessionMatch },
          { $unwind: "$questions" },
          { $match: { "questions.attempt.gradingStatus": "graded" } },
          { $match: { "questions.topicId": { $ne: null } } },
          { $unwind: "$questions.attempt.missingConcepts" },
          {
            $group: {
              _id: { $toLower: { $trim: { input: "$questions.attempt.missingConcepts" } } },
              concept: { $first: "$questions.attempt.missingConcepts" },
              occurrences: { $sum: 1 },
              sessions: { $addToSet: "$_id" },
              topics: { $addToSet: "$questions.topicName" }
            }
          },
          { $addFields: { sessionCount: { $size: "$sessions" } } },
          { $match: { occurrences: { $gte: 2 }, sessionCount: { $gte: 2 } } },
          { $sort: { occurrences: -1 } },
          { $limit: 10 },
          { $project: { _id: 0, concept: 1, occurrences: 1, sessionCount: 1, topics: 1 } }
        ]
      }
    }
  ]);

  return normalizePerformanceData(result);
}
