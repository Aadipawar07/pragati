import { Router } from "express";
import authRoutes from "./auth.routes.js";
import healthRoutes from "./health.routes.js";
import studentRoutes from "./student.routes.js";
import dashboardRoutes from "./dashboard.routes.js";
import mentorRoutes from "./mentor.routes.js";
import vaultRoutes from "./vault.routes.js";
import conceptRoutes from "./concept.routes.js";
import practiceRoutes from "./practice.routes.js";
import memoryRoutes from "./memory.routes.js";
import careerRoutes from "./career.routes.js";
import nextActionRoutes from "./nextAction.routes.js";

const router = Router();
router.use(healthRoutes);
router.use("/auth", authRoutes);
router.use("/student", studentRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/mentor", mentorRoutes);
router.use("/vault", vaultRoutes);
router.use("/concepts", conceptRoutes);
router.use("/practice", practiceRoutes);
router.use("/memory", memoryRoutes);
router.use("/career", careerRoutes);
router.use("/next-action", nextActionRoutes);

export default router;
