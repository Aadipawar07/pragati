import { explainConcept } from "../services/concept.service.js";

export async function explain(request, response, next) {
  try {
    const explanation = await explainConcept(request.user.id, request.body);
    response.json({ success: true, data: explanation });
  } catch (error) {
    next(error);
  }
}
