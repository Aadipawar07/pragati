import { Router } from "express";
import {
  context,
  createSubject,
  createTopic,
  deleteSubject,
  deleteTopic,
  patchProfile,
  patchSubject,
  patchTopic,
  profile,
  subjects
} from "../controllers/student.controller.js";
import authenticate from "../middleware/authenticate.js";
import { validateProfilePatch } from "../validators/student.validators.js";
import { validateStudySubject, validateStudyTopic, validateStudySubjectId, validateStudyTopicId } from "../validators/study.validators.js";

const router = Router();
router.use(authenticate);
router.get("/profile", profile);
router.patch("/profile", validateProfilePatch, patchProfile);
router.get("/context", context);
router.get("/subjects", subjects);
router.post("/subjects", validateStudySubject, createSubject);
router.patch("/subjects/:subjectId", validateStudySubjectId, validateStudySubject, patchSubject);
router.delete("/subjects/:subjectId", validateStudySubjectId, deleteSubject);
router.post("/subjects/:subjectId/topics", validateStudySubjectId, validateStudyTopic, createTopic);
router.patch("/topics/:topicId", validateStudyTopicId, validateStudyTopic, patchTopic);
router.delete("/topics/:topicId", validateStudyTopicId, deleteTopic);

export default router;
