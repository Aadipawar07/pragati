import mongoose from "mongoose";
import { Profile, PracticeSession, Subject, Syllabus, Topic, Unit } from "../models/index.js";
import { generate } from "../ai/gateway.js";
import { buildEvaluationPrompt, buildQuestionPrompt } from "../prompts/practice.prompt.js";

export async function createPracticeSession(userId, input) {
  const [subject, topic, profile] = await Promise.all([
    Subject.findOne({ _id: input.subjectId, userId, status: "active" }).lean(),
    Topic.findOne({ _id: input.topicId, userId, subjectId: input.subjectId, status: "active" }).lean(),
    Profile.findOne({ userId }).select("preferredLanguage studyPreferences.preferredLanguages course semester").lean()
  ]);
  if (!subject || !topic) throw notFound("Subject or topic not found.");
  if (topic.syllabusId.toString() !== subject.syllabusId.toString()) throw notFound("Subject or topic not found.");

  const [syllabus, unit] = await Promise.all([
    Syllabus.findOne({ _id: topic.syllabusId, userId }).select("title status").lean(),
    topic.unitId ? Unit.findOne({ _id: topic.unitId, userId, subjectId: subject._id }).select("name").lean() : null
  ]);
  const mode = input.mode;
  const weakQuestions = mode === "weak_area" ? await loadWeakQuestions(userId, topic) : [];
  if (mode === "weak_area" && weakQuestions.length < 2) {
    const error = new Error("There is not enough recorded practice history for this topic yet. Complete more questions first.");
    error.status = 422;
    error.code = "INSUFFICIENT_PRACTICE_HISTORY";
    throw error;
  }
  const language = input.language || getLanguage(profile);
  const difficulty = input.difficulty || "medium";
  const count = input.questionCount || (mode === "quick_quiz" ? 5 : 10);
  const generated = await generate({
    task: "practice_question_generation",
    context: {
      profile: { course: profile?.course || null, semester: profile?.semester || null },
      syllabus: { title: syllabus?.title || null, subject: subject.name, topic: topic.name, description: topic.description || null, unit: unit?.name || null },
      mode,
      difficulty,
      language,
      weakQuestions
    },
    schema: (data) => validateQuestions(data, { count, mode, difficulty, topicName: topic.name, topicId: topic._id }),
    options: {
      prompt: buildQuestionPrompt({ subject, topic, mode, difficulty, count, language, weakQuestions }),
      timeoutMs: 30000
    },
    userId
  });
  const session = await PracticeSession.create({
    userId,
    subjectId: subject._id,
    topicId: topic._id,
    subjectName: subject.name,
    topicName: topic.name,
    mode,
    difficulty,
    language,
    questions: generated.structuredData
  });
  return sessionDTO(session);
}

export async function getPracticeSession(userId, sessionId) {
  const session = await PracticeSession.findOne({ _id: sessionId, userId }).select("+questions.correctOptionId +questions.expectedAnswer +questions.rubric").lean();
  if (!session) throw notFound("Practice session not found.");
  return sessionDTO(session);
}

export async function listPracticeTopics(userId) {
  const subjects = await Subject.find({ userId, status: "active" }).sort({ order: 1, createdAt: 1 }).lean();
  const topicGroups = await Topic.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), status: "active" } },
    { $sort: { order: 1, createdAt: 1 } },
    { $group: { _id: "$subjectId", topics: { $push: { id: "$_id", name: "$name" } } } }
  ]);
  const topicsBySubject = new Map(topicGroups.map((group) => [group._id.toString(), group.topics]));
  return subjects.map((subject) => ({
    id: subject._id.toString(),
    name: subject.name,
    topics: topicsBySubject.get(subject._id.toString()) || []
  }));
}

export async function getPracticeResults(userId, sessionId) {
  const session = await PracticeSession.findOne({ _id: sessionId, userId }).select("+questions.correctOptionId +questions.expectedAnswer +questions.rubric").lean();
  if (!session) throw notFound("Practice session not found.");
  if (session.status !== "completed") throw conflict("Practice results are available after session submission.");
  return resultsDTO(session);
}

