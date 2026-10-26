import { createHash } from "node:crypto";
import { Action, CareerProject, MemoryItem, PracticeSession, Roadmap, RoadmapItem, Subject, Topic } from "../models/index.js";
import { getStudentContext } from "./studentContext.service.js";

const MAX_ALTERNATIVES = 2;
const MAX_ROADMAPS = 20;
const RANKING_POINTS = {
  base: {
    unfinishedPractice: 30,
    inProgressRoadmapOrCareerProject: 25,
    unfinishedCareerMilestone: 18,
    dueMemoryReviewOrTargetedPractice: 20,
    careerSkillGap: 15,
    diagnosticForUntestedTopic: 10
  },
  exam: [40, 30, 20, 10],
  overdueScheduledAction: 15,
  reliablePracticeGap: 25,
  repeatedMistakes: 10,
  overdueMemoryItem: 3,
  maximumOverdueMemoryItems: 5,
  alreadyInProgress: 10,
  priorityLabels: { high: 50, medium: 25 }
};
const RANKING_POLICY = {
  model: "deterministic additive heuristic points, not percentages",
  basePoints: RANKING_POINTS.base,
  adjustments: {
    examDeadlineDays: { "0-3": RANKING_POINTS.exam[0], "4-7": RANKING_POINTS.exam[1], "8-14": RANKING_POINTS.exam[2], "15-30": RANKING_POINTS.exam[3] },
    overdueScheduledAction: RANKING_POINTS.overdueScheduledAction,
    reliablePracticeGap: RANKING_POINTS.reliablePracticeGap,
    repeatedMistakes: RANKING_POINTS.repeatedMistakes,
    overdueMemoryItem: RANKING_POINTS.overdueMemoryItem,
    maximumOverdueMemoryItems: RANKING_POINTS.maximumOverdueMemoryItems,
    alreadyInProgress: RANKING_POINTS.alreadyInProgress
  },
  rationale: [
    "Near exam dates receive the largest adjustment, while overdue reviews are capped so they cannot displace an imminent exam solely by count.",
    "Targeted practice receives an adjustment only when the existing performance service meets its evidence threshold.",
    "Diagnostic actions are low-confidence and describe missing graded evidence, not a confirmed weakness.",
    "Existing activities receive a continuity adjustment; otherwise equivalent candidates are ranked by earliest real deadline and stable candidate ID.",
    "An explicit user dismissal is saved against that candidate version; ordinary reads never create or update Action records."
  ],
  confidenceCriteria: {
    high: "A saved due review, unfinished practice session, active career roadmap item, or performance result meeting the existing review threshold.",
    moderate: "A configured skill gap linked to an explicitly selected active career goal.",
    low: "A diagnostic offered because a real syllabus topic has no graded practice evidence."
  },
  priorityLabels: {
    high: `${RANKING_POINTS.priorityLabels.high} or more points`,
    medium: `${RANKING_POINTS.priorityLabels.medium} to ${RANKING_POINTS.priorityLabels.high - 1} points`,
    low: `Fewer than ${RANKING_POINTS.priorityLabels.medium} points`
  },
  tieBreak: "Higher score, then earliest actual deadline, then candidate ID in lexical order."
};

