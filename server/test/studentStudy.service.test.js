import assert from "node:assert/strict";
import test from "node:test";
import { Subject, Syllabus, Topic, Unit } from "../src/models/index.js";
import {
  archiveStudentSubject,
  createStudentSubject,
  createStudentTopic
} from "../src/services/studentContext.service.js";

function stub(target, key, value, t) {
  const original = target[key];
  target[key] = value;
  t.after(() => { target[key] = original; });
}

function selectable(value) {
  return { select() { return this; }, lean: async () => value };
}

test("manual subject creation reuses the student's manual workspace", async (t) => {
  const userId = "student-id";
  const workspace = { _id: "workspace-id" };
  let subjectInput;
  stub(Syllabus, "findOneAndUpdate", async (query, update, options) => {
    assert.deepEqual(query, { userId, sourceType: "manual" });
    assert.equal(update.$setOnInsert.sourceType, "manual");
    assert.equal(update.$setOnInsert.status, "ready");
    assert.equal(options.upsert, true);
    return workspace;
  }, t);
  stub(Subject, "findOne", () => selectable(null), t);
  stub(Subject, "countDocuments", async () => 0, t);
  stub(Subject, "create", async (input) => {
    subjectInput = input;
    return { ...input, _id: { toString: () => "subject-id" } };
  }, t);

  const result = await createStudentSubject(userId, { name: "  Biology  ", description: " Core " });
  assert.deepEqual(result, { id: "subject-id", name: "Biology", code: "", description: "Core" });
  assert.equal(subjectInput.userId, userId);
  assert.equal(subjectInput.syllabusId, workspace._id);
  assert.equal(subjectInput.order, 0);
});

test("repeating subject creation does not insert a duplicate", async (t) => {
  const workspace = { _id: "workspace-id" };
  let inserted = false;
  stub(Syllabus, "findOneAndUpdate", async () => workspace, t);
  stub(Subject, "findOne", () => selectable({ _id: "existing-subject" }), t);
  stub(Subject, "create", async () => { inserted = true; }, t);

  await assert.rejects(createStudentSubject("student-id", { name: "Biology" }), { status: 409, code: "CONFLICT" });
  assert.equal(inserted, false);
});

test("manual topic creation enforces subject ownership and references its workspace", async (t) => {
  const userId = "student-id";
  let topicInput;
  stub(Subject, "findOne", (query) => {
    assert.equal(query.userId, userId);
    assert.equal(query.status, "active");
    return selectable({ _id: "subject-id", syllabusId: "workspace-id" });
  }, t);
  stub(Topic, "findOne", () => selectable(null), t);
  stub(Topic, "countDocuments", async () => 0, t);
  stub(Topic, "create", async (input) => {
    topicInput = input;
    return { ...input, _id: { toString: () => "topic-id" }, subjectId: { toString: () => "subject-id" } };
  }, t);

  const result = await createStudentTopic(userId, "subject-id", { name: "  Cell division " });
  assert.deepEqual(result, { id: "topic-id", subjectId: "subject-id", name: "Cell division", description: "" });
  assert.equal(topicInput.userId, userId);
  assert.equal(topicInput.syllabusId, "workspace-id");
  assert.equal(topicInput.order, 0);
});

test("subject archive refuses records not owned by the student", async (t) => {
  stub(Subject, "findOneAndUpdate", () => ({ lean: async () => null }), t);
  stub(Topic, "updateMany", async () => { throw new Error("Must not archive another student's topics."); }, t);
  stub(Unit, "updateMany", async () => { throw new Error("Must not archive another student's units."); }, t);

  await assert.rejects(archiveStudentSubject("student-id", "other-subject"), { status: 404, code: "NOT_FOUND" });
});
