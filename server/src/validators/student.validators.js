const allowedFields = new Set([
  "name", "college", "course", "year", "semester", "batch",
  "preferredLanguage", "studyPreferences", "availability",
  "careerPreferences", "onboardingComplete", "goals"
]);

export function validateProfilePatch(request, _response, next) {
  const body = request.body || {};
  const invalidField = Object.keys(body).find((field) => !allowedFields.has(field) && field !== "userId");
  if (invalidField || Object.prototype.hasOwnProperty.call(body, "userId")) {
    const error = new Error("The profile contains an unsupported field.");
    error.status = 400;
    error.code = "INVALID_PROFILE_FIELD";
    return next(error);
  }
  next();
}