export async function getNextActions(userId, { now = new Date(), context: suppliedContext } = {}) {
  const context = suppliedContext || await getStudentContext(userId);
  const sourceResults = await Promise.allSettled([
    collectMemoryCandidate(userId, now),
    collectLearningCandidates(userId, context),
    collectRoadmapCandidates(userId, context),
    collectCareerCandidate(userId, context)
  ]);
  const candidates = [];
  const unavailableSources = [];
  for (const [index, result] of sourceResults.entries()) {
    if (result.status === "fulfilled") candidates.push(...result.value);
    else unavailableSources.push(["memory", "learning", "roadmap", "career"][index]);
  }

  const keys = candidates.map((candidate) => candidate.candidateKey);
  const dismissed = keys.length
    ? await Action.find({ userId, candidateKey: { $in: keys }, status: "dismissed" }).select("candidateKey").lean()
    : [];
  const dismissedKeys = new Set(dismissed.map((action) => action.candidateKey));
  const ranked = rankNextActionCandidates(candidates.filter((candidate) => !dismissedKeys.has(candidate.candidateKey)), now);
  const [primary = null, ...alternatives] = ranked;

  return {
    state: primary ? "available" : "no_action",
    primary,
    alternatives: alternatives.slice(0, MAX_ALTERNATIVES),
    message: primary
      ? null
      : buildEmptyMessage(context, unavailableSources),
    availability: getAvailability(context.profile),
    capabilities: context.capabilities,
    unavailableSources,
    rankingPolicy: RANKING_POLICY
  };
}

export function rankNextActionCandidates(candidates, now = new Date()) {
  return candidates.map((candidate) => {
    const factors = [];
    let score = candidate.baseScore;

    if (candidate.deadline) {
      const daysUntil = calendarDaysFromNow(candidate.deadline, now);
      const urgency = daysUntil < 0 && candidate.deadlineSource !== "exam" ? RANKING_POINTS.overdueScheduledAction
        : daysUntil >= 0 && daysUntil <= 3 ? RANKING_POINTS.exam[0]
          : daysUntil <= 7 && daysUntil >= 0 ? RANKING_POINTS.exam[1]
            : daysUntil <= 14 && daysUntil >= 0 ? RANKING_POINTS.exam[2]
              : daysUntil <= 30 && daysUntil >= 0 ? RANKING_POINTS.exam[3] : 0;
      if (urgency) {
        score += urgency;
        if (daysUntil < 0) {
          factors.push(`This action's scheduled date was ${Math.abs(daysUntil)} day${Math.abs(daysUntil) === 1 ? "" : "s"} ago.`);
        } else {
          const timing = daysUntil === 0 ? "today" : `in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`;
          factors.push(candidate.deadlineSource === "exam"
            ? `The syllabus exam date is ${timing}.`
            : `This action is due ${timing}.`);
        }
      }
    }

    if (candidate.needsReview) {
      score += RANKING_POINTS.reliablePracticeGap;
      factors.push("Recorded practice evidence meets the existing threshold for review.");
    }
    if (candidate.repeatedMistakes) {
      score += RANKING_POINTS.repeatedMistakes;
      factors.push("Repeated mistakes were recorded for this topic.");
    }
    if (candidate.overdueCount > 0) {
      const overduePoints = Math.min(candidate.overdueCount, RANKING_POINTS.maximumOverdueMemoryItems) * RANKING_POINTS.overdueMemoryItem;
      score += overduePoints;
      factors.push(`${candidate.overdueCount} scheduled memory review${candidate.overdueCount === 1 ? " is" : "s are"} overdue.`);
    }
    if (candidate.inProgress) {
      score += RANKING_POINTS.alreadyInProgress;
      factors.push("This activity is already in progress.");
    }

    return {
      ...candidate,
      priorityScore: score,
      reason: candidate.reason,
      rankingReasons: [candidate.reason, ...factors].filter(Boolean)
    };
  }).sort((left, right) =>
    right.priorityScore - left.priorityScore ||
    left.deadlineTime - right.deadlineTime ||
    left.candidateKey.localeCompare(right.candidateKey)
  ).map(({ baseScore, deadlineTime, needsReview, repeatedMistakes, overdueCount, inProgress, ...candidate }) => candidate);
}