export async function answerPracticeQuestion(userId, sessionId, { questionId, answer }) {
  const session = await PracticeSession.findOne({ _id: sessionId, userId }).select("+questions.correctOptionId +questions.expectedAnswer +questions.rubric");
  if (!session) throw notFound("Practice session not found.");
  if (session.status !== "in_progress") throw conflict("This practice session is already closed.");
  const question = session.questions.id(questionId);
  if (!question) throw notFound("Question does not belong to this practice session.");

  if (question.attempt?.gradingStatus === "graded") throw conflict("This question has already been answered.");
  if (question.attempt?.answer && question.attempt.answer !== answer.trim()) throw conflict("A pending answer cannot be changed.");
  if (!question.attempt?.answer) {
    const answeredAt = new Date();
    const reserved = await PracticeSession.updateOne(
      { _id: sessionId, userId, status: "in_progress", questions: { $elemMatch: { _id: questionId, "attempt.answeredAt": null } } },
      { $set: { "questions.$[item].attempt": { answer: answer.trim(), answeredAt, gradingStatus: "pending" } } },
      { arrayFilters: [{ "item._id": questionId, "item.attempt.answeredAt": null }] }
    );
    if (!reserved.modifiedCount) throw conflict("This question has already been answered or the session was closed.");
    question.attempt.answer = answer.trim();
    question.attempt.answeredAt = answeredAt;
    question.attempt.gradingStatus = "pending";
  }

  let grade;
  let gradingMethod;
  if (question.type === "mcq") {
    const isCorrect = answer.trim() === question.correctOptionId;
    grade = {
      awardedMarks: isCorrect ? question.marks : 0,
      feedback: isCorrect ? "Correct. " + question.explanation : "Not quite. Review the explanation and try this topic again.",
      missingConcepts: isCorrect ? [] : [question.topicName],
      suggestedNextStep: isCorrect ? "Continue to the next question." : `Review ${question.topicName} and retry a similar question.`
    };
    gradingMethod = "deterministic";
  } else {
    grade = await evaluateSubjectiveAnswer(userId, question, answer.trim());
    gradingMethod = "ai";
  }

  const isCorrect = question.type === "mcq" ? grade.awardedMarks === question.marks : grade.awardedMarks === question.marks ? true : null;
  const graded = await PracticeSession.updateOne(
    { _id: sessionId, userId, status: "in_progress", questions: { $elemMatch: { _id: questionId, "attempt.gradingStatus": "pending" } } },
    { $set: { "questions.$[item].attempt.isCorrect": isCorrect, "questions.$[item].attempt.awardedMarks": grade.awardedMarks, "questions.$[item].attempt.feedback": grade.feedback, "questions.$[item].attempt.missingConcepts": grade.missingConcepts, "questions.$[item].attempt.suggestedNextStep": grade.suggestedNextStep, "questions.$[item].attempt.gradingMethod": gradingMethod, "questions.$[item].attempt.gradingStatus": "graded" } },
    { arrayFilters: [{ "item._id": questionId, "item.attempt.gradingStatus": "pending" }] }
  );
  if (!graded.modifiedCount) throw conflict("The answer was already graded or the session was closed.");
  question.attempt.set({
    answer: answer.trim(),
    answeredAt: question.attempt.answeredAt || new Date(),
    gradingStatus: "graded",
    isCorrect,
    awardedMarks: grade.awardedMarks,
    feedback: grade.feedback,
    missingConcepts: grade.missingConcepts,
    suggestedNextStep: grade.suggestedNextStep,
    gradingMethod
  });
  return answerDTO(question);
}

export async function submitPracticeSession(userId, sessionId) {
  const session = await PracticeSession.findOne({ _id: sessionId, userId }).select("+questions.correctOptionId +questions.expectedAnswer +questions.rubric").lean();
  if (!session) throw notFound("Practice session not found.");
  if (session.status === "completed") return resultsDTO(session);
  if (session.status !== "in_progress") throw conflict("This practice session is closed.");
  if (session.questions.some((question) => question.attempt?.gradingStatus === "pending")) {
    throw conflict("One or more answers are still awaiting grading. Retry grading before submitting.");
  }
  const updated = await PracticeSession.findOneAndUpdate(
    { _id: sessionId, userId, status: "in_progress" },
    { $set: { status: "completed", submittedAt: new Date() } },
    { new: true }
  ).select("+questions.correctOptionId +questions.expectedAnswer +questions.rubric").lean();
  return resultsDTO(updated || session);
}

export async function listPracticeHistory(userId) {
  const sessions = await PracticeSession.find({ userId }).sort({ createdAt: -1 }).limit(30).lean();
  return sessions.map((session) => {
    const results = calculateResults(session);
    return {
      id: session._id.toString(),
      topic: session.topicName,
      subject: session.subjectName,
      mode: session.mode,
      status: session.status,
      createdAt: session.createdAt,
      ...results
    };
  });
}

async function evaluateSubjectiveAnswer(userId, question, answer) {
  const result = await generate({
    task: "practice_answer_evaluation",
    context: { prompt: question.prompt, expectedAnswer: question.expectedAnswer, rubric: question.rubric, maximumMarks: question.marks, studentAnswer: answer },
    schema: (data) => validateEvaluation(data, question.marks),
    options: { prompt: buildEvaluationPrompt({ question, answer }), timeoutMs: 30000 },
    userId
  });
  return result.structuredData;
}

