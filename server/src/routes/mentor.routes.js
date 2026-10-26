import { Router } from "express";
import { mentor } from "../controllers/mentor.controller.js";
import authenticate from "../middleware/authenticate.js";
import { validateMentorRequest } from "../validators/mentor.validators.js";

const router = Router();
router.post("/", authenticate, validateMentorRequest, mentor);
export default router;
