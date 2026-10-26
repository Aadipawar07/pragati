const candidateIdPattern = /^(?:memory_review|practice_session|practice|diagnostic|roadmap_item|career_project|career_goal):[a-f\d]{24}(?::[a-f\d]{8})?$/i;

export function validateNextActionId(request, _response, next) {
  if (typeof request.params.candidateId !== "string" || !candidateIdPattern.test(request.params.candidateId)) {
    const error = new Error("A valid recommendation ID is required.");
    error.status = 400;
    error.code = "VALIDATION_ERROR";
    return next(error);
  }
  next();
}
