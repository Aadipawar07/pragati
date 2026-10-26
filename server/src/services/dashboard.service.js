import { Roadmap, RoadmapItem } from "../models/index.js";
import { getStudentContext } from "./studentContext.service.js";
import { getNextActions } from "./nextAction.service.js";

export async function getDashboard(userId) {
  const context = await getStudentContext(userId);
  const nextActions = await getNextActions(userId, { context });
  const roadmap = await Roadmap.findOne({
    userId,
    status: "active",
    $or: [{ kind: "academic" }, { kind: { $exists: false } }]
  }).sort({ updatedAt: -1 }).lean();
  const items = roadmap ? await RoadmapItem.find({ userId, roadmapId: roadmap._id }).sort({ order: 1 }).lean() : [];
  const completed = items.filter((item) => item.status === "completed").length;
  const currentItem = items.find((item) => item.status === "in_progress") || items.find((item) => item.status === "pending") || null;
  const dashboardAction = nextActions.primary;

  return {
    user: context.user,
    currentStudy: currentItem ? { id: currentItem._id, title: currentItem.title, estimatedMinutes: currentItem.estimatedMinutes, status: currentItem.status } : null,
    roadmap: roadmap ? {
      id: roadmap._id,
      title: roadmap.title,
      status: roadmap.status,
      progress: items.length ? Math.round((completed / items.length) * 100) : 0,
      currentItem: currentItem ? { id: currentItem._id, title: currentItem.title, status: currentItem.status } : null
    } : null,
    weakAreas: context.performance.topicsNeedingPractice.map((topic) => topic.name),
    performance: context.performance,
    recentAssessmentResults: context.performance.trend.slice(-5).reverse(),
    practiceRecommendations: context.performance.topicsNeedingPractice,
    reviewsDue: context.memory.recentlyDifficultItems,
    memory: context.memory,
    career: context.career,
    projects: context.career?.projects || [],
    nextAction: dashboardAction ? {
      id: dashboardAction.id,
      type: dashboardAction.type,
      title: dashboardAction.title,
      description: dashboardAction.description,
      reason: dashboardAction.reason,
      priority: dashboardAction.priorityScore,
      estimatedMinutes: dashboardAction.estimatedDurationMinutes,
      route: dashboardAction.route,
      navigation: dashboardAction.navigation,
      evidence: dashboardAction.evidence,
      confidence: dashboardAction.confidence,
      rankingReasons: dashboardAction.rankingReasons
    } : null,
    nextActions,
    academic: context.academic
  };
}