export async function dismissNextAction(userId, candidateId, { context, now } = {}) {
  const recommendation = await getNextActions(userId, { context, now });
  const available = [recommendation.primary, ...recommendation.alternatives]
    .find((candidate) => candidate?.id === candidateId);
  if (!available) {
    const existing = await Action.findOne({ userId, candidateKey: candidateId, status: "dismissed" }).select("_id").lean();
    if (existing) return { dismissed: true, idempotent: true };
    throw notFound("This recommendation is no longer available.");
  }

  try {
    await Action.findOneAndUpdate(
      { userId, candidateKey: available.candidateKey },
      {
        $set: {
          userId,
          candidateKey: available.candidateKey,
          type: available.actionType,
          title: available.title,
          description: available.description,
          reason: available.reason,
          priority: priorityLabel(available.priorityScore),
          status: "dismissed",
          context: { source: "next_action_engine", dismissedAt: new Date() }
        }
      },
      { upsert: true, new: true, runValidators: true }
    );
  } catch (error) {
    if (error.code !== 11000) throw error;
    const duplicate = await Action.findOne({ userId, candidateKey: available.candidateKey, status: "dismissed" }).select("_id").lean();
    if (!duplicate) throw error;
    return { dismissed: true, idempotent: true };
  }
  return { dismissed: true, idempotent: false };
}

async function collectMemoryCandidate(userId, now) {
  const [item, dueCount, overdueCount] = await Promise.all([
    MemoryItem.findOne({ userId, status: "active", nextReviewAt: { $lte: now } })
      .select("_id topicId nextReviewAt")
      .sort({ nextReviewAt: 1, createdAt: 1 })
      .lean(),
    MemoryItem.countDocuments({ userId, status: "active", nextReviewAt: { $lte: now } }),
    MemoryItem.countDocuments({ userId, status: "active", nextReviewAt: { $lt: startOfUtcDay(now) } })
  ]);
  if (!item) return [];
  const revision = shortHash(item.nextReviewAt?.toISOString() || item._id.toString());
  return [{
    id: `memory_review:${item._id.toString()}:${revision}`,
    candidateKey: `memory_review:${item._id.toString()}:${revision}`,
    actionType: "memory",
    type: "memory_review",
    title: overdueCount ? "Review an overdue memory item" : "Complete a due memory review",
    description: `${dueCount} saved memory item${dueCount === 1 ? "" : "s"} are due for review.`,
    reason: overdueCount ? `${overdueCount} saved review${overdueCount === 1 ? " is" : "s are"} overdue.` : "This item is due based on its saved review schedule.",
    source: "memory_schedule",
    sourceId: item._id.toString(),
    goalType: "revision",
    confidence: "high",
    evidence: [{ type: "saved_review_schedule", recordedAt: item.nextReviewAt }],
    priorityScore: 0,
    baseScore: RANKING_POINTS.base.dueMemoryReviewOrTargetedPractice,
    overdueCount,
    deadlineTime: item.nextReviewAt?.getTime() ?? Number.MAX_SAFE_INTEGER,
    route: "/memory"
  }];
}

