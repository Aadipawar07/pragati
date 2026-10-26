import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { CareerProject, Goal, Roadmap, RoadmapItem, StudentCareerSkill } from "../src/models/index.js";
import { getCareerPath } from "../src/config/careerCatalog.js";
import {
  calculateCareerGapAnalysis,
  createCareerGoal,
  getCareerAnalysis,
  getCareerRoadmap,
  listCareerProjects,
  startCareerProject
} from "../src/services/career.service.js";

const userId = new mongoose.Types.ObjectId().toString();
const goalId = new mongoose.Types.ObjectId();
const goal = {
  _id: goalId,
  userId: new mongoose.Types.ObjectId(userId),
  type: "career",
  title: "Frontend developer",
  careerDetails: { careerPathId: "frontend-developer", experienceLevel: "beginner", availableHoursPerWeek: 5 },
  status: "active",
  createdAt: new Date(),
  updatedAt: new Date()
};

function mockMethod(object, name, implementation, originals) {
  originals.push([object, name, object[name]]);
  object[name] = implementation;
}

function restoreMethods(originals) {
  for (const [object, name, original] of originals) object[name] = original;
}

test("gap analysis distinguishes claims, learning records, project evidence, and absent evidence", () => {
  const path = getCareerPath("frontend-developer");
  const records = [
    { skillId: "web-fundamentals", evidence: [{ source: "self_reported", detail: "Used HTML before" }] },
    { skillId: "javascript", evidence: [{ source: "practice", detail: "Completed a practice set" }, { source: "learning", detail: "Recorded a learning activity" }] },
    { skillId: "react", evidence: [{ source: "practice", detail: "One recorded practice activity" }] }
  ];
  const completedProjects = [{
    title: "Accessible task board",
    skillIds: ["api-integration"],
    completedAt: new Date("2026-10-20T00:00:00Z"),
    completionEvidence: "Recorded UI and error handling",
    repositoryUrl: null
  }];
  const analysis = calculateCareerGapAnalysis(goal, path, records, completedProjects);
  const byId = new Map(analysis.requiredSkills.map((item) => [item.id, item]));

  assert.equal(byId.get("web-fundamentals").state, "self_reported");
  assert.equal(byId.get("javascript").state, "developing");
  assert.equal(byId.get("api-integration").state, "demonstrated");
  assert.equal(byId.get("react").state, "insufficient_evidence");
  assert.equal(byId.get("testing").state, "not_yet_demonstrated");
  assert.match(byId.get("testing").explanation, /does not mean you lack the skill/i);
  assert.equal(byId.get("api-integration").evidence[0].independentlyVerified, false);
  assert.equal(analysis.nextAction.skillId, "web-fundamentals");
  assert.deepEqual(analysis.summary, { demonstrated: 1, developing: 1, insufficientEvidence: 1, selfReported: 1, notYetDemonstrated: 1 });
});

test("next actions and project suggestions respect the recorded experience stage", async () => {
  const path = getCareerPath("backend-developer");
  const beginnerGoal = {
    ...goal,
    title: "Backend developer",
    careerDetails: { careerPathId: path.id, experienceLevel: "beginner" }
  };
  const beginnerAnalysis = calculateCareerGapAnalysis(beginnerGoal, path, [], []);
  assert.equal(beginnerAnalysis.nextAction.route, "/career");

  const intermediateAnalysis = calculateCareerGapAnalysis({
    ...beginnerGoal,
    careerDetails: { careerPathId: path.id, experienceLevel: "intermediate" }
  }, path, [], []);
  assert.equal(intermediateAnalysis.nextAction.route, "/projects");

  const originals = [];
  let currentGoal = beginnerGoal;
  mockMethod(Goal, "findOne", () => ({ lean: async () => currentGoal }), originals);
  mockMethod(StudentCareerSkill, "find", () => ({ lean: async () => [] }), originals);
  mockMethod(CareerProject, "find", () => ({
    select() { return this; },
    sort() { return this; },
    limit() { return this; },
    lean: async () => []
  }), originals);

  try {
    const beginnerProjects = await listCareerProjects(userId, goalId.toString());
    assert.deepEqual(beginnerProjects.suggestions, []);

    currentGoal = {
      ...beginnerGoal,
      careerDetails: { careerPathId: path.id, experienceLevel: "intermediate" }
    };
    const intermediateProjects = await listCareerProjects(userId, goalId.toString());
    assert.deepEqual(intermediateProjects.suggestions.map((project) => project.id), ["secure-booking-api"]);
  } finally {
    restoreMethods(originals);
  }
});

