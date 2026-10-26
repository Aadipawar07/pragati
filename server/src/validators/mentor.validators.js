export function validateMentorRequest(request, _response, next) {
  if (!request.body || typeof request.body !== "object" || Array.isArray(request.body) ||
      Object.keys(request.body).some((key) => key !== "message") ||
      typeof request.body.message !== "string" ||
      !request.body.message.trim() ||
      request.body.message.length > 2000) {
    const error = new Error("A mentor message of 1 to 2000 characters is required.");
    error.status = 400;
    error.code = "VALIDATION_ERROR";
    return next(error);
  }
  next();
}
