import { Router } from "express";
import authenticate from "../middleware/authenticate.js";
import {
  createItem,
  createItemFromPractice,
  deleteItem,
  getDue,
  getItem,
  getItems,
  getReviews,
  getSummary,
  getTopics,
  patchItem,
  postReview
} from "../controllers/memory.controller.js";
import {
  validateCreateMemoryItem,
  validateCreateMemoryItemFromPractice,
  validateDueLimit,
  validateListMemoryItems,
  validateMemoryId,
  validateMemoryReview,
  validateMemoryUpdate,
  validateReviewHistory
} from "../validators/memory.validators.js";

const router = Router();
router.use(authenticate);
router.get("/topics", getTopics);
router.get("/due", validateDueLimit, getDue);
router.get("/summary", getSummary);
router.get("/reviews", validateReviewHistory, getReviews);
router.post("/items", validateCreateMemoryItem, createItem);
router.post("/items/from-practice", validateCreateMemoryItemFromPractice, createItemFromPractice);
router.get("/items", validateListMemoryItems, getItems);
router.get("/items/:itemId", validateMemoryId, getItem);
router.patch("/items/:itemId", validateMemoryId, validateMemoryUpdate, patchItem);
router.delete("/items/:itemId", validateMemoryId, deleteItem);
router.post("/items/:itemId/review", validateMemoryId, validateMemoryReview, postReview);
export default router;
