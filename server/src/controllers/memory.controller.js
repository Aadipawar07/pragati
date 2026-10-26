import {
  archiveMemoryItem,
  createMemoryItem,
  createMemoryItemFromPractice,
  getDueMemoryItems,
  getMemoryItem,
  getMemorySummary,
  listMemoryItems,
  listMemoryReviews,
  listMemoryTopics,
  submitMemoryReview,
  updateMemoryItem
} from "../services/memory.service.js";

export async function getTopics(request, response, next) {
  try {
    response.json({ success: true, data: await listMemoryTopics(request.user.id) });
  } catch (error) {
    next(error);
  }
}

export async function createItem(request, response, next) {
  try {
    response.status(201).json({ success: true, data: await createMemoryItem(request.user.id, request.body) });
  } catch (error) {
    next(error);
  }
}

export async function createItemFromPractice(request, response, next) {
  try {
    const { sessionId, questionId } = request.body;
    response.json({
      success: true,
      data: await createMemoryItemFromPractice(request.user.id, sessionId, questionId)
    });
  } catch (error) {
    next(error);
  }
}

export async function getItems(request, response, next) {
  try {
    response.json({ success: true, data: await listMemoryItems(request.user.id, {
      status: request.query.status || "active",
      topicId: request.query.topicId,
      ...request.memoryPagination
    }) });
  } catch (error) {
    next(error);
  }
}

export async function getItem(request, response, next) {
  try {
    response.json({ success: true, data: await getMemoryItem(request.user.id, request.params.itemId) });
  } catch (error) {
    next(error);
  }
}

export async function patchItem(request, response, next) {
  try {
    response.json({ success: true, data: await updateMemoryItem(request.user.id, request.params.itemId, request.body) });
  } catch (error) {
    next(error);
  }
}

export async function deleteItem(request, response, next) {
  try {
    response.json({ success: true, data: await archiveMemoryItem(request.user.id, request.params.itemId) });
  } catch (error) {
    next(error);
  }
}

export async function getDue(request, response, next) {
  try {
    response.json({ success: true, data: await getDueMemoryItems(request.user.id, { limit: request.memoryLimit || 50 }) });
  } catch (error) {
    next(error);
  }
}

export async function postReview(request, response, next) {
  try {
    response.json({ success: true, data: await submitMemoryReview(request.user.id, request.params.itemId, request.body) });
  } catch (error) {
    next(error);
  }
}

export async function getReviews(request, response, next) {
  try {
    response.json({ success: true, data: await listMemoryReviews(request.user.id, {
      ...request.memoryPagination,
      memoryItemId: request.query.memoryItemId
    }) });
  } catch (error) {
    next(error);
  }
}

export async function getSummary(request, response, next) {
  try {
    response.json({ success: true, data: await getMemorySummary(request.user.id) });
  } catch (error) {
    next(error);
  }
}
