import mongoose from "mongoose";
import { CareerProject, Goal, Roadmap, RoadmapItem, StudentCareerSkill } from "../models/index.js";
import {
  CAREER_CATALOG_VERSION,
  careerPaths,
  careerProjects,
  getCareerPath,
  getCareerPathDTO,
  getCareerSkill
} from "../config/careerCatalog.js";

const goalFields = ["title", "careerPathId", "category", "experienceLevel", "preferredIndustries", "shortTermGoal", "longTermGoal", "availableHoursPerWeek", "targetMilestone", "preferredProjectTypes", "existingExperience", "deadline", "status"];

export function listCareerPaths() {
  return careerPaths.map(getCareerPathDTO);
}

export async function listCareerGoals(userId) {
  const goals = await Goal.find({ userId, type: "career" }).sort({ createdAt: -1 }).limit(30).lean();
  return goals.map(goalDTO);
}

export async function createCareerGoal(userId, input) {
  const activeGoalCount = await Goal.countDocuments({ userId, type: "career", status: "active" });
  if (activeGoalCount >= 10) throw conflict("You can have up to 10 active career goals.");
  const details = normalizeCareerDetails(input);
  const goal = await Goal.create({
    userId,
    type: "career",
    title: input.title.trim(),
    description: input.shortTermGoal?.trim() || "",
    target: input.targetMilestone?.trim() || "",
    deadline: input.deadline || null,
    careerDetails: details,
    status: "active"
  });
  return goalDTO(goal);
}

export async function updateCareerGoal(userId, goalId, input) {
  const updates = {};
  if (input.title !== undefined) updates.title = input.title.trim();
  if (input.description !== undefined) updates.description = input.description.trim();
  if (input.targetMilestone !== undefined) updates.target = input.targetMilestone.trim();
  if (input.deadline !== undefined) updates.deadline = input.deadline || null;
  if (input.status !== undefined) {
    if (input.status === "active") {
      const current = await Goal.findOne({ _id: goalId, userId, type: "career" }).select("status").lean();
      if (!current) throw notFound("Career goal not found.");
      if (current.status !== "active" && await Goal.countDocuments({ userId, type: "career", status: "active" }) >= 10) {
        throw conflict("You can have up to 10 active career goals.");
      }
    }
    updates.status = input.status;
  }
  const careerFields = goalFields.filter((field) => !["title", "deadline", "status"].includes(field));
  if (careerFields.some((field) => input[field] !== undefined)) {
    const current = await Goal.findOne({ _id: goalId, userId, type: "career" }).lean();
    if (!current) throw notFound("Career goal not found.");
    updates.careerDetails = { ...current.careerDetails, ...normalizeCareerDetails({ ...current.careerDetails, ...input }) };
  }
  const goal = await Goal.findOneAndUpdate(
    { _id: goalId, userId, type: "career" },
    { $set: updates },
    { new: true, runValidators: true }
  ).lean();
  if (!goal) throw notFound("Career goal not found.");
  return goalDTO(goal);
}

export async function pauseCareerGoal(userId, goalId) {
  const goal = await Goal.findOneAndUpdate(
    { _id: goalId, userId, type: "career" },
    { $set: { status: "paused" } },
    { new: true }
  ).lean();
  if (!goal) throw notFound("Career goal not found.");
  return goalDTO(goal);
}

export async function getCareerSkills(userId) {
  const [records, projects] = await Promise.all([
    StudentCareerSkill.find({ userId }).sort({ updatedAt: -1 }).lean(),
    CareerProject.find({ userId, status: "completed" }).select("title skillIds completedAt completionEvidence repositoryUrl").sort({ completedAt: -1 }).limit(100).lean()
  ]);
  const projectsBySkill = groupProjectsBySkill(projects);
  const recordsBySkill = new Map(records.map((record) => [record.skillId, record]));
  const skillIds = new Set([...recordsBySkill.keys(), ...projectsBySkill.keys()]);
  return [...skillIds].map((skillId) => {
    const record = recordsBySkill.get(skillId) || { _id: skillId, skillId, evidence: [] };
    return skillRecordDTO(record, projectsBySkill.get(skillId) || []);
  });
}