async function collectLearningCandidates(userId, context) {
  const practiceData = context.performance;
  if (practiceData?.state === "unavailable") return [];

  const [sessions, topics] = await Promise.all([
    PracticeSession.find({ userId, status: "in_progress" })
      .select("_id topicId subjectId topicName subjectName updatedAt")
      .sort({ updatedAt: -1 })
      .limit(3)
      .lean(),
    practiceData?.topicsNeedingPractice?.length
      ? Topic.find({
        userId,
        _id: { $in: practiceData.topicsNeedingPractice.map((topic) => topic.id).filter(Boolean) },
        status: "active"
      }).select("_id subjectId syllabusId name").lean()
      : []
  ]);
  const practiceTopicIds = (practiceData?.topicsNeedingPractice || []).map((topic) => topic.id).filter(Boolean);
  const completedSessions = practiceTopicIds.length
    ? await PracticeSession.find({ userId, status: "completed", topicId: { $in: practiceTopicIds } })
      .select("_id topicId updatedAt")
      .sort({ updatedAt: -1 })
      .limit(20)
      .lean()
    : [];

  const candidates = sessions.map((session) => ({
    id: `practice_session:${session._id.toString()}`,
    candidateKey: `practice_session:${session._id.toString()}`,
    actionType: "practice",
    type: "continue_practice",
    title: `Continue ${session.topicName}`,
    description: `${session.subjectName} practice session is unfinished.`,
    reason: "This practice session is saved as in progress.",
    source: "practice_session",
    sourceId: session._id.toString(),
    goalType: "academic",
    confidence: "high",
    evidence: [{ type: "practice_session", status: "in_progress", recordedAt: session.updatedAt }],
    priorityScore: 0,
    baseScore: RANKING_POINTS.base.unfinishedPractice,
    inProgress: true,
    deadlineTime: Number.MAX_SAFE_INTEGER,
    route: `/practice/test/${session._id.toString()}`
  }));

  const topicById = new Map(topics.map((topic) => [topic._id.toString(), topic]));
  const activeSyllabusId = context.academic?.syllabus?._id?.toString();
  const examDate = activeSyllabusId ? context.academic.syllabus.examDate : null;
  const activeTopicIds = new Set(sessions.map((session) => session.topicId.toString()));
  const latestSessionByTopic = new Map();
  for (const session of completedSessions) {
    if (!latestSessionByTopic.has(session.topicId.toString())) {
      latestSessionByTopic.set(session.topicId.toString(), session._id.toString());
    }
  }

  const recurringTopics = new Set((practiceData?.recurringMistakes || [])
    .flatMap((mistake) => mistake.topics || [])
    .map((name) => name.toLocaleLowerCase()));
  for (const topic of (practiceData?.topicsNeedingPractice || []).slice(0, 5)) {
    const source = topicById.get(topic.id);
    if (!source || activeTopicIds.has(topic.id)) continue;
    const latestSession = latestSessionByTopic.get(topic.id);
    candidates.push(practiceCandidate(source, topic, {
      latestSession,
      deadline: source.syllabusId.toString() === activeSyllabusId ? examDate : null,
      repeatedMistakes: recurringTopics.has(topic.name.toLocaleLowerCase())
    }));
  }

  if (activeSyllabusId) {
    const knownTopicIds = new Set((practiceData?.topics || []).map((topic) => topic.id).filter(Boolean));
    const existingTopicIds = new Set(sessions.map((session) => session.topicId.toString()));
    const untestedTopic = await Topic.findOne({
      userId,
      syllabusId: context.academic.syllabus._id,
      status: "active",
      _id: { $nin: [...knownTopicIds, ...existingTopicIds] }
    }).select("_id subjectId syllabusId name").sort({ order: 1, createdAt: 1 }).lean();
    if (untestedTopic) {
      const subject = await Subject.findOne({ _id: untestedTopic.subjectId, userId, status: "active" }).select("_id").lean();
      if (subject) {
        candidates.push({
          ...practiceCandidate(untestedTopic, null, { deadline: examDate, mode: "quick_quiz" }),
          title: `Check your understanding of ${untestedTopic.name}`,
          description: "No graded practice evidence is recorded for this syllabus topic yet."
        });
      }
    }
  }

  return candidates;
}

