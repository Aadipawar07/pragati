import { dismissNextAction, getNextActions } from "../services/nextAction.service.js";

export async function nextActions(request, response, next) {
  try {
    response.json({ success: true, data: await getNextActions(request.user.id) });
  } catch (error) {
    next(error);
  }
}

export async function dismissNextActionController(request, response, next) {
  try {
    response.json({ success: true, data: await dismissNextAction(request.user.id, request.params.candidateId) });
  } catch (error) {
    next(error);
  }
}
