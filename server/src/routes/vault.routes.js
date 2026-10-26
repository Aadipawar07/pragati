import { Router } from "express";
import multer from "multer";
import authenticate from "../middleware/authenticate.js";
import { env } from "../config/env.js";
import { deleteDocumentById, getDocumentById, getDocuments, uploadDocument } from "../controllers/vault.controller.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxDocumentSizeMb * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => {
    const isPdf = file.mimetype === "application/pdf" && file.originalname.toLowerCase().endsWith(".pdf");
    callback(isPdf ? null : Object.assign(new Error("Only PDF files are supported."), { status: 415, code: "UNSUPPORTED_DOCUMENT_TYPE" }), isPdf);
  }
});

const router = Router();
router.use(authenticate);
function parseUpload(request, response, next) {
  upload.single("file")(request, response, (error) => {
    if (error?.code === "LIMIT_FILE_SIZE") {
      error.status = 413;
      error.code = "DOCUMENT_TOO_LARGE";
    }
    next(error);
  });
}

router.post("/documents", parseUpload, (request, _response, next) => {
  if (!request.file) {
    const error = new Error("A PDF file is required.");
    error.status = 400;
    error.code = "DOCUMENT_FILE_REQUIRED";
    return next(error);
  }
  if (request.file.buffer.subarray(0, 5).toString() !== "%PDF-") {
    const error = new Error("The uploaded file is not a valid PDF.");
    error.status = 415;
    error.code = "INVALID_PDF";
    return next(error);
  }
  next();
}, uploadDocument);
router.get("/documents", getDocuments);
router.get("/documents/:id", getDocumentById);
router.delete("/documents/:id", deleteDocumentById);

export default router;
