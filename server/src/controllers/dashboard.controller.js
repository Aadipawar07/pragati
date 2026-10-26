import { getDashboard } from "../services/dashboard.service.js";

export async function dashboard(request, response, next) {
  try {
    response.json({ success: true, data: await getDashboard(request.user.id) });
  } catch (error) {
    next(error);
  }
}