function practiceCandidate(topic, performance, { latestSession, deadline, mode = "quick_quiz", repeatedMistakes = false } = {}) {
  const id = topic._id.toString();
  const candidateType = performance ? "practice" : "diagnostic";
  const candidateKey = `${candidateType}:${id}${latestSession ? `:${shortHash(latestSession)}` : ""}`;
  return {
    id: candidateKey,
    candidateKey,
    actionType: "practice",
    type: performance ? "practice" : "diagnostic",
    title: performance ? `Practise ${topic.name}` : `Start a diagnostic quiz for ${topic.name}`,
    description: performance
      ? `${performance.scorePercentage}% recorded score across ${performance.gradedQuestions} graded questions.`
      : `Use a short quiz to establish a baseline for ${topic.name}.`,
    reason: performance
      ? "This topic met the existing evidence threshold for targeted practice."
      : "No graded attempt is recorded; this is a diagnostic, not a claim that you are weak in the topic.",
    source: performance ? "graded_practice_performance" : "active_syllabus_topic",
    sourceId: id,
    goalType: "academic",
    confidence: performance ? "high" : "low",
    evidence: performance
      ? [{ type: "graded_practice", scorePercentage: performance.scorePercentage, gradedQuestions: performance.gradedQuestions, sessionCount: performance.sessionCount }]
      : [{ type: "practice_history", state: "no_graded_attempts_recorded" }],
    priorityScore: 0,
    baseScore: performance ? RANKING_POINTS.base.dueMemoryReviewOrTargetedPractice : RANKING_POINTS.base.diagnosticForUntestedTopic,
    needsReview: Boolean(performance?.needsPractice),
    repeatedMistakes,
    deadline,
    deadlineSource: deadline ? "exam" : null,
    deadlineTime: deadline ? new Date(deadline).getTime() : Number.MAX_SAFE_INTEGER,
    route: "/practice",
    navigation: { subjectId: topic.subjectId.toString(), topicId: id, mode }
  };
}

async function collectRoadmapCandidates(userId, context) {
  const roadmaps = await Roadmap.find({
    userId,
    status: "active",
    kind: "career",
    careerGoalId: context.career?.goal?.id || null
  }).select("_id kind careerGoalId").sort({ updatedAt: -1 }).limit(MAX_ROADMAPS).lean();
  if (!roadmaps.length) return [];

  const roadmapById = new Map(roadmaps.map((roadmap) => [roadmap._id.toString(), roadmap]));
  const items = await RoadmapItem.find({
    userId,
    roadmapId: { $in: roadmaps.map((roadmap) => roadmap._id) },
    status: { $in: ["in_progress", "pending"] }
  }).select("_id roadmapId topicId subjectId careerSkillId title status rationale scheduledDate estimatedMinutes").sort({ order: 1, scheduledDate: 1 }).limit(50).lean();
  const activeCareerGoalId = context.career?.goal?.id;
  return items.flatMap((item) => {
    const roadmap = roadmapById.get(item.roadmapId.toString());
    if (!roadmap || !activeCareerGoalId || roadmap.careerGoalId?.toString() !== activeCareerGoalId) return [];
    return [{
      id: `roadmap_item:${item._id.toString()}`,
      candidateKey: `roadmap_item:${item._id.toString()}`,
      actionType: "career",
      type: "career_milestone",
      title: item.title,
      description: item.rationale || "Continue the next unfinished milestone in your active career roadmap.",
      reason: item.status === "in_progress" ? "This career milestone is already in progress." : "This is an unfinished milestone in your active career roadmap.",
      source: "career_roadmap_item",
      sourceId: item._id.toString(),
      goalType: "career",
      confidence: "high",
      evidence: [{ type: "roadmap_item", status: item.status }],
      priorityScore: 0,
      baseScore: item.status === "in_progress" ? RANKING_POINTS.base.inProgressRoadmapOrCareerProject : RANKING_POINTS.base.unfinishedCareerMilestone,
      inProgress: item.status === "in_progress",
      deadline: item.scheduledDate || null,
      deadlineSource: item.scheduledDate ? "scheduled" : null,
      deadlineTime: item.scheduledDate?.getTime() ?? Number.MAX_SAFE_INTEGER,
      estimatedDurationMinutes: item.estimatedMinutes || null,
      route: "/career/roadmap",
      navigation: { goalId: activeCareerGoalId }
    }];
  });
}

