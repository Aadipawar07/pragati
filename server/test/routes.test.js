import assert from "node:assert/strict";
import test from "node:test";
import app from "../src/app.js";

test("syllabus analysis endpoints are no longer registered", async (t) => {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));

  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const responses = await Promise.all([
    fetch(`${baseUrl}/api/syllabus`),
    fetch(`${baseUrl}/api/syllabus`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }),
    fetch(`${baseUrl}/api/syllabus/507f1f77bcf86cd799439011/retry`, { method: "POST" })
  ]);
  assert.deepEqual(responses.map((response) => response.status), [404, 404, 404]);
});

test("manual study endpoints remain protected by authentication", async (t) => {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));

  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const [listResponse, createResponse] = await Promise.all([
    fetch(`${baseUrl}/api/student/subjects`),
    fetch(`${baseUrl}/api/student/subjects`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Biology" }) })
  ]);
  assert.equal(listResponse.status, 401);
  assert.equal(createResponse.status, 401);
});
