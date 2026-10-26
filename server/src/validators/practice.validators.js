import mongoose from "mongoose";

const modes = new Set(["mcq", "short_answer", "long_answer", "conceptual", "application", "quick_quiz", "topic_revision", "weak_area"]);
const difficulties = new Set(["easy", "medium", "hard"]);

export function validateCreatePractice(request, _response, next) {
  const body = request.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) return next(error("A JSON request body is required."));
  if (Object.keys(body).some((key) => !["subjectId", "topicId", "mode", "difficulty", "questionCount", "language"].includes(key))) return next(error("Unsupported practice session field."));
  if (!isId(body.subjectId) || !isId(body.topicId)) return next(error("Valid subjectId and topicId are required."));
  if (!modes.has(body.mode)) return next(error("Unsupported practice mode."));
  if (body.difficulty !== undefined && !difficulties.has(body.difficulty)) return next(error("Difficulty must be easy, medium, or hard."));
  if (body.questionCount !== undefined && (!Number.isInteger(body.questionCount) || body.questionCount < 1 || body.questionCount > 20)) return next(error("Question count must be between 1 and 20."));
  if (body.language !== undefined && !["en", "mr", "hi"].includes(body.language)) return next(error("Language must be en, mr, or hi."));
  next();
}

export function validatePracticeAnswer(request, _response, next) {
  const body = request.body;
  if (!body || Object.keys(body).some((key) => !["questionId", "answer"].includes(key))) return next(error("questionId and answer are required."));
  if (!isId(body.questionId)) return next(error("A valid questionId is required."));
  if (typeof body.answer !== "string" || !body.answer.trim() || body.answer.length > 5000) return next(error("Answer must be between 1 and 5000 characters."));
  next();
}

export function validateSessionId(request, _response, next) {
  if (!isId(request.params.sessionId)) return next(error("A valid sessionId is required."));
  next();
}

function isId(value) {
  return typeof value === "string" && mongoose.Types.ObjectId.isValid(value);
}

function error(message) {
  const result = new Error(message);
  result.status = 400;
  result.code = "VALIDATION_ERROR";
  return result;
}
