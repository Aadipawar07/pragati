const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateSignup(request, _response, next) {
  const { name, email, password } = request.body || {};
  if (!name?.trim() || !email?.trim() || !password) {
    const error = new Error("Name, email, and password are required.");
    error.status = 400;
    error.code = "VALIDATION_ERROR";
    return next(error);
  }
  if (!emailPattern.test(email.trim()) || password.length < 8) {
    const error = new Error("Enter a valid email and a password of at least 8 characters.");
    error.status = 400;
    error.code = "VALIDATION_ERROR";
    return next(error);
  }
  next();
}

export function validateLogin(request, _response, next) {
  const { email, password } = request.body || {};
  if (!email?.trim() || !password) {
    const error = new Error("Email and password are required.");
    error.status = 400;
    error.code = "VALIDATION_ERROR";
    return next(error);
  }
  next();
}
