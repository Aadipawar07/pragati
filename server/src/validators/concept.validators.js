import mongoose from "mongoose";

const allowedFields = new Set([
  "concept", "subjectId", "topicId", "mode", "language", "detailLevel",
  "includeExamples", "includeAnalogy", "includeExamAnswer"
]);
const modes = new Set(["beginner", "simple", "analogy", "technical", "exam", "interview", "example", "diagram", "revision"]);
const languages = new Set(["en", "mr", "hi"]);
const detailLevels = new Set(["short", "medium", "detailed"]);

export function validateConceptRequest(request, _response, next) {
  const input = request.body;
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return next(validationError("A JSON request body is required."));
  }
  const unknown = Object.keys(input).find((key) => !allowedFields.has(key));
  if (unknown) return next(validationError(`Unsupported field: ${unknown}.`));
  if (typeof input.concept !== "string" || !input.concept.trim() || input.concept.trim().length > 200) {
    return next(validationError("Concept must be between 1 and 200 characters."));
  }
  if (input.mode !== undefined && !modes.has(input.mode)) return next(validationError("Unsupported explanation mode."));
  if (input.language !== undefined && !languages.has(input.language)) return next(validationError("Language must be en, mr, or hi."));
  if (input.detailLevel !== undefined && !detailLevels.has(input.detailLevel)) return next(validationError("Detail level must be short, medium, or detailed."));
  for (const flag of ["includeExamples", "includeAnalogy", "includeExamAnswer"]) {
    if (input[flag] !== undefined && typeof input[flag] !== "boolean") return next(validationError(`${flag} must be a boolean.`));
  }
  for (const key of ["subjectId", "topicId"]) {
    if (input[key] !== undefined && (typeof input[key] !== "string" || !mongoose.Types.ObjectId.isValid(input[key]))) {
      return next(validationError(`${key} must be a valid identifier.`));
    }
  }
  if (input.topicId && !input.subjectId) return next(validationError("subjectId is required when topicId is supplied."));
  next();
}

function validationError(message) {
  const error = new Error(message);
  error.status = 400;
  error.code = "VALIDATION_ERROR";
  return error;
}
