import { Router } from "express";
import { dashboard } from "../controllers/dashboard.controller.js";
import authenticate from "../middleware/authenticate.js";

const router = Router();
router.get("/", authenticate, dashboard);
export default router;
