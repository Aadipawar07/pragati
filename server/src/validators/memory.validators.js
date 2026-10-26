import mongoose from "mongoose";

const ratings = new Set(["again", "hard", "good", "easy"]);
const memoryTypes = new Set(["concept", "definition", "formula", "process", "example", "question"]);

export function validateCreateMemoryItem(request, _response, next) {
  const body = request.body;
  if (!isObject(body) || !onlyKeys(body, ["front", "back", "topicId", "memoryType"])) return next(error("Invalid memory item request."));
  if (!validText(body.front, 1200) || !validText(body.back, 3000)) return next(error("front and back are required within the supported length limits."));
  if (body.topicId !== undefined && !isId(body.topicId)) return next(error("topicId must be a valid ID."));
  if (body.memoryType !== undefined && !memoryTypes.has(body.memoryType)) return next(error("Unsupported memory item type."));
  next();
}

export function validateCreateMemoryItemFromPractice(request, _response, next) {
  const body = request.body;
  if (!isObject(body) || !onlyKeys(body, ["sessionId", "questionId"]) || !isId(body.sessionId) || !isId(body.questionId)) {
    return next(error("A valid practice session ID and question ID are required."));
  }
  next();
}

export function validateListMemoryItems(request, _response, next) {
  if (request.query.topicId && !isId(request.query.topicId)) return next(error("topicId must be a valid ID."));
  if (request.query.status && !["active", "suspended", "archived"].includes(request.query.status)) return next(error("Unsupported memory item status filter."));
  const pagination = validatePagination(request.query, next);
  if (!pagination) return;
  request.memoryPagination = pagination;
  next();
}

export function validateMemoryId(request, _response, next) {
  if (!isId(request.params.itemId)) return next(error("A valid memory item ID is required."));
  next();
}

export function validateMemoryUpdate(request, _response, next) {
  const body = request.body;
  if (!isObject(body) || !Object.keys(body).length || !onlyKeys(body, ["front", "back", "memoryType", "status"])) return next(error("Invalid memory item update."));
  if (body.front !== undefined && !validText(body.front, 1200)) return next(error("front must contain 1 to 1200 characters."));
  if (body.back !== undefined && !validText(body.back, 3000)) return next(error("back must contain 1 to 3000 characters."));
  if (body.memoryType !== undefined && !memoryTypes.has(body.memoryType)) return next(error("Unsupported memory item type."));
  if (body.status !== undefined && !["active", "suspended", "archived"].includes(body.status)) return next(error("Unsupported memory item status."));
  next();
}

export function validateMemoryReview(request, _response, next) {
  const body = request.body;
  if (!isObject(body) || !onlyKeys(body, ["rating", "requestId"])) return next(error("rating and requestId are required."));
  if (!ratings.has(body.rating)) return next(error("rating must be again, hard, good, or easy."));
  if (typeof body.requestId !== "string" || !/^[\w-]{16,128}$/.test(body.requestId)) return next(error("A unique requestId of 16 to 128 safe characters is required."));
  next();
}

export function validateReviewHistory(request, _response, next) {
  if (request.query.memoryItemId && !isId(request.query.memoryItemId)) return next(error("memoryItemId must be a valid ID."));
  const pagination = validatePagination(request.query, next);
  if (!pagination) return;
  request.memoryPagination = pagination;
  next();
}

export function validateDueLimit(request, _response, next) {
  if (request.query.limit === undefined) return next();
  const limit = Number(request.query.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) return next(error("limit must be between 1 and 100."));
  request.memoryLimit = limit;
  next();
}

function validatePagination(query, next) {
  const page = query.page === undefined ? 1 : Number(query.page);
  const limit = query.limit === undefined ? 30 : Number(query.limit);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    next(error("page must be positive and limit must be between 1 and 100."));
    return null;
  }
  return { page, limit };
}

function validText(value, maximum) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maximum;
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function onlyKeys(object, allowed) {
  return Object.keys(object).every((key) => allowed.includes(key));
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
