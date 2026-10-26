import mongoose from "mongoose";
import { getCareerPath, getCareerSkill } from "../config/careerCatalog.js";

const goalFields = new Set([
  "title", "careerPathId", "category", "experienceLevel", "preferredIndustries",
  "shortTermGoal", "longTermGoal", "availableHoursPerWeek", "targetMilestone",
  "preferredProjectTypes", "existingExperience", "deadline", "status", "description"
]);
const createGoalFields = new Set([
  "title", "careerPathId", "category", "experienceLevel", "preferredIndustries",
  "shortTermGoal", "longTermGoal", "availableHoursPerWeek", "targetMilestone",
  "preferredProjectTypes", "existingExperience", "deadline"
]);
const experienceLevels = new Set(["exploring", "beginner", "intermediate", "experienced"]);
const goalStatuses = new Set(["active", "completed", "paused"]);

export function validateCareerGoal(request, _response, next) {
  const body = request.body;
  if (!isObject(body) || !onlyKeys(body, createGoalFields) || !validText(body.title, 120)) return next(error("A career goal title of 1 to 120 characters is required."));
  const invalid = validateCareerFields(body, true);
  if (invalid) return next(error(invalid));
  next();
}

export function validateCareerGoalPatch(request, _response, next) {
  const body = request.body;
  if (!isObject(body) || !Object.keys(body).length || !onlyKeys(body, goalFields)) return next(error("Invalid career goal update."));
  if (body.title !== undefined && !validText(body.title, 120)) return next(error("title must contain 1 to 120 characters."));
  if (body.description !== undefined && !validText(body.description, 500)) return next(error("description must contain 1 to 500 characters."));
  const invalid = validateCareerFields(body, false);
  if (invalid) return next(error(invalid));
  next();
}

export function validateCareerId(request, _response, next) {
  if (!isId(request.params.goalId)) return next(error("A valid career goal ID is required."));
  next();
}

export function validateCareerSkillEvidence(request, _response, next) {
  const body = request.body;
  if (!isObject(body) || !onlyKeys(body, ["skillId", "source", "detail"])) return next(error("Invalid skill evidence request."));
  if (typeof body.skillId !== "string" || !getCareerSkill(body.skillId)) return next(error("Choose a skill from the configured career catalog."));
  if (!["self_reported", "learning", "practice"].includes(body.source)) return next(error("Skill evidence must be self-reported, learning, or practice."));
  if (body.detail !== undefined && !validText(body.detail, 500)) return next(error("detail must contain 1 to 500 characters."));
  next();
}

export function validateCareerProjectStart(request, _response, next) {
  const body = request.body;
  if (!isObject(body) || !onlyKeys(body, ["templateId"]) || !validText(body.templateId, 100)) return next(error("A valid project suggestion ID is required."));
  next();
}

export function validateCareerProjectUpdate(request, _response, next) {
  const body = request.body;
  if (!isObject(body) || !Object.keys(body).length || !onlyKeys(body, ["status", "completionEvidence", "repositoryUrl"])) return next(error("Invalid career project update."));
  if (body.status !== undefined && !["in_progress", "completed", "planned"].includes(body.status)) return next(error("Unsupported project status."));
  if (body.completionEvidence !== undefined && !validText(body.completionEvidence, 1000)) return next(error("completionEvidence must contain 1 to 1000 characters."));
  if (body.repositoryUrl !== undefined && body.repositoryUrl !== "" && !validUrl(body.repositoryUrl)) return next(error("repositoryUrl must be a valid HTTP or HTTPS URL."));
  if (body.status === "completed" && !validCompletionEvidence(body.completionEvidence)) return next(error("A completion note of at least 20 characters is required to record this project."));
  next();
}

export function validateCareerProjectId(request, _response, next) {
  if (!isId(request.params.projectId)) return next(error("A valid project ID is required."));
  next();
}

export function validateCareerRoadmapItem(request, _response, next) {
  if (!isId(request.params.itemId)) return next(error("A valid roadmap item ID is required."));
  if (!isObject(request.body) || !onlyKeys(request.body, ["status"]) || !["pending", "in_progress", "completed"].includes(request.body.status)) {
    return next(error("A supported career roadmap item status is required."));
  }
  next();
}

function validateCareerFields(body, isCreate) {
  if (body.careerPathId !== undefined && body.careerPathId !== "" && !getCareerPath(body.careerPathId)) return "careerPathId must refer to a configured career path.";
  if (body.experienceLevel !== undefined && !experienceLevels.has(body.experienceLevel)) return "Unsupported experienceLevel.";
  if (body.status !== undefined && !goalStatuses.has(body.status)) return "Unsupported career goal status.";
  if (body.availableHoursPerWeek !== undefined && body.availableHoursPerWeek !== null &&
      (!Number.isFinite(body.availableHoursPerWeek) || body.availableHoursPerWeek < 1 || body.availableHoursPerWeek > 112)) {
    return "availableHoursPerWeek must be between 1 and 112.";
  }
  for (const field of ["category", "shortTermGoal", "longTermGoal", "targetMilestone", "existingExperience", "description"]) {
    const maximum = field === "existingExperience" ? 1000
      : field === "shortTermGoal" || field === "longTermGoal" || field === "description" ? 500
        : field === "category" ? 80 : 200;
    if (body[field] !== undefined && body[field] !== "" && !validText(body[field], maximum)) {
      return `${field} exceeds its supported length.`;
    }
  }
  for (const field of ["preferredIndustries", "preferredProjectTypes"]) {
    if (body[field] !== undefined && (!Array.isArray(body[field]) || body[field].length > 10 || body[field].some((value) => !validText(value, 80)))) {
      return `${field} must contain at most 10 non-empty values of 80 characters or fewer.`;
    }
  }
  if (body.deadline !== undefined && body.deadline !== null && body.deadline !== "") {
    const date = new Date(body.deadline);
    if (typeof body.deadline !== "string" || Number.isNaN(date.getTime())) return "deadline must be a valid date string.";
  }
  if (isCreate && body.title?.trim().length < 2) return "title must contain at least 2 characters.";
  return null;
}

function validText(value, maximum) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maximum;
}

function validCompletionEvidence(value) {
  return validText(value, 1000) && value.trim().length >= 20;
}

function validUrl(value) {
  if (typeof value !== "string" || value.length > 500) return false;
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function onlyKeys(object, allowed) {
  return Object.keys(object).every((key) => allowed instanceof Set ? allowed.has(key) : allowed.includes(key));
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
