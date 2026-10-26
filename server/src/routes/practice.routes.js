import { Router } from "express";
import authenticate from "../middleware/authenticate.js";
import { answerQuestion, createSession, getHistory, getResults, getSession, getTopics, submitSession } from "../controllers/practice.controller.js";
import { validateCreatePractice, validatePracticeAnswer, validateSessionId } from "../validators/practice.validators.js";

const router = Router();
router.use(authenticate);
router.get("/topics", getTopics);
router.post("/sessions", validateCreatePractice, createSession);
router.get("/sessions", getHistory);
router.get("/sessions/:sessionId/results", validateSessionId, getResults);
router.get("/sessions/:sessionId", validateSessionId, getSession);
router.post("/sessions/:sessionId/answers", validateSessionId, validatePracticeAnswer, answerQuestion);
router.post("/sessions/:sessionId/submit", validateSessionId, submitSession);
router.get("/history", getHistory);
export default router;
