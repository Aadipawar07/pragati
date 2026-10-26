import { Goal, Profile, Roadmap, RoadmapItem, Subject, Syllabus, Topic, Unit, User } from "../models/index.js";
import { getPerformanceSummary } from "./performance.service.js";
import { getMemorySummary } from "./memory.service.js";
import { getCareerContext } from "./career.service.js";

export async function getStudentContext(userId) {
  const [user, profile, goals, syllabus] = await Promise.all([
    User.findById(userId).select("_id email"),
    Profile.findOne({ userId }).select("name course year semester studyPreferences availability careerPreferences onboardingComplete").lean(),
    Goal.find({ userId, status: "active" }).select("type title description target deadline status careerDetails createdAt updatedAt").sort({ createdAt: -1 }).limit(30).lean(),
    Syllabus.findOne({ userId, status: "ready", sourceType: { $ne: "manual" } }).select("title status examDate createdAt updatedAt").sort({ createdAt: -1 }).lean()
  ]);

  const subjects = await Subject.find({ userId, status: "active" })
    .select("name code description order status syllabusId")
    .sort({ order: 1, createdAt: 1 })
    .limit(100)
    .lean();
  const [performanceResult, memoryResult, careerResult] = await Promise.allSettled([
    getPerformanceSummary(userId),
    getMemorySummary(userId),
    getCareerContext(userId)
  ]);
  const roadmap = await Roadmap.findOne({
    userId,
    status: "active",
    $or: [{ kind: "academic" }, { kind: { $exists: false } }]
  }).select("title goal status progress startDate endDate").sort({ updatedAt: -1 }).lean();
  const roadmapItems = roadmap
    ? await RoadmapItem.find({ userId, roadmapId: roadmap._id }).select("subjectId topicId title type order estimatedMinutes status scheduledDate completedAt rationale").sort({ order: 1, createdAt: 1 }).limit(100).lean()
    : [];
  const performance = performanceResult.status === "fulfilled"
    ? { ...performanceResult.value, state: "available" }
    : { state: "unavailable", completedAssessments: null, topics: [], topicsNeedingPractice: [], recurringMistakes: [], trend: [] };
  const memory = memoryResult.status === "fulfilled"
    ? { ...memoryResult.value, state: "available" }
    : { state: "unavailable", activeItems: null, dueItems: null, overdueItems: null, recentlyDifficultItems: [], topicsNeedingRevision: [] };
  const career = careerResult.status === "fulfilled"
    ? careerResult.value
    : { state: "unavailable", goal: null, summary: null, priorityGap: null, nextAction: null, projects: [] };

  return {
    user: user ? { id: user._id.toString(), email: user.email, name: profile?.name || "" } : null,
    profile,
    goals,
    academic: { syllabus, subjects, upcomingExam: examSummary(syllabus) },
    roadmap: roadmap ? { ...roadmap, items: roadmapItems } : null,
    knowledge: null,
    performance,
    memory,
    career,
    capabilities: {
      knowledge: "unavailable",
      examIntelligence: "unavailable",
      syllabus: syllabus ? "available" : "not_configured",
      performance: performance.state,
      memory: memory.state,
      career: career.state === "unavailable" ? "unavailable" : career.state === "no_goal" ? "not_configured" : "available"
    }
  };
}

function examSummary(syllabus) {
  if (!syllabus) return { state: "not_configured", date: null, daysRemaining: null };
  if (!syllabus.examDate) return { state: "date_not_set", date: null, daysRemaining: null };
  const date = new Date(syllabus.examDate);
  const today = new Date();
  const daysRemaining = Math.round((
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) -
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  ) / 86_400_000);
  return {
    state: daysRemaining >= 0 ? "upcoming" : "date_passed",
    date: syllabus.examDate,
    daysRemaining: daysRemaining >= 0 ? daysRemaining : null
  };
}

export async function getProfile(userId) {
  return Profile.findOne({ userId }).lean();
}

export async function updateProfile(userId, input) {
  const allowed = ["name", "college", "course", "year", "semester", "batch", "preferredLanguage", "studyPreferences", "availability", "careerPreferences", "onboardingComplete"];
  const updates = Object.fromEntries(Object.entries(input).filter(([key]) => allowed.includes(key)));
  const profile = await Profile.findOneAndUpdate(
    { userId },
    { $set: updates },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  ).lean();

  if (Array.isArray(input.goals)) {
    await Goal.deleteMany({ userId, status: "active", type: { $ne: "career" } });
    const goals = input.goals
      .filter((goal) => goal?.title?.trim())
      .map((goal) => ({
        userId,
        type: goal.type || "academic",
        title: goal.title.trim(),
        description: goal.description?.trim(),
        status: "active"
      }));
    if (goals.length) await Goal.insertMany(goals);
  }

  return profile;
}

export async function getStudentSubjects(userId) {
  const subjects = await Subject.find({ userId, status: "active" })
    .select("name code description order status syllabusId")
    .sort({ order: 1, createdAt: 1 })
    .limit(100)
    .lean();
  const topics = subjects.length
    ? await Topic.find({ userId, subjectId: { $in: subjects.map(({ _id }) => _id) }, status: "active" })
      .select("name description order difficulty subjectId")
      .sort({ order: 1, createdAt: 1 })
      .lean()
    : [];
  const topicsBySubject = new Map();
  for (const topic of topics) {
    const key = topic.subjectId.toString();
    const items = topicsBySubject.get(key) || [];
    items.push({ id: topic._id.toString(), name: topic.name, description: topic.description || "", order: topic.order, difficulty: topic.difficulty || null });
    topicsBySubject.set(key, items);
  }
  return subjects.map((subject) => ({
    id: subject._id.toString(),
    name: subject.name,
    code: subject.code || "",
    description: subject.description || "",
    topics: topicsBySubject.get(subject._id.toString()) || []
  }));
}