test("supports custom career titles while leaving unconfigured requirements insufficient", async () => {
  const originals = [];
  let createdGoal;
  mockMethod(Goal, "countDocuments", async () => 0, originals);
  mockMethod(Goal, "create", async (input) => {
    createdGoal = { _id: goalId, ...input, createdAt: new Date(), updatedAt: new Date() };
    return createdGoal;
  }, originals);
  mockMethod(Goal, "findOne", () => ({ lean: async () => ({ ...createdGoal, careerDetails: { ...createdGoal.careerDetails } }) }), originals);

  try {
    const created = await createCareerGoal(userId, { title: "Sustainable product strategist" });
    const analysis = await getCareerAnalysis(userId, created.id);
    assert.equal(created.title, "Sustainable product strategist");
    assert.equal(createdGoal.careerDetails.careerPathId, null);
    assert.equal(analysis.state, "insufficient_data");
    assert.deepEqual(analysis.requiredSkills, []);
  } finally {
    restoreMethods(originals);
  }
});

test("career goal ownership is enforced before returning analysis", async () => {
  const originals = [];
  let query;
  mockMethod(Goal, "findOne", (filter) => {
    query = filter;
    return { lean: async () => null };
  }, originals);

  try {
    await assert.rejects(
      getCareerAnalysis(userId, goalId.toString()),
      (error) => error.status === 404 && error.code === "NOT_FOUND"
    );
    assert.equal(query.userId.toString(), userId);
    assert.equal(query.type, "career");
  } finally {
    restoreMethods(originals);
  }
});

test("roadmap recalculation is idempotent and retains completed milestones", async () => {
  const originals = [];
  const roadmapId = new mongoose.Types.ObjectId();
  const items = [{
    _id: new mongoose.Types.ObjectId(),
    userId: new mongoose.Types.ObjectId(userId),
    roadmapId,
    careerSkillId: "web-fundamentals",
    title: "Develop Web fundamentals",
    order: 0,
    status: "completed",
    rationale: "Already completed milestone"
  }];
  const roadmap = { _id: roadmapId, title: "Frontend career roadmap", status: "active", sourceVersion: "previous-version" };
  let inserts = 0;
  mockMethod(Goal, "findOne", () => ({ lean: async () => goal }), originals);
  mockMethod(StudentCareerSkill, "find", () => ({ lean: async () => [] }), originals);
  mockMethod(CareerProject, "find", () => ({
    select() { return this; },
    sort() { return this; },
    limit() { return this; },
    lean: async () => []
  }), originals);
  mockMethod(Roadmap, "findOne", () => ({ lean: async () => roadmap }), originals);
  mockMethod(Roadmap, "updateOne", async () => ({ modifiedCount: 1 }), originals);
  mockMethod(RoadmapItem, "find", () => ({
    sort() { return this; },
    lean: async () => items
  }), originals);
  mockMethod(RoadmapItem, "updateOne", async (filter, update) => {
    const existing = items.find((item) => item.careerSkillId === filter.careerSkillId);
    if (!existing) {
      inserts += 1;
      items.push({ _id: new mongoose.Types.ObjectId(), ...update.$setOnInsert });
    }
    return { upsertedCount: existing ? 0 : 1 };
  }, originals);

  try {
    const first = await getCareerRoadmap(userId, goalId.toString(), { recalculate: true });
    const second = await getCareerRoadmap(userId, goalId.toString(), { recalculate: true });
    assert.equal(inserts, 4);
    assert.equal(first.items.find((item) => item.careerSkillId === "web-fundamentals").status, "completed");
    assert.equal(second.items.length, 5);
    assert.equal(items.filter((item) => item.careerSkillId === "web-fundamentals").length, 1);
    assert.equal(first.items.filter((item) => item.status === "completed").length, 1);
  } finally {
    restoreMethods(originals);
  }
});

test("starting a suggested project creates a plan but no skill evidence", async () => {
  const originals = [];
  let projectDocument;
  let skillCreates = 0;
  mockMethod(Goal, "findOne", () => ({ lean: async () => goal }), originals);
  mockMethod(CareerProject, "findOne", () => ({ lean: async () => null }), originals);
  mockMethod(StudentCareerSkill, "find", () => ({ lean: async () => [] }), originals);
  mockMethod(CareerProject, "find", () => ({
    select() { return this; },
    sort() { return this; },
    limit() { return this; },
    lean: async () => []
  }), originals);
  mockMethod(CareerProject, "create", async (document) => {
    projectDocument = { _id: new mongoose.Types.ObjectId(), ...document, createdAt: new Date(), updatedAt: new Date() };
    return projectDocument;
  }, originals);
  mockMethod(StudentCareerSkill, "create", async () => { skillCreates += 1; }, originals);

  try {
    const project = await startCareerProject(userId, goalId.toString(), "accessible-task-board");
    assert.equal(project.status, "planned");
    assert.deepEqual(project.skillIds, ["web-fundamentals", "javascript", "react", "api-integration"]);
    assert.equal(skillCreates, 0);
  } finally {
    restoreMethods(originals);
  }
});