export async function recordCareerSkillEvidence(userId, input) {
  if (!getCareerSkill(input.skillId)) throw validationError("Choose a skill from the configured career catalog.");
  const record = await StudentCareerSkill.findOne({ userId, skillId: input.skillId });
  const entry = {
    source: input.source,
    detail: input.detail?.trim() || "",
    recordedAt: new Date()
  };
  if (!record) {
    try {
      const created = await StudentCareerSkill.create({ userId, skillId: input.skillId, evidence: [entry] });
      return skillRecordDTO(created.toObject(), []);
    } catch (error) {
      if (error.code !== 11000) throw error;
    }
  }
  const existing = record || await StudentCareerSkill.findOne({ userId, skillId: input.skillId });
  if (existing.evidence.length >= 30) throw conflict("This skill has reached its evidence-record limit.");
  if (input.source === "self_reported") {
    const claim = existing.evidence.find((item) => item.source === "self_reported");
    if (claim) {
      claim.detail = entry.detail;
      claim.recordedAt = entry.recordedAt;
    } else {
      existing.evidence.push(entry);
    }
  } else {
    existing.evidence.push(entry);
  }
  await existing.save();
  const projects = await CareerProject.find({ userId, status: "completed", skillIds: input.skillId })
    .select("title skillIds completedAt completionEvidence repositoryUrl").limit(100).lean();
  return skillRecordDTO(existing.toObject(), projects);
}

export async function getCareerAnalysis(userId, goalId) {
  const goal = await getOwnedCareerGoal(userId, goalId);
  const path = goal.careerDetails?.careerPathId ? getCareerPath(goal.careerDetails.careerPathId) : null;
  const requirementIds = path?.skills.map((item) => item.skillId) || [];
  if (!path || !requirementIds.length) {
    return {
      goal: goalDTO(goal),
      state: "insufficient_data",
      message: "This custom career direction has no configured skill requirements yet. Add a configured career path or use your goal and project records as a starting point.",
      catalogVersion: CAREER_CATALOG_VERSION,
      provenance: catalogProvenance(),
      requiredSkills: [],
      priorityGaps: [],
      nextAction: null,
      summary: { demonstrated: 0, developing: 0, insufficientEvidence: 0, selfReported: 0, notYetDemonstrated: 0 }
    };
  }
  const [records, completedProjects] = await Promise.all([
    StudentCareerSkill.find({ userId, skillId: { $in: requirementIds } }).lean(),
    CareerProject.find({ userId, status: "completed", skillIds: { $in: requirementIds } })
      .select("title skillIds completedAt completionEvidence repositoryUrl").sort({ completedAt: -1 }).limit(100).lean()
  ]);
  const analysis = calculateCareerGapAnalysis(goal, path, records, completedProjects);
  return { ...analysis, catalogVersion: CAREER_CATALOG_VERSION, provenance: catalogProvenance() };
}

export function calculateCareerGapAnalysis(goal, path, records, completedProjects) {
  const recordBySkill = new Map(records.map((record) => [record.skillId, record]));
  const projectsBySkill = groupProjectsBySkill(completedProjects);
  const requiredSkills = path.skills.map((requirement, index) => {
    const definition = getCareerSkill(requirement.skillId);
    const record = recordBySkill.get(requirement.skillId);
    const evidence = record?.evidence || [];
    const projects = projectsBySkill.get(requirement.skillId) || [];
    const state = skillEvidenceState(evidence, projects);
    const importance = requirement.importance;
    const priority = state === "demonstrated" ? null : importance === "core" ? "high" : "medium";
    const missingPrerequisites = (requirement.prerequisites || []).filter((skillId) => {
      const prereqProjects = projectsBySkill.get(skillId) || [];
      const prereqEvidence = recordBySkill.get(skillId)?.evidence || [];
      return !prereqProjects.length && !prereqEvidence.some((entry) => entry.source === "practice" || entry.source === "learning");
    });
    return {
      ...definition,
      importance,
      order: index + 1,
      state,
      priority,
      evidenceCount: evidence.length + projects.length,
      evidence: [
        ...evidence.map((entry) => ({ source: entry.source, detail: entry.detail || "", recordedAt: entry.recordedAt, independentlyVerified: false })),
        ...projects.map((project) => ({ source: "completed_project", detail: project.title, recordedAt: project.completedAt, independentlyVerified: false, repositoryUrl: project.repositoryUrl || null }))
      ],
      missingPrerequisites,
      explanation: analysisExplanation(state, importance, missingPrerequisites),
      recommendedAction: definition.action
    };
  });
  const priorityGaps = requiredSkills.filter((item) => item.state !== "demonstrated").sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority] || a.order - b.order;
  });
  const summary = {
    demonstrated: requiredSkills.filter((item) => item.state === "demonstrated").length,
    developing: requiredSkills.filter((item) => item.state === "developing").length,
    insufficientEvidence: requiredSkills.filter((item) => item.state === "insufficient_evidence").length,
    selfReported: requiredSkills.filter((item) => item.state === "self_reported").length,
    notYetDemonstrated: requiredSkills.filter((item) => item.state === "not_yet_demonstrated").length
  };
  const nextGap = priorityGaps[0];
  const hasSupportingProject = nextGap && (careerProjects[path.id] || []).some((project) =>
    project.skillIds.includes(nextGap.id) && projectFitsStage(project, goal.careerDetails?.experienceLevel)
  );
  return {
    goal: goalDTO(goal),
    state: "available",
    message: "These are configured learning requirements, not a hiring assessment or proof of job readiness.",
    requiredSkills,
    priorityGaps,
    nextAction: nextGap ? buildNextAction(nextGap, goal.careerDetails?.availableHoursPerWeek, hasSupportingProject) : null,
    summary
  };
}

