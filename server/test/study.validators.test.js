import assert from "node:assert/strict";
import test from "node:test";
import {
  validateStudySubject,
  validateStudySubjectId,
  validateStudyTopic,
  validateStudyTopicId
} from "../src/validators/study.validators.js";

function runValidator(validator, request) {
  let error;
  validator(request, {}, (nextError) => { error = nextError; });
  return error;
}

test("study validators accept valid manual subject and topic requests", () => {
  assert.equal(runValidator(validateStudySubject, { method: "POST", body: { name: " Data Structures ", description: "Core course" } }), undefined);
  assert.equal(runValidator(validateStudyTopic, { method: "POST", body: { name: "Trees" } }), undefined);
  assert.equal(runValidator(validateStudySubjectId, { params: { subjectId: "507f1f77bcf86cd799439011" } }), undefined);
  assert.equal(runValidator(validateStudyTopicId, { params: { topicId: "507f1f77bcf86cd799439011" } }), undefined);
});

test("study validators reject missing names, unknown fields, oversized values, and invalid identifiers", () => {
  assert.equal(runValidator(validateStudySubject, { method: "POST", body: { description: "No name" } }).status, 400);
  assert.equal(runValidator(validateStudyTopic, { method: "POST", body: { name: "   " } }).status, 400);
  assert.equal(runValidator(validateStudySubject, { method: "PATCH", body: { userId: "attacker" } }).status, 400);
  assert.equal(runValidator(validateStudyTopic, { method: "PATCH", body: { name: "x".repeat(121) } }).status, 400);
  assert.equal(runValidator(validateStudySubjectId, { params: { subjectId: "not-an-id" } }).status, 400);
  assert.equal(runValidator(validateStudyTopicId, { params: { topicId: "" } }).code, "NOT_FOUND");
});