function validateQuestions(data, { count, mode, difficulty, topicName, topicId }) {
  if (!data || !Array.isArray(data.questions) || data.questions.length !== count) throw invalidAIOutput("AI returned an invalid question set.");
  return data.questions.map((question) => {
    if (!question || !["mcq", "short_answer", "long_answer"].includes(question.type) || !validText(question.prompt, 1200) || !validText(question.expectedAnswer, 2000) || !validText(question.explanation, 1600) || !Number.isInteger(question.marks) || question.marks < 1 || question.marks > 10) throw invalidAIOutput("AI returned a malformed question.");
    if (!Array.isArray(question.rubric) || question.rubric.length > 10 || question.rubric.some((item) => !validText(item, 200))) throw invalidAIOutput("AI returned an invalid grading rubric.");
    if (mode === "mcq" && question.type !== "mcq") throw invalidAIOutput("AI returned a question that does not match the selected mode.");
    if (mode === "short_answer" && question.type !== "short_answer") throw invalidAIOutput("AI returned a question that does not match the selected mode.");
    if (mode === "long_answer" && question.type !== "long_answer") throw invalidAIOutput("AI returned a question that does not match the selected mode.");
    if (question.type === "mcq") {
      if (!Array.isArray(question.options) || question.options.length !== 4 || question.options.some((option) => !validText(option?.id, 8) || !validText(option?.text, 300)) || new Set(question.options.map((option) => option.id)).size !== 4 || !question.options.some((option) => option.id === question.correctOptionId)) throw invalidAIOutput("AI returned an invalid multiple-choice answer key.");
    } else if ((question.options || []).length || question.correctOptionId != null) {
      throw invalidAIOutput("Non-MCQ questions cannot contain multiple-choice answer keys.");
    }
    return {
      type: question.type,
      topicId,
      topicName,
      difficulty: difficulties.has(question.difficulty) ? question.difficulty : difficulty,
      prompt: question.prompt,
      options: question.type === "mcq" ? question.options : [],
      correctOptionId: question.type === "mcq" ? question.correctOptionId : null,
      expectedAnswer: question.expectedAnswer,
      rubric: question.rubric,
      explanation: question.explanation,
      marks: question.marks
    };
  });
}

function validateEvaluation(data, maximumMarks) {
  if (!data || !Number.isFinite(data.awardedMarks) || data.awardedMarks < 0 || data.awardedMarks > maximumMarks || !validText(data.feedback, 1600) || !Array.isArray(data.missingConcepts) || data.missingConcepts.length > 8 || data.missingConcepts.some((item) => !validText(item, 200)) || !validText(data.suggestedNextStep, 400)) throw invalidAIOutput("AI returned invalid practice feedback.");
  return { awardedMarks: data.awardedMarks, feedback: data.feedback, missingConcepts: data.missingConcepts, suggestedNextStep: data.suggestedNextStep };
}

async function loadWeakQuestions(userId, topic) {
  const sessions = await PracticeSession.find({
    userId,
    topicId: topic._id,
    status: "completed",
    questions: { $elemMatch: { "attempt.isCorrect": false } }
  }).sort({ submittedAt: -1 }).limit(10).select("questions.prompt questions.attempt.answer questions.attempt.isCorrect").lean();
  return sessions.flatMap((session) => session.questions.filter((question) => question.attempt?.isCorrect === false).map((question) => ({
    question: question.prompt,
    studentAnswer: question.attempt.answer
  }))).slice(0, 10);
}

function sessionDTO(session) {
  const questions = session.questions.map((question) => ({
    id: question._id.toString(),
    type: question.type,
    topicName: question.topicName,
    difficulty: question.difficulty,
    prompt: question.prompt,
    options: question.options || [],
    marks: question.marks,
    answered: Boolean(question.attempt?.answeredAt),
    gradingPending: question.attempt?.gradingStatus === "pending",
    ...(question.attempt?.answeredAt ? { submittedAnswer: question.attempt.answer } : {}),
    ...(question.attempt?.gradingStatus === "graded" ? { feedback: answerDTO(question) } : {})
  }));
  return {
    id: session._id.toString(),
    subject: session.subjectName,
    subjectId: session.subjectId.toString(),
    topic: session.topicName,
    topicId: session.topicId.toString(),
    mode: session.mode,
    difficulty: session.difficulty,
    language: session.language,
    status: session.status,
    questions,
    createdAt: session.createdAt
  };
}

function answerDTO(question) {
  return {
    questionId: question._id.toString(),
    isCorrect: question.attempt.isCorrect,
    awardedMarks: question.attempt.awardedMarks,
    maximumMarks: question.marks,
    feedback: question.attempt.feedback,
    correctAnswer: question.type === "mcq" ? question.options.find((option) => option.id === question.correctOptionId)?.text : question.expectedAnswer,
    explanation: question.explanation,
    missingConcepts: question.attempt.missingConcepts,
    suggestedNextStep: question.attempt.suggestedNextStep,
    gradingMethod: question.attempt.gradingMethod
  };
}

