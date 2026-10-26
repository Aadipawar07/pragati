import { getDocument, ingestDocument, listDocuments, removeDocument } from "../services/vault.service.js";

export async function uploadDocument(request, response, next) {
  try {
    const document = await ingestDocument({ userId: request.user.id, file: request.file, subject: request.body.subject, topic: request.body.topic });
    response.status(201).json({ success: true, data: document });
  } catch (error) {
    next(error);
  }
}

export async function getDocuments(request, response, next) {
  try {
    response.json({ success: true, data: await listDocuments(request.user.id) });
  } catch (error) {
    next(error);
  }
}

export async function getDocumentById(request, response, next) {
  try {
    const document = await getDocument(request.user.id, request.params.id);
    if (!document) {
      const error = new Error("Document not found.");
      error.status = 404;
      error.code = "DOCUMENT_NOT_FOUND";
      throw error;
    }
    response.json({ success: true, data: document });
  } catch (error) {
    next(error);
  }
}

export async function deleteDocumentById(request, response, next) {
  try {
    const deleted = await removeDocument(request.user.id, request.params.id);
    if (!deleted) {
      const error = new Error("Document not found.");
      error.status = 404;
      error.code = "DOCUMENT_NOT_FOUND";
      throw error;
    }
    response.json({ success: true, data: { id: request.params.id } });
  } catch (error) {
    next(error);
  }
}
