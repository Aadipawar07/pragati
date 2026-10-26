import { getCurrentUser, signIn, signUp } from "../services/auth.service.js";

export async function signup(request, response, next) {
  try {
    response.status(201).json({ success: true, data: await signUp({
      name: request.body.name,
      email: request.body.email,
      password: request.body.password
    }) });
  } catch (error) {
    next(error);
  }
}

export async function login(request, response, next) {
  try {
    response.json({ success: true, data: await signIn(request.body) });
  } catch (error) {
    next(error);
  }
}

export async function me(request, response, next) {
  try {
    response.json({ success: true, data: { user: await getCurrentUser(request.user.id) } });
  } catch (error) {
    next(error);
  }
}