export async function getCareerRoadmap(userId, goalId, { recalculate = false } = {}) {
  const goal = await getOwnedCareerGoal(userId, goalId);
  const path = goal.careerDetails?.careerPathId ? getCareerPath(goal.careerDetails.careerPathId) : null;
  if (!path) return { goal: goalDTO(goal), state: "insufficient_data", items: [], progress: 0, message: "Choose a configured career path to generate skill-linked roadmap milestones." };
  const analysis = await getCareerAnalysis(userId, goalId);
  let roadmap = await Roadmap.findOne({ userId, kind: "career", careerGoalId: goalId }).lean();
  const createdRoadmap = !roadmap;
  if (!roadmap) {
    roadmap = await Roadmap.create({
      userId,
      kind: "career",
      careerGoalId: goalId,
      sourceVersion: CAREER_CATALOG_VERSION,
      title: `${goal.title} career roadmap`,
      goal: goal.title,
      status: "active",
      progress: 0
    });
    roadmap = roadmap.toObject();
  }
  if (createdRoadmap || recalculate || roadmap.sourceVersion !== CAREER_CATALOG_VERSION) {
    const existingItems = await RoadmapItem.find({ userId, roadmapId: roadmap._id }).lean();
    const existingSkillIds = new Set(existingItems.map((item) => item.careerSkillId).filter(Boolean));
    const currentSkills = new Map(analysis.requiredSkills.map((item) => [item.id, item]));
    const newItems = path.skills.flatMap((requirement, index) => {
      const state = currentSkills.get(requirement.skillId)?.state;
      if (existingSkillIds.has(requirement.skillId) || state === "demonstrated") return [];
      const definition = getCareerSkill(requirement.skillId);
      return [{
        userId,
        roadmapId: roadmap._id,
        careerSkillId: requirement.skillId,
        title: `Develop ${definition.name}`,
        type: "career_skill",
        order: index,
        status: "pending",
        rationale: `${requirement.importance === "core" ? "Core" : "Supporting"} configured requirement for ${goal.title}. ${analysis.requiredSkills.find((item) => item.id === requirement.skillId)?.explanation || ""}`,
        actionRoute: (careerProjects[path.id] || []).some((project) =>
          project.skillIds.includes(requirement.skillId) && projectFitsStage(project, goal.careerDetails?.experienceLevel)
        ) ? "/projects" : "/career"
      }];
    });
    await Promise.all(newItems.map(async (item) => {
      try {
        await RoadmapItem.updateOne(
          { userId, roadmapId: roadmap._id, careerSkillId: item.careerSkillId },
          { $setOnInsert: item },
          { upsert: true, runValidators: true }
        );
      } catch (error) {
        if (error.code !== 11000) throw error;
        const duplicate = await RoadmapItem.findOne({ userId, roadmapId: roadmap._id, careerSkillId: item.careerSkillId }).select("_id").lean();
        if (!duplicate) throw error;
      }
    }));
    await Roadmap.updateOne({ _id: roadmap._id, userId }, { $set: { sourceVersion: CAREER_CATALOG_VERSION } });
  }
  const items = await RoadmapItem.find({ userId, roadmapId: roadmap._id }).sort({ order: 1, createdAt: 1 }).lean();
  const completedCount = items.filter((item) => item.status === "completed").length;
  const progress = items.length ? Math.round((completedCount / items.length) * 100) : 100;
  await Roadmap.updateOne({ _id: roadmap._id, userId }, { $set: { progress } });
  return {
    goal: goalDTO(goal),
    state: "available",
    roadmap: { id: roadmap._id.toString(), title: roadmap.title, status: roadmap.status, progress, sourceVersion: CAREER_CATALOG_VERSION },
    items: items.map((item) => ({
      id: item._id.toString(),
      title: item.title,
      type: item.type,
      careerSkillId: item.careerSkillId || null,
      status: item.status,
      rationale: item.rationale || "",
      actionRoute: item.actionRoute || null,
      order: item.order
    }))
  };
}

