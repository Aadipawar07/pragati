import { Router } from "express";
import authenticate from "../middleware/authenticate.js";
import { dismissNextActionController, nextActions } from "../controllers/nextAction.controller.js";
import { validateNextActionId } from "../validators/nextAction.validators.js";

const router = Router();
router.use(authenticate);
router.get("/", nextActions);
router.post("/:candidateId/dismiss", validateNextActionId, dismissNextActionController);
export default router;
