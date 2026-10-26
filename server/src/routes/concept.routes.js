import { Router } from "express";
import authenticate from "../middleware/authenticate.js";
import { explain } from "../controllers/concept.controller.js";
import { validateConceptRequest } from "../validators/concept.validators.js";

const router = Router();
router.post("/explain", authenticate, validateConceptRequest, explain);
export default router;
