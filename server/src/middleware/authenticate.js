import { verifyToken } from "../utils/jwt.js";

export default function authenticate(request, _response, next) {
  const header = request.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) {
    const error = new Error("Authentication required.");
    error.status = 401;
    error.code = "AUTHENTICATION_REQUIRED";
    return next(error);
  }

  try {
    const payload = verifyToken(token);
    if (!payload.sub) throw new Error("Invalid token.");
    request.user = { id: payload.sub };
    next();
  } catch (error) {
    if (error.code === "AUTH_NOT_CONFIGURED") return next(error);
    const authError = new Error("Authentication required.");
    authError.status = 401;
    authError.code = "INVALID_TOKEN";
    next(authError);
  }
}
