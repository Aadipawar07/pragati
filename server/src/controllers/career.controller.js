import {
  createCareerGoal,
  getCareerAnalysis,
  getCareerContext,
  getCareerRoadmap,
  getCareerSkills,
  listCareerGoals,
  listCareerPaths,
  listCareerProjects,
  pauseCareerGoal,
  recordCareerSkillEvidence,
  startCareerProject,
  updateCareerGoal,
  updateCareerProject,
  updateCareerRoadmapItem
} from "../services/career.service.js";

const respond = (handler) => async (request, response, next) => {
  try {
    const data = await handler(request);
    response.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const paths = respond(() => listCareerPaths());
export const goals = respond((request) => listCareerGoals(request.user.id));
export const createGoal = respond((request) => createCareerGoal(request.user.id, request.body));
export const patchGoal = respond((request) => updateCareerGoal(request.user.id, request.params.goalId, request.body));
export const deleteGoal = respond((request) => pauseCareerGoal(request.user.id, request.params.goalId));
export const analysis = respond((request) => getCareerAnalysis(request.user.id, request.params.goalId));
export const roadmap = respond((request) => getCareerRoadmap(request.user.id, request.params.goalId));
export const recalculate = respond((request) => getCareerRoadmap(request.user.id, request.params.goalId, { recalculate: true }));
export const skills = respond((request) => getCareerSkills(request.user.id));
export const addSkillEvidence = respond((request) => recordCareerSkillEvidence(request.user.id, request.body));
export const roadmapItem = respond((request) => updateCareerRoadmapItem(request.user.id, request.params.itemId, request.body.status));
export const projects = respond((request) => listCareerProjects(request.user.id, request.params.goalId));
export const startProject = async (request, response, next) => {
  try {
    response.status(201).json({
      success: true,
      data: await startCareerProject(request.user.id, request.params.goalId, request.body.templateId)
    });
  } catch (error) {
    next(error);
  }
};
export const patchProject = respond((request) => updateCareerProject(request.user.id, request.params.projectId, request.body));
export const context = respond((request) => getCareerContext(request.user.id));
