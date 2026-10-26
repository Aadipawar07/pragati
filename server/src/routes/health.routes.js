import { Router } from "express";
import mongoose from "mongoose";

const router = Router();
router.get("/health", (_request, response) => {
  const database = mongoose.connection.readyState === 1 ? "connected" : "not_configured";
  response.json({ success: true, service: "pragati-api", message: "Pragati API is running.", database });
});

export default router;