export async function updateCareerRoadmapItem(userId, itemId, status) {
  const item = await RoadmapItem.findOne({ _id: itemId, userId }).lean();
  if (!item) throw notFound("Career roadmap item not found.");
  if (item.status === "completed" && status !== "completed") throw conflict("Completed roadmap milestones cannot be moved back to an incomplete state.");
  const roadmap = await Roadmap.findOne({ _id: item.roadmapId, userId, kind: "career" }).lean();
  if (!roadmap) throw notFound("Career roadmap item not found.");
  const updated = await RoadmapItem.findOneAndUpdate(
    { _id: itemId, userId, roadmapId: roadmap._id },
    { $set: { status, completedAt: status === "completed" ? new Date() : null } },
    { new: true, runValidators: true }
  ).lean();
  return { id: updated._id.toString(), status: updated.status, completedAt: updated.completedAt };
}

export async function listCareerProjects(userId, goalId) {
  const goal = await getOwnedCareerGoal(userId, goalId);
  const path = goal.careerDetails?.careerPathId ? getCareerPath(goal.careerDetails.careerPathId) : null;
  const [saved, analysis] = await Promise.all([
    CareerProject.find({ userId, goalId }).sort({ createdAt: -1 }).limit(100).lean(),
    getCareerAnalysis(userId, goalId)
  ]);
  const gapIds = new Set(analysis.priorityGaps.map((item) => item.id));
  const suggestions = (careerProjects[path?.id] || [])
    .filter((template) => template.skillIds.some((skillId) => gapIds.has(skillId)))
    .filter((template) => projectFitsStage(template, goal.careerDetails?.experienceLevel))
    .map((template) => ({ ...template, kind: "suggestion" }));
  return {
    goal: goalDTO(goal),
    state: path ? "available" : "insufficient_data",
    message: path ? "Suggestions are configured learning exercises, not records of completed work." : "Choose a configured career path to see career-linked project suggestions.",
    suggestions,
    projects: saved.map(projectDTO)
  };
}

export async function startCareerProject(userId, goalId, templateId) {
  const goal = await getOwnedCareerGoal(userId, goalId);
  const pathId = goal.careerDetails?.careerPathId;
  const template = (careerProjects[pathId] || []).find((item) => item.id === templateId);
  if (!template) throw notFound("Project suggestion not found for this career goal.");
  if (!projectFitsStage(template, goal.careerDetails?.experienceLevel)) throw conflict("This configured project is above the experience stage recorded for this goal.");
  const existing = await CareerProject.findOne({ userId, goalId, templateId }).lean();
  if (existing) return projectDTO(existing);
  const analysis = await getCareerAnalysis(userId, goalId);
  const currentGapIds = new Set(analysis.priorityGaps.map((item) => item.id));
  if (!template.skillIds.some((skillId) => currentGapIds.has(skillId))) {
    throw conflict("This configured project no longer addresses a recorded skill gap for the selected career goal.");
  }
  try {
    const project = await CareerProject.create({
      userId,
      goalId,
      templateId,
      title: template.title,
      problem: template.problem,
      skillIds: template.skillIds,
      deliverables: template.deliverables,
      completionCriteria: template.completionCriteria,
      rationale: template.rationale,
      level: template.level,
      status: "planned"
    });
    return projectDTO(project);
  } catch (error) {
    if (error.code !== 11000) throw error;
    const project = await CareerProject.findOne({ userId, goalId, templateId }).lean();
    if (!project) throw error;
    return projectDTO(project);
  }
}

export async function updateCareerProject(userId, projectId, input) {
  const project = await CareerProject.findOne({ _id: projectId, userId }).lean();
  if (!project) throw notFound("Career project not found.");
  if (project.status === "completed" && input.status && input.status !== "completed") {
    throw conflict("Completed project evidence cannot be moved back to an incomplete state.");
  }
  const updates = {};
  if (input.status !== undefined) updates.status = input.status;
  if (input.completionEvidence !== undefined) updates.completionEvidence = input.completionEvidence.trim();
  if (input.repositoryUrl !== undefined) updates.repositoryUrl = input.repositoryUrl.trim() || null;
  if (input.status === "completed") {
    if (!input.completionEvidence?.trim() || input.completionEvidence.trim().length < 20) throw validationError("Add a completion note of at least 20 characters before recording this project as complete.");
    updates.completedAt = project.completedAt || new Date();
  } else if (input.status && project.status === "completed") {
    updates.completedAt = null;
  }
  const updated = await CareerProject.findOneAndUpdate(
    { _id: projectId, userId },
    { $set: updates },
    { new: true, runValidators: true }
  ).lean();
  return projectDTO(updated);
}

