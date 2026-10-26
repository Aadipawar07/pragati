import { Router } from "express";
import { login, me, signup } from "../controllers/auth.controller.js";
import authenticate from "../middleware/authenticate.js";
import { validateLogin, validateSignup } from "../validators/auth.validators.js";

const router = Router();
router.post("/signup", validateSignup, signup);
router.post("/login", validateLogin, login);
router.get("/me", authenticate, me);

export default router;
