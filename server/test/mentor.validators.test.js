import assert from "node:assert/strict";
import test from "node:test";
import { validateMentorRequest } from "../src/validators/mentor.validators.js";

function validate(body) {
  let error;
  validateMentorRequest({ body }, {}, (value) => { error = value; });
  return error || null;
}

test("accepts bounded mentor requests and rejects extra or oversized fields", () => {
  assert.equal(validate({ message: "Why is this action recommended?" }), null);
  assert.equal(validate({ message: "Help me", action: { route: "/admin" } }).status, 400);
  assert.equal(validate({ message: "x".repeat(2001) }).status, 400);
  assert.equal(validate({ message: " " }).status, 400);
});
