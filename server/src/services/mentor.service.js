import { generate } from "../ai/gateway.js";
import { buildMentorPrompt } from "../prompts/mentor.prompt.js";
import { getStudentContext } from "./studentContext.service.js";
import { getNextActions } from "./nextAction.service.js";

function validateMentor(data) {
  if (!data || typeof data.message !== "string" || !data.message.trim() || data.message.length > 4000) {
    const error = new Error("Mentor returned invalid structured data.");
    error.status = 502;
    error.code = "AI_INVALID_OUTPUT";
    throw error;
  }
  return { message: data.message.trim() };
}

export async function askMentor(userId, message) {
  const context = await getStudentContext(userId);
  const nextActions = await getNextActions(userId, { context });
  const primary = nextActions.primary;
  const safeContext = {
    goals: context.goals.map((goal) => ({
      type: goal.type,
      title: goal.title,
      target: goal.target || null,
      deadline: goal.deadline || null
    })),
    availability: {
      hoursPerDay: context.profile?.availability?.hoursPerDay || context.profile?.studyPreferences?.hoursPerDay || null,
      daysPerWeek: context.profile?.availability?.daysPerWeek || context.profile?.studyPreferences?.daysPerWeek || null
    },
    academic: {
      state: context.capabilities.syllabus,
      syllabus: context.academic.syllabus ? {
        title: context.academic.syllabus.title,
        examDate: context.academic.syllabus.examDate || null,
        upcomingExam: context.academic.upcomingExam,
        subjects: context.academic.subjects.map((subject) => subject.name)
      } : null,
      unfinishedRoadmapItems: (context.roadmap?.items || [])
        .filter((item) => ["pending", "in_progress"].includes(item.status))
        .slice(0, 5)
        .map((item) => ({ title: item.title, status: item.status }))
    },
    learning: context.performance.state === "available" ? {
      state: "available",
      topicsNeedingPractice: context.performance.topicsNeedingPractice.slice(0, 5).map((topic) => ({
        name: topic.name,
        scorePercentage: topic.scorePercentage,
        gradedQuestions: topic.gradedQuestions
      })),
      recurringMistakes: context.performance.recurringMistakes.slice(0, 5).map((mistake) => ({
        concept: mistake.concept,
        occurrences: mistake.occurrences,
        sessionCount: mistake.sessionCount
      })),
      trendDirection: context.performance.trendDirection
    } : { state: "unavailable" },
    memory: context.memory.state === "available" ? {
      state: "available",
      dueItems: context.memory.dueItems,
      overdueItems: context.memory.overdueItems,
      reviewsCompletedToday: context.memory.reviewsCompletedToday
    } : { state: "unavailable" },
    career: context.career.state === "unavailable" ? { state: "unavailable" } : {
      state: context.career.state,
      goal: context.career.goal?.title || null,
      priorityGap: context.career.priorityGap?.name || null
    },
    unavailableCapabilities: Object.entries(context.capabilities)
      .filter(([, state]) => state === "unavailable")
      .map(([name]) => name),
    nextAction: primary ? {
      title: primary.title,
      reason: primary.reason,
      rankingReasons: primary.rankingReasons,
      evidence: primary.evidence
    } : null
  };
  let mentorMessage;
  let aiStatus = "available";
  try {
    const result = await generate({
      task: "mentor_reasoning",
      context: safeContext,
      schema: validateMentor,
      options: { prompt: buildMentorPrompt(message, safeContext), temperature: 0.2 },
      userId
    });
    mentorMessage = result.structuredData.message;
  } catch (error) {
    if (!["AI_PROVIDER_ERROR", "AI_PROVIDER_TIMEOUT", "AI_INVALID_OUTPUT", "AI_PROVIDER_NOT_CONFIGURED"].includes(error.code)) throw error;
    aiStatus = "unavailable";
    mentorMessage = deterministicMentorMessage(primary, nextActions.message);
  }

  const ranked = [primary, ...nextActions.alternatives].filter(Boolean);
  return {
    message: mentorMessage,
    recommendations: ranked.map((action) => ({
      title: action.title,
      reason: action.reason,
      estimatedMinutes: action.estimatedDurationMinutes || null
    })),
    actions: ranked.map((action) => ({
      title: action.title,
      route: action.route,
      navigation: action.navigation || null
    })),
    nextAction: primary,
    alternatives: nextActions.alternatives,
    aiStatus,
    contextUsed: ["goals", "academic", "learning", "memory", "career", "nextAction"]
  };
}

function deterministicMentorMessage(action, emptyMessage) {
  if (!action) return emptyMessage || "There is no suitable next action in the available student records right now.";
  return `${action.title} is the current recommendation. ${action.reason} ${action.rankingReasons.join(" ")}`;
}
