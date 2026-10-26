import { Router } from "express";
import authenticate from "../middleware/authenticate.js";
import {
  addSkillEvidence,
  analysis,
  context,
  createGoal,
  deleteGoal,
  goals,
  patchGoal,
  patchProject,
  paths,
  projects,
  recalculate,
  roadmap,
  roadmapItem,
  skills,
  startProject
} from "../controllers/career.controller.js";
import {
  validateCareerGoal,
  validateCareerGoalPatch,
  validateCareerId,
  validateCareerProjectId,
  validateCareerProjectStart,
  validateCareerProjectUpdate,
  validateCareerRoadmapItem,
  validateCareerSkillEvidence
} from "../validators/career.validators.js";

const router = Router();
router.use(authenticate);
router.get("/paths", paths);
router.get("/context", context);
router.get("/goals", goals);
router.post("/goals", validateCareerGoal, createGoal);
router.patch("/goals/:goalId", validateCareerId, validateCareerGoalPatch, patchGoal);
router.delete("/goals/:goalId", validateCareerId, deleteGoal);
router.get("/goals/:goalId/analysis", validateCareerId, analysis);
router.get("/goals/:goalId/roadmap", validateCareerId, roadmap);
router.post("/goals/:goalId/recalculate", validateCareerId, recalculate);
router.get("/goals/:goalId/projects", validateCareerId, projects);
router.post("/goals/:goalId/projects", validateCareerId, validateCareerProjectStart, startProject);
router.patch("/roadmap/items/:itemId", validateCareerRoadmapItem, roadmapItem);
router.get("/skills", skills);
router.post("/skills", validateCareerSkillEvidence, addSkillEvidence);
router.patch("/projects/:projectId", validateCareerProjectId, validateCareerProjectUpdate, patchProject);
export default router;