export async function getCareerContext(userId) {
  const goal = await Goal.findOne({ userId, type: "career", status: "active" }).sort({ updatedAt: -1 }).lean();
  if (!goal) return { state: "no_goal", goal: null, nextAction: { title: "Choose a career direction", reason: "Career recommendations are based on a goal you choose, not an inferred ambition.", route: "/career" } };
  const analysis = await getCareerAnalysis(userId, goal._id.toString());
  const [roadmap, projects] = await Promise.all([
    Roadmap.findOne({ userId, kind: "career", careerGoalId: goal._id }).lean(),
    CareerProject.find({ userId, goalId: goal._id, status: { $in: ["in_progress", "completed"] } })
      .select("title status completedAt").sort({ updatedAt: -1 }).limit(5).lean()
  ]);
  const nextItem = roadmap
    ? await RoadmapItem.findOne({ userId, roadmapId: roadmap._id, status: { $in: ["in_progress", "pending"] } }).sort({ order: 1 }).select("title careerSkillId actionRoute rationale").lean()
    : null;
  const priority = analysis.priorityGaps[0];
  const projectTemplate = priority
    ? (careerProjects[goal.careerDetails?.careerPathId] || []).find((item) =>
      item.skillIds.includes(priority.id) && projectFitsStage(item, goal.careerDetails?.experienceLevel)
    )
    : null;
  const inProgressProject = projects.find((project) => project.status === "in_progress");
  const nextAction = inProgressProject
    ? { title: `Continue ${inProgressProject.title}`, reason: "This career-linked project is recorded as in progress.", route: "/projects" }
    : nextItem
      ? { title: nextItem.title, reason: nextItem.rationale || "This is the next pending career roadmap milestone.", route: nextItem.actionRoute || "/career/roadmap" }
      : projectTemplate
        ? { title: `Start ${projectTemplate.title}`, reason: `This configured project practises ${priority.name}, the highest-priority gap in your selected path.`, route: "/projects" }
        : priority
          ? { title: `Develop ${priority.name}`, reason: priority.explanation, route: "/career" }
          : analysis.state === "insufficient_data"
            ? { title: "Configure a career path", reason: analysis.message, route: "/career" }
            : { title: "Review your career progress", reason: "All configured skill requirements have student-recorded project evidence.", route: "/career" };
  return {
    state: analysis.state,
    goal: { id: goal._id.toString(), title: goal.title, category: goal.careerDetails?.category || null },
    roadmap: roadmap ? { id: roadmap._id.toString(), title: roadmap.title, progress: roadmap.progress } : null,
    summary: analysis.summary,
    priorityGap: priority ? { skillId: priority.id, name: priority.name, state: priority.state, priority: priority.priority } : null,
    nextAction,
    projects: projects.map((project) => ({ title: project.title, status: project.status, completedAt: project.completedAt || null })),
    recentDemonstrations: analysis.requiredSkills.filter((item) => item.state === "demonstrated").slice(0, 5).map((item) => ({ skillId: item.id, name: item.name }))
  };
}

async function getOwnedCareerGoal(userId, goalId) {
  if (!mongoose.Types.ObjectId.isValid(goalId)) throw notFound("Career goal not found.");
  const goal = await Goal.findOne({ _id: goalId, userId, type: "career" }).lean();
  if (!goal) throw notFound("Career goal not found.");
  return goal;
}

function normalizeCareerDetails(input) {
  const pathId = input.careerPathId?.trim() || null;
  if (pathId && !getCareerPath(pathId)) throw validationError("Choose a configured career path or leave the path empty for a custom direction.");
  return {
    careerPathId: pathId,
    category: input.category?.trim() || getCareerPath(pathId)?.category || null,
    experienceLevel: input.experienceLevel || "exploring",
    preferredIndustries: input.preferredIndustries || [],
    shortTermGoal: input.shortTermGoal?.trim() || "",
    longTermGoal: input.longTermGoal?.trim() || "",
    availableHoursPerWeek: input.availableHoursPerWeek || null,
    targetMilestone: input.targetMilestone?.trim() || "",
    preferredProjectTypes: input.preferredProjectTypes || [],
    existingExperience: input.existingExperience?.trim() || ""
  };
}

