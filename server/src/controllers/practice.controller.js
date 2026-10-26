import {
  answerPracticeQuestion,
  createPracticeSession,
  getPracticeResults,
  getPracticeSession,
  listPracticeTopics,
  listPracticeHistory,
  submitPracticeSession
} from "../services/practice.service.js";

export async function createSession(request, response, next) {
  try {
    response.status(201).json({ success: true, data: await createPracticeSession(request.user.id, request.body) });
  } catch (error) {
    next(error);
  }
}

export async function getSession(request, response, next) {
  try {
    response.json({ success: true, data: await getPracticeSession(request.user.id, request.params.sessionId) });
  } catch (error) {
    next(error);
  }
}

export async function answerQuestion(request, response, next) {
  try {
    response.json({ success: true, data: await answerPracticeQuestion(request.user.id, request.params.sessionId, request.body) });
  } catch (error) {
    next(error);
  }
}

export async function submitSession(request, response, next) {
  try {
    response.json({ success: true, data: await submitPracticeSession(request.user.id, request.params.sessionId) });
  } catch (error) {
    next(error);
  }
}

export async function getHistory(request, response, next) {
  try {
    response.json({ success: true, data: await listPracticeHistory(request.user.id) });
  } catch (error) {
    next(error);
  }
}

export async function getTopics(request, response, next) {
  try {
    response.json({ success: true, data: await listPracticeTopics(request.user.id) });
  } catch (error) {
    next(error);
  }
}

export async function getResults(request, response, next) {
  try {
    response.json({ success: true, data: await getPracticeResults(request.user.id, request.params.sessionId) });
  } catch (error) {
    next(error);
  }
}
