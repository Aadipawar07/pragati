import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function generateToken(userId) {
  if (!env.jwtSecret) {
    const error = new Error("JWT authentication is not configured.");
    error.status = 503;
    error.code = "AUTH_NOT_CONFIGURED";
    throw error;
  }

  return jwt.sign({ sub: userId.toString() }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

export function verifyToken(token) {
  if (!env.jwtSecret) {
    const error = new Error("JWT authentication is not configured.");
    error.status = 503;
    error.code = "AUTH_NOT_CONFIGURED";
    throw error;
  }

  return jwt.verify(token, env.jwtSecret);
}
