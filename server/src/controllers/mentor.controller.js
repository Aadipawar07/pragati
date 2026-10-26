import { askMentor } from "../services/mentor.service.js";

export async function mentor(request, response, next) {
  try {
    response.json({ success: true, data: await askMentor(request.user.id, request.body.message.trim()) });
  } catch (error) {
    next(error);
  }
}
