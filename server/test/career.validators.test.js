import assert from "node:assert/strict";
import test from "node:test";
import {
  validateCareerGoal,
  validateCareerProjectUpdate,
  validateCareerSkillEvidence
} from "../src/validators/career.validators.js";

function runValidation(validator, request) {
  let result;
  validator(request, {}, (error) => { result = error || null; });
  return result;
}

test("accepts custom career titles and rejects unsupported taxonomy or input fields", () => {
  assert.equal(runValidation(validateCareerGoal, { body: { title: "Product designer" } }), null);
  assert.equal(runValidation(validateCareerGoal, {
    body: { title: "Product designer", careerPathId: "unconfigured-path" }
  }).status, 400);
  assert.equal(runValidation(validateCareerGoal, {
    body: { title: "Product designer", verifiedSkillIds: ["react"] }
  }).status, 400);
  assert.equal(runValidation(validateCareerGoal, {
    body: { title: "Product designer", status: "completed" }
  }).status, 400);
});

test("skill evidence cannot directly set demonstrated or verified status", () => {
  assert.equal(runValidation(validateCareerSkillEvidence, {
    body: { skillId: "react", source: "self_reported", detail: "Used in a class" }
  }), null);
  assert.equal(runValidation(validateCareerSkillEvidence, {
    body: { skillId: "react", source: "completed_project" }
  }).status, 400);
  assert.equal(runValidation(validateCareerSkillEvidence, {
    body: { skillId: "react", source: "practice", proficiencyEstimate: 100 }
  }).status, 400);
});

test("project completion requires a student-recorded completion note and safe URL", () => {
  assert.equal(runValidation(validateCareerProjectUpdate, {
    body: { status: "completed", completionEvidence: "Recorded completed deliverables and outcomes." }
  }), null);
  assert.equal(runValidation(validateCareerProjectUpdate, {
    body: { status: "completed" }
  }).status, 400);
  assert.equal(runValidation(validateCareerProjectUpdate, {
    body: { status: "completed", completionEvidence: "done" }
  }).status, 400);
  assert.equal(runValidation(validateCareerProjectUpdate, {
    body: { repositoryUrl: "javascript:alert(1)" }
  }).status, 400);
});
