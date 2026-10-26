const subjectFields = new Set(["name", "code", "description"]);
const topicFields = new Set(["name", "description"]);
const objectIdPattern = /^[a-f\d]{24}$/i;

function invalid(message, code = "VALIDATION_ERROR") {
  const error = new Error(message);
  error.status = 400;
  error.code = code;
  return error;
}

function validateFields(request, fields, label) {
  const body = request.body || {};
  const invalidField = Object.keys(body).find((field) => !fields.has(field));
  if (invalidField) return invalid(`Unsupported ${label} field.`);
  for (const [field, value] of Object.entries(body)) {
    if (typeof value !== "string" || value.trim().length > (field === "description" ? 1000 : 120)) {
      return invalid(`${field} must be a string within the allowed length.`);
    }
  }
  if (request.method === "POST" && !body.name?.trim()) return invalid(`${label} name is required.`);
  if (request.method === "PATCH" && !Object.keys(body).length) return invalid(`Provide at least one ${label} field to update.`);
  return null;
}

export function validateStudySubject(request, _response, next) {
  const error = validateFields(request, subjectFields, "subject");
  if (error) return next(error);
  next();
}

export function validateStudyTopic(request, _response, next) {
  const error = validateFields(request, topicFields, "topic");
  if (error) return next(error);
  next();
}

export function validateStudySubjectId(request, _response, next) {
  if (!objectIdPattern.test(request.params.subjectId || "")) return next(invalid("Subject was not found.", "NOT_FOUND"));
  next();
}

export function validateStudyTopicId(request, _response, next) {
  if (!objectIdPattern.test(request.params.topicId || "")) return next(invalid("Topic was not found.", "NOT_FOUND"));
  next();
}
