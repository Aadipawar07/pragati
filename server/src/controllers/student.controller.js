import {
  archiveStudentSubject,
  archiveStudentTopic,
  createStudentSubject,
  createStudentTopic,
  getProfile,
  getStudentContext,
  getStudentSubjects,
  updateProfile,
  updateStudentSubject,
  updateStudentTopic
} from "../services/studentContext.service.js";

export async function profile(request, response, next) {
  try {
    response.json({ success: true, data: { profile: await getProfile(request.user.id) } });
  } catch (error) {
    next(error);
  }
}

export async function patchProfile(request, response, next) {
  try {
    response.json({ success: true, data: { profile: await updateProfile(request.user.id, request.body || {}) } });
  } catch (error) {
    next(error);
  }
}

export async function context(request, response, next) {
  try {
    response.json({ success: true, data: await getStudentContext(request.user.id) });
  } catch (error) {
    next(error);
  }
}

export async function subjects(request, response, next) {
  try {
    response.json({ success: true, data: { subjects: await getStudentSubjects(request.user.id) } });
  } catch (error) {
    next(error);
  }
}

export async function createSubject(request, response, next) {
  try {
    response.status(201).json({ success: true, data: { subject: await createStudentSubject(request.user.id, request.body) } });
  } catch (error) {
    next(error);
  }
}

export async function patchSubject(request, response, next) {
  try {
    response.json({ success: true, data: { subject: await updateStudentSubject(request.user.id, request.params.subjectId, request.body) } });
  } catch (error) {
    next(error);
  }
}

export async function deleteSubject(request, response, next) {
  try {
    await archiveStudentSubject(request.user.id, request.params.subjectId);
    response.json({ success: true, data: { archived: true } });
  } catch (error) {
    next(error);
  }
}

export async function createTopic(request, response, next) {
  try {
    response.status(201).json({ success: true, data: { topic: await createStudentTopic(request.user.id, request.params.subjectId, request.body) } });
  } catch (error) {
    next(error);
  }
}

export async function patchTopic(request, response, next) {
  try {
    response.json({ success: true, data: { topic: await updateStudentTopic(request.user.id, request.params.topicId, request.body) } });
  } catch (error) {
    next(error);
  }
}

export async function deleteTopic(request, response, next) {
  try {
    await archiveStudentTopic(request.user.id, request.params.topicId);
    response.json({ success: true, data: { archived: true } });
  } catch (error) {
    next(error);
  }
}
