import bcrypt from "bcryptjs";
import { Profile, User } from "../models/index.js";
import { generateToken } from "../utils/jwt.js";

const publicUser = (user, profile) => ({
  id: user._id.toString(),
  name: profile?.name || "",
  email: user.email
});

const normalizeEmail = (email) => email.trim().toLowerCase();

export async function signUp({ name, email, password }) {
  const normalizedEmail = normalizeEmail(email);
  const existingUser = await User.findOne({ email: normalizedEmail }).select("+passwordHash");
  if (existingUser) {
    const error = new Error("An account with this email already exists.");
    error.status = 409;
    error.code = "EMAIL_ALREADY_REGISTERED";
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ email: normalizedEmail, passwordHash });
  const profile = await Profile.create({ userId: user._id, name: name.trim() });

  return { user: publicUser(user, profile), token: generateToken(user._id) };
}

export async function signIn({ email, password }) {
  const user = await User.findOne({ email: normalizeEmail(email) }).select("+passwordHash");
  const validPassword = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !validPassword) {
    const error = new Error("Invalid email or password.");
    error.status = 401;
    error.code = "INVALID_CREDENTIALS";
    throw error;
  }

  const profile = await Profile.findOne({ userId: user._id }).select("name");
  return { user: publicUser(user, profile), token: generateToken(user._id) };
}

export async function getCurrentUser(userId) {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error("Authentication required.");
    error.status = 401;
    error.code = "AUTHENTICATION_REQUIRED";
    throw error;
  }
  const profile = await Profile.findOne({ userId }).select("name");
  return publicUser(user, profile);
}