export async function createStudentSubject(userId, input) {
  const syllabus = await getManualWorkspace(userId);
  const name = input.name.trim();
  const existing = await Subject.findOne({ userId, syllabusId: syllabus._id, status: "active", name: new RegExp(`^${escapeRegExp(name)}$`, "i") }).select("_id").lean();
  if (existing) throw conflict("A subject with this name already exists.");
  if (await Subject.countDocuments({ userId, status: "active" }) >= 100) throw conflict("Your study space can contain up to 100 active subjects.");
  const order = await Subject.countDocuments({ userId, syllabusId: syllabus._id, status: "active" });
  const subject = await Subject.create({
    userId,
    syllabusId: syllabus._id,
    name,
    code: input.code?.trim(),
    description: input.description?.trim(),
    order
  });
  return subjectDTO(subject);
}

export async function updateStudentSubject(userId, subjectId, input) {
  const updates = Object.fromEntries(Object.entries(input).map(([field, value]) => [field, value.trim()]));
  if (updates.name) {
    const subject = await Subject.findOne({ _id: subjectId, userId, status: "active" }).select("syllabusId").lean();
    if (!subject) throw notFound("Subject was not found.");
    const existing = await Subject.findOne({ _id: { $ne: subjectId }, userId, syllabusId: subject.syllabusId, status: "active", name: new RegExp(`^${escapeRegExp(updates.name)}$`, "i") }).select("_id").lean();
    if (existing) throw conflict("A subject with this name already exists.");
  }
  const subject = await Subject.findOneAndUpdate(
    { _id: subjectId, userId, status: "active" },
    { $set: updates },
    { new: true, runValidators: true }
  );
  if (!subject) throw notFound("Subject was not found.");
  return subjectDTO(subject);
}

export async function archiveStudentSubject(userId, subjectId) {
  const subject = await Subject.findOneAndUpdate({ _id: subjectId, userId, status: "active" }, { $set: { status: "archived" } }, { new: true }).lean();
  if (!subject) throw notFound("Subject was not found.");
  await Promise.all([
    Topic.updateMany({ userId, subjectId, status: "active" }, { $set: { status: "archived" } }),
    Unit.updateMany({ userId, subjectId, status: "active" }, { $set: { status: "archived" } })
  ]);
}

export async function createStudentTopic(userId, subjectId, input) {
  const subject = await Subject.findOne({ _id: subjectId, userId, status: "active" }).select("_id syllabusId").lean();
  if (!subject) throw notFound("Subject was not found.");
  const name = input.name.trim();
  const existing = await Topic.findOne({ userId, subjectId, status: "active", name: new RegExp(`^${escapeRegExp(name)}$`, "i") }).select("_id").lean();
  if (existing) throw conflict("A topic with this name already exists in this subject.");
  if (await Topic.countDocuments({ userId, subjectId, status: "active" }) >= 100) throw conflict("Each subject can contain up to 100 active topics.");
  const order = await Topic.countDocuments({ userId, subjectId, status: "active" });
  const topic = await Topic.create({
    userId,
    syllabusId: subject.syllabusId,
    subjectId,
    name,
    description: input.description?.trim(),
    order
  });
  return topicDTO(topic);
}

export async function updateStudentTopic(userId, topicId, input) {
  const updates = Object.fromEntries(Object.entries(input).map(([field, value]) => [field, value.trim()]));
  if (updates.name) {
    const topic = await Topic.findOne({ _id: topicId, userId, status: "active" }).select("subjectId").lean();
    if (!topic) throw notFound("Topic was not found.");
    const existing = await Topic.findOne({ _id: { $ne: topicId }, userId, subjectId: topic.subjectId, status: "active", name: new RegExp(`^${escapeRegExp(updates.name)}$`, "i") }).select("_id").lean();
    if (existing) throw conflict("A topic with this name already exists in this subject.");
  }
  const topic = await Topic.findOneAndUpdate(
    { _id: topicId, userId, status: "active" },
    { $set: updates },
    { new: true, runValidators: true }
  );
  if (!topic) throw notFound("Topic was not found.");
  return topicDTO(topic);
}

export async function archiveStudentTopic(userId, topicId) {
  const topic = await Topic.findOneAndUpdate({ _id: topicId, userId, status: "active" }, { $set: { status: "archived" } }, { new: true }).lean();
  if (!topic) throw notFound("Topic was not found.");
}

async function getManualWorkspace(userId) {
  try {
    return await Syllabus.findOneAndUpdate(
      { userId, sourceType: "manual" },
      { $setOnInsert: { sourceType: "manual", title: "My Study Space", status: "ready", processingStage: "complete" } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
  } catch (error) {
    if (error.code !== 11000) throw error;
    const workspace = await Syllabus.findOne({ userId, sourceType: "manual" });
    if (!workspace) throw error;
    return workspace;
  }
}

function subjectDTO(subject) {
  return { id: subject._id.toString(), name: subject.name, code: subject.code || "", description: subject.description || "" };
}

function topicDTO(topic) {
  return { id: topic._id.toString(), subjectId: topic.subjectId.toString(), name: topic.name, description: topic.description || "" };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function notFound(message) {
  const error = new Error(message);
  error.status = 404;
  error.code = "NOT_FOUND";
  return error;
}

function conflict(message) {
  const error = new Error(message);
  error.status = 409;
  error.code = "CONFLICT";
  return error;
}