function resultsDTO(session) {
  return {
    id: session._id.toString(),
    subject: session.subjectName,
    subjectId: session.subjectId.toString(),
    topic: session.topicName,
    topicId: session.topicId.toString(),
    mode: session.mode,
    status: session.status,
    submittedAt: session.submittedAt,
    ...calculateResults(session),
    questions: session.questions.map((question) => ({
      id: question._id.toString(),
      topicId: question.topicId?.toString() || null,
      type: question.type,
      topicName: question.topicName,
      prompt: question.prompt,
      options: question.options,
      answer: question.attempt?.answer || null,
      isCorrect: question.attempt?.isCorrect ?? null,
      awardedMarks: question.attempt?.awardedMarks ?? null,
      maximumMarks: question.marks,
      feedback: question.attempt?.feedback || null,
      gradingStatus: question.attempt?.gradingStatus || null,
      correctAnswer: question.type === "mcq" ? question.options.find((option) => option.id === question.correctOptionId)?.text : question.expectedAnswer,
      explanation: question.explanation,
      missingConcepts: question.attempt?.missingConcepts || []
    }))
  };
}

function calculateResults(session) {
  const questions = session.questions || [];
  const graded = questions.filter((question) => question.attempt?.gradingStatus === "graded");
  const determinate = graded.filter((question) => question.attempt.isCorrect === true || question.attempt.isCorrect === false);
  const correct = determinate.filter((question) => question.attempt.isCorrect === true).length;
  const marksEarned = graded.reduce((sum, question) => sum + (question.attempt.awardedMarks || 0), 0);
  const maximumMarks = questions.reduce((sum, question) => sum + question.marks, 0);
  const topicGroups = new Map();
  for (const question of questions) {
    const group = topicGroups.get(question.topicName) || { topic: question.topicName, total: 0, graded: 0, determinable: 0, correct: 0, marksEarned: 0, maximumMarks: 0 };
    group.total += 1;
    group.maximumMarks += question.marks;
    if (question.attempt?.gradingStatus === "graded") {
      group.graded += 1;
      group.marksEarned += question.attempt.awardedMarks || 0;
      if (question.attempt.isCorrect === true || question.attempt.isCorrect === false) {
        group.determinable += 1;
        if (question.attempt.isCorrect) group.correct += 1;
      }
    }
    topicGroups.set(question.topicName, group);
  }
  const incorrectQuestions = graded.filter((question) => question.attempt.isCorrect === false || question.attempt.missingConcepts?.length);
  const topicResults = [...topicGroups.values()].map((group) => ({
    ...group,
    accuracy: group.determinable ? Math.round((group.correct / group.determinable) * 100) : null,
    followUpRecommended: group.determinable >= 3 && group.correct / group.determinable < 0.5
  }));
  return {
    totalQuestions: questions.length,
    answeredQuestions: questions.filter((question) => question.attempt?.answeredAt).length,
    gradedQuestions: graded.length,
    pendingGrading: questions.filter((question) => question.attempt?.gradingStatus === "pending").length,
    correctAnswers: correct,
    incorrectAnswers: determinate.filter((question) => question.attempt.isCorrect === false).length,
    marksEarned,
    maximumMarks,
    accuracy: determinate.length ? Math.round((correct / determinate.length) * 100) : null,
    topicResults,
    followUp: incorrectQuestions.length ? {
      incorrectQuestionIds: incorrectQuestions.map((question) => question._id.toString()),
      topic: incorrectQuestions[0].topicName,
      recommendation: `Review ${incorrectQuestions[0].topicName}, then retry the incorrect questions.`
    } : null
  };
}

const difficulties = new Set(["easy", "medium", "hard"]);
function getLanguage(profile) {
  const preferred = (profile?.preferredLanguage || profile?.studyPreferences?.preferredLanguages?.[0] || "").toLowerCase();
  if (preferred.startsWith("marathi")) return "mr";
  if (preferred.startsWith("hindi")) return "hi";
  return "en";
}

function validText(value, max) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}

function invalidAIOutput(message) {
  const error = new Error(message);
  error.status = 502;
  error.code = "AI_INVALID_OUTPUT";
  return error;
}

function notFound(message) {
  const error = new Error(message);
  error.status = 404;
  error.code = "PRACTICE_NOT_FOUND";
  return error;
}

function conflict(message) {
  const error = new Error(message);
  error.status = 409;
  error.code = "PRACTICE_SESSION_CONFLICT";
  return error;
}

export const practiceInternals = { calculateResults, validateQuestions, validateEvaluation };