function goalDTO(goal) {
  return {
    id: goal._id.toString(),
    title: goal.title,
    description: goal.description || "",
    target: goal.target || "",
    deadline: goal.deadline || null,
    status: goal.status,
    createdAt: goal.createdAt,
    updatedAt: goal.updatedAt,
    careerDetails: goal.careerDetails || {}
  };
}

function skillRecordDTO(record, projects) {
  const evidence = record.evidence || [];
  const state = skillEvidenceState(evidence, projects);
  return {
    id: record._id?.toString() || record.skillId,
    skillId: record.skillId,
    skill: getCareerSkill(record.skillId),
    state,
    evidence: [
      ...evidence.map((item) => ({ id: item._id?.toString(), source: item.source, detail: item.detail || "", recordedAt: item.recordedAt, independentlyVerified: false })),
      ...projects.map((project) => ({ source: "completed_project", detail: project.title, recordedAt: project.completedAt, independentlyVerified: false, repositoryUrl: project.repositoryUrl || null }))
    ],
    evidenceCount: evidence.length + projects.length,
    lastDemonstratedAt: projects[0]?.completedAt || null
  };
}

function groupProjectsBySkill(projects) {
  const map = new Map();
  for (const project of projects) {
    for (const skillId of project.skillIds || []) {
      if (!map.has(skillId)) map.set(skillId, []);
      map.get(skillId).push(project);
    }
  }
  return map;
}

function analysisExplanation(state, importance, missingPrerequisites) {
  const priorityLabel = importance === "core" ? "Core" : "Supporting";
  if (state === "demonstrated") return "A completed, student-recorded related project is linked as evidence. The record is not independently verified.";
  if (missingPrerequisites.length) return `${priorityLabel} configured requirement. Prerequisite evidence is also missing for: ${missingPrerequisites.join(", ")}.`;
  if (state === "insufficient_evidence") return `${priorityLabel} configured requirement with one student-recorded learning or practice entry; more evidence is needed.`;
  if (state === "developing") return `${priorityLabel} configured requirement with student-recorded learning or practice evidence; more evidence is needed to mark it demonstrated.`;
  if (state === "self_reported") return `${priorityLabel} configured requirement. You reported this skill, but there is no learning, practice, or project evidence recorded yet.`;
  return `${priorityLabel} configured requirement with no supporting evidence recorded yet. This does not mean you lack the skill.`;
}

function skillEvidenceState(evidence, projects) {
  if (projects.length) return "demonstrated";
  const learningRecords = evidence.filter((item) => ["practice", "learning"].includes(item.source)).length;
  if (learningRecords >= 2) return "developing";
  if (learningRecords === 1) return "insufficient_evidence";
  if (evidence.some((item) => item.source === "self_reported")) return "self_reported";
  return "not_yet_demonstrated";
}

function buildNextAction(gap, hoursPerWeek, hasSupportingProject) {
  return {
    skillId: gap.id,
    title: `Develop ${gap.name}`,
    reason: gap.explanation,
    action: gap.recommendedAction,
    measure: gap.measurement,
    availableHoursPerWeek: hoursPerWeek || null,
    route: hasSupportingProject ? "/projects" : "/career"
  };
}

function projectFitsStage(project, experienceLevel = "exploring") {
  const ranks = { exploring: 1, beginner: 1, intermediate: 2, experienced: 3 };
  return (ranks[project.level] || 3) <= (ranks[experienceLevel] || 1);
}

function projectDTO(project) {
  return {
    id: project._id.toString(),
    goalId: project.goalId.toString(),
    templateId: project.templateId,
    title: project.title,
    problem: project.problem,
    skillIds: project.skillIds,
    deliverables: project.deliverables,
    completionCriteria: project.completionCriteria,
    rationale: project.rationale,
    level: project.level,
    status: project.status,
    completionEvidence: project.completionEvidence || "",
    repositoryUrl: project.repositoryUrl || "",
    completedAt: project.completedAt || null,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt
  };
}

function catalogProvenance() {
  return "Pragati-configured educational guidance; not an official industry standard or live labor-market source.";
}

function validationError(message) {
  const error = new Error(message);
  error.status = 400;
  error.code = "VALIDATION_ERROR";
  return error;
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