async function collectCareerCandidate(userId, context) {
  const career = context.career;
  if (!career?.goal?.id || career.state === "unavailable") return [];
  const goal = await CareerProject.findOne({ userId, goalId: career.goal.id, status: "in_progress" })
    .select("_id title updatedAt")
    .sort({ updatedAt: -1 })
    .lean();
  if (goal) {
    return [{
      id: `career_project:${goal._id.toString()}`,
      candidateKey: `career_project:${goal._id.toString()}`,
      actionType: "project",
      type: "career_project",
      title: `Continue ${goal.title}`,
      description: "This career-linked project is recorded as in progress.",
      reason: `It is linked to your active ${career.goal.title} goal.`,
      source: "career_project",
      sourceId: goal._id.toString(),
      goalType: "career",
      confidence: "high",
      evidence: [{ type: "career_project", status: "in_progress", recordedAt: goal.updatedAt }],
      priorityScore: 0,
      baseScore: RANKING_POINTS.base.inProgressRoadmapOrCareerProject,
      inProgress: true,
      deadlineTime: Number.MAX_SAFE_INTEGER,
      route: `/projects/${goal._id.toString()}`
    }];
  }
  if (!career.priorityGap) return [];
  return [{
    id: `career_goal:${career.goal.id}:${shortHash(`${career.priorityGap.skillId}:${career.priorityGap.state}`)}`,
    candidateKey: `career_goal:${career.goal.id}:${shortHash(`${career.priorityGap.skillId}:${career.priorityGap.state}`)}`,
    actionType: "career",
    type: "career_skill",
    title: career.nextAction?.title || `Develop ${career.priorityGap.name}`,
    description: career.nextAction?.reason || "Continue the configured analysis for your active career goal.",
    reason: `Based on the configured skill analysis for your stated ${career.goal.title} goal.`,
    source: "career_skill_gap",
    sourceId: career.goal.id,
    goalType: "career",
    confidence: "moderate",
    evidence: [{ type: "career_skill_analysis", skillId: career.priorityGap.skillId, state: career.priorityGap.state }],
    priorityScore: 0,
    baseScore: RANKING_POINTS.base.careerSkillGap,
    deadlineTime: Number.MAX_SAFE_INTEGER,
    route: career.nextAction?.route === "/projects" ? "/projects" : "/career",
    navigation: { goalId: career.goal.id }
  }];
}

function getAvailability(profile) {
  const hoursPerDay = profile?.availability?.hoursPerDay ?? profile?.studyPreferences?.hoursPerDay ?? null;
  const daysPerWeek = profile?.availability?.daysPerWeek ?? profile?.studyPreferences?.daysPerWeek ?? null;
  return {
    state: hoursPerDay || daysPerWeek ? "provided" : "not_provided",
    hoursPerDay,
    daysPerWeek
  };
}

function buildEmptyMessage(context, unavailableSources) {
  if (unavailableSources.length) {
    return "Some student data sources are temporarily unavailable, so their recommendations are omitted. There is no other eligible action right now.";
  }
  if (!context.academic?.syllabus && context.career?.state === "no_goal" &&
      context.memory?.state === "available" && context.memory.activeItems === 0) {
    return "No eligible actions are available yet. Add a syllabus, choose a career goal, or create memory items to get grounded recommendations.";
  }
  if (context.performance?.state === "unavailable" || context.memory?.state === "unavailable") {
    return "No action could be selected from the available records. Some learning systems are temporarily unavailable.";
  }
  return "There are no eligible unfinished actions right now. Complete or add learning activities to refresh recommendations.";
}

function priorityLabel(score) {
  return score >= RANKING_POINTS.priorityLabels.high ? "high"
    : score >= RANKING_POINTS.priorityLabels.medium ? "medium" : "low";
}

function shortHash(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, 8);
}

function startOfUtcDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function calendarDaysFromNow(date, now) {
  return Math.round((startOfUtcDay(new Date(date)).getTime() - startOfUtcDay(now).getTime()) / 86_400_000);
}

function notFound(message) {
  const error = new Error(message);
  error.status = 404;
  error.code = "NOT_FOUND";
  return error;
}
