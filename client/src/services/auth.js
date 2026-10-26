const TOKEN_KEY = "pragati.auth-token";

async function request(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { ...(isFormData ? {} : { "Content-Type": "application/json" }), ...(options.headers || {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error?.message || "Authentication request failed.");
    error.code = payload.error?.code;
    throw error;
  }
  return payload.data;
}

export const authService = {
  async signIn({ email, password }) {
    if (!email || !password) {
      throw new Error("Email and password are required.");
    }

    const data = await request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    window.localStorage.setItem(TOKEN_KEY, data.token);
    return data;
  },

  async signUp({ fullName, email, password }) {
    if (!fullName || !email || !password) {
      throw new Error("Please complete all signup fields.");
    }

    const data = await request("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name: fullName, email, password }),
    });
    window.localStorage.setItem(TOKEN_KEY, data.token);
    return data;
  },

  async getCurrentUser() {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    const data = await request("/auth/me", { headers: { Authorization: `Bearer ${token}` } });
    return data.user;
  },

  async updateStudentProfile(profile) {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Authentication required.");
    const data = await request("/student/profile", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(profile),
    });
    return data.profile;
  },

  async getStudentContext() {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Authentication required.");
    const data = await request("/student/context", { headers: { Authorization: `Bearer ${token}` } });
    return data;
  },

  async getStudentSubjects() {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Authentication required.");
    return request("/student/subjects", { headers: authHeaders(token) });
  },

  async createStudentSubject(input) {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Authentication required.");
    return request("/student/subjects", { method: "POST", headers: authHeaders(token), body: JSON.stringify(input) });
  },

  async updateStudentSubject(id, input) {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Authentication required.");
    return request(`/student/subjects/${encodeURIComponent(id)}`, { method: "PATCH", headers: authHeaders(token), body: JSON.stringify(input) });
  },

  async archiveStudentSubject(id) {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Authentication required.");
    return request(`/student/subjects/${encodeURIComponent(id)}`, { method: "DELETE", headers: authHeaders(token) });
  },

  async createStudentTopic(subjectId, input) {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Authentication required.");
    return request(`/student/subjects/${encodeURIComponent(subjectId)}/topics`, { method: "POST", headers: authHeaders(token), body: JSON.stringify(input) });
  },

  async updateStudentTopic(id, input) {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Authentication required.");
    return request(`/student/topics/${encodeURIComponent(id)}`, { method: "PATCH", headers: authHeaders(token), body: JSON.stringify(input) });
  },

  async archiveStudentTopic(id) {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Authentication required.");
    return request(`/student/topics/${encodeURIComponent(id)}`, { method: "DELETE", headers: authHeaders(token) });
  },

  async getDashboard() {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Authentication required.");
    return request("/dashboard", { headers: { Authorization: `Bearer ${token}` } });
  },

  async getNextActions() {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Authentication required.");
    return request("/next-action", { headers: authHeaders(token) });
  },

  async dismissNextAction(id) {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Authentication required.");
    return request(`/next-action/${encodeURIComponent(id)}/dismiss`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({})
    });
  },

  async askMentor(message) {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Authentication required.");
    return request("/mentor", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message }),
    });
  },

  async explainConcept(input) {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Authentication required.");
    try {
      return await request("/concepts/explain", {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify(input),
      });
    } catch (error) {
      const messages = {
        AI_PROVIDER_QUOTA_EXCEEDED: "Gemini AI usage quota is exhausted. Please try again after the quota resets.",
        AI_PROVIDER_TEMPORARILY_UNAVAILABLE: "Gemini is temporarily unavailable. Please retry shortly.",
        AI_PROVIDER_CONFIGURATION_ERROR: "Gemini authentication failed. Please contact support.",
        AI_PROVIDER_MODEL_NOT_FOUND: "The configured Gemini model is unavailable. Please contact support.",
        GEMINI_NOT_CONFIGURED: "Gemini is not configured for concept explanations. Please contact support.",
        AI_INVALID_OUTPUT: "Gemini couldn't produce a valid concept explanation. Please retry.",
        AI_PROVIDER_REQUEST_REJECTED: "Gemini couldn't process this explanation request. Try another mode or simplify the concept.",
        AI_PROVIDER_ERROR: "Could not generate a concept explanation. Please try again.",
      };
      if (messages[error.code]) error.message = messages[error.code];
      throw error;
    }
  },
  async getPracticeContext() {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Authentication required.");
    return request("/student/context", { headers: authHeaders(token) });
  },

  async getPracticeTopics() {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Authentication required.");
    return request("/practice/topics", { headers: authHeaders(token) });
  },

  async createPracticeSession(input) {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Authentication required.");
    return request("/practice/sessions", { method: "POST", headers: authHeaders(token), body: JSON.stringify(input) });
  },

  async getPracticeSession(id) {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Authentication required.");
    return request(`/practice/sessions/${id}`, { headers: authHeaders(token) });
  },

  async getPracticeResults(id) {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Authentication required.");
    return request(`/practice/sessions/${id}/results`, { headers: authHeaders(token) });
  },

  async answerPracticeQuestion(sessionId, input) {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Authentication required.");
    return request(`/practice/sessions/${sessionId}/answers`, { method: "POST", headers: authHeaders(token), body: JSON.stringify(input) });
  },

  async submitPracticeSession(id) {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Authentication required.");
    return request(`/practice/sessions/${id}/submit`, { method: "POST", headers: authHeaders(token), body: JSON.stringify({}) });
  },

  async getPracticeHistory() {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Authentication required.");
    return request("/practice/history", { headers: authHeaders(token) });
  },

  async getCareerPaths() {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Authentication required.");
    return request("/career/paths", { headers: authHeaders(token) });
  },

  async getCareerGoals() {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Authentication required.");
    return request("/career/goals", { headers: authHeaders(token) });
  },

  async createCareerGoal(input) {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Authentication required.");
    return request("/career/goals", { method: "POST", headers: authHeaders(token), body: JSON.stringify(input) });
  },

  async updateCareerGoal(id, input) {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Authentication required.");
    return request(`/career/goals/${encodeURIComponent(id)}`, { method: "PATCH", headers: authHeaders(token), body: JSON.stringify(input) });
  },

  async pauseCareerGoal(id) {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Authentication required.");
    return request(`/career/goals/${encodeURIComponent(id)}`, { method: "DELETE", headers: authHeaders(token) });
  },

  async getCareerAnalysis(goalId) {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Authentication required.");
    return request(`/career/goals/${encodeURIComponent(goalId)}/analysis`, { headers: authHeaders(token) });
  },

  async getCareerRoadmap(goalId) {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Authentication required.");
    return request(`/career/goals/${encodeURIComponent(goalId)}/roadmap`, { headers: authHeaders(token) });
  },

  async recalculateCareerRoadmap(goalId) {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Authentication required.");
    return request(`/career/goals/${encodeURIComponent(goalId)}/recalculate`, { method: "POST", headers: authHeaders(token), body: JSON.stringify({}) });
  },

  async updateCareerRoadmapItem(id, status) {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Authentication required.");
    return request(`/career/roadmap/items/${encodeURIComponent(id)}`, { method: "PATCH", headers: authHeaders(token), body: JSON.stringify({ status }) });
  },

  async getCareerSkills() {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Authentication required.");
    return request("/career/skills", { headers: authHeaders(token) });
  },

  async addCareerSkillEvidence(input) {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Authentication required.");
    return request("/career/skills", { method: "POST", headers: authHeaders(token), body: JSON.stringify(input) });
  },

  async getCareerProjects(goalId) {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Authentication required.");
    return request(`/career/goals/${encodeURIComponent(goalId)}/projects`, { headers: authHeaders(token) });
  },

  async startCareerProject(goalId, templateId) {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Authentication required.");
    return request(`/career/goals/${encodeURIComponent(goalId)}/projects`, { method: "POST", headers: authHeaders(token), body: JSON.stringify({ templateId }) });
  },

  async updateCareerProject(id, input) {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Authentication required.");
    return request(`/career/projects/${encodeURIComponent(id)}`, { method: "PATCH", headers: authHeaders(token), body: JSON.stringify(input) });
  },

  async getCareerContext() {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Authentication required.");
    return request("/career/context", { headers: authHeaders(token) });
  },

  async getMemoryTopics() {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Authentication required.");
    return request("/memory/topics", { headers: authHeaders(token) });
  },

  async getMemorySummary() {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Authentication required.");
    return request("/memory/summary", { headers: authHeaders(token) });
  },

  async getDueMemoryItems(limit = 50) {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Authentication required.");
    return request(`/memory/due?limit=${encodeURIComponent(limit)}`, { headers: authHeaders(token) });
  },

  async getMemoryItems({ status = "active", page = 1, limit = 30, topicId } = {}) {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Authentication required.");
    const query = new URLSearchParams({ status, page: String(page), limit: String(limit) });
    if (topicId) query.set("topicId", topicId);
    return request(`/memory/items?${query}`, { headers: authHeaders(token) });
  },

  async getMemoryItem(id) {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Authentication required.");
    return request(`/memory/items/${encodeURIComponent(id)}`, { headers: authHeaders(token) });
  },

  async createMemoryItem(input) {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Authentication required.");
    return request("/memory/items", { method: "POST", headers: authHeaders(token), body: JSON.stringify(input) });
  },

  async createMemoryItemFromPractice(sessionId, questionId) {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Authentication required.");
    return request("/memory/items/from-practice", {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ sessionId, questionId })
    });
  },

  async archiveMemoryItem(id) {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Authentication required.");
    return request(`/memory/items/${encodeURIComponent(id)}`, { method: "DELETE", headers: authHeaders(token) });
  },

  async reviewMemoryItem(id, input) {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Authentication required.");
    return request(`/memory/items/${encodeURIComponent(id)}/review`, { method: "POST", headers: authHeaders(token), body: JSON.stringify(input) });
  },

  async getMemoryReviewHistory({ page = 1, limit = 10 } = {}) {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Authentication required.");
    return request(`/memory/reviews?page=${page}&limit=${limit}`, { headers: authHeaders(token) });
  },

  async getVaultDocuments() {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Authentication required.");
    return request("/vault/documents", { headers: authHeaders(token) });
  },

  async getVaultDocument(id) {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Authentication required.");
    return request("/vault/documents/" + id, { headers: authHeaders(token) });
  },

  async uploadVaultDocument(file, metadata = {}) {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Authentication required.");
    const body = new FormData();
    body.append("file", file);
    if (metadata.subject) body.append("subject", metadata.subject);
    if (metadata.topic) body.append("topic", metadata.topic);
    return request("/vault/documents", { method: "POST", headers: authHeaders(token), body });
  },

  async deleteVaultDocument(id) {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Authentication required.");
    return request("/vault/documents/" + id, { method: "DELETE", headers: authHeaders(token) });
  },

  getToken() {
    return window.localStorage.getItem(TOKEN_KEY);
  },

  signOut() {
    window.localStorage.removeItem(TOKEN_KEY);
  },
};

function authHeaders(token) {
  return { Authorization: "Bearer " + token };
}
