import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { once } from "node:events";
import { createSkillPilotCounters } from "../src/skillPilotCounters.js";

const fields = ["httpSamples", "mcpSamples", "skillReviews", "tests"];
const pilotKey = "veritas:skill-review-pilot:v1";
const fakeToken = "loopback-pilot-test-token";

function counts(snapshot) {
  return fields.map(field => snapshot[field]);
}

test("pilot counters store only fixed aggregates in Redis and survive store recreation", async t => {
  const hash = new Map();
  const requests = [];
  let unavailableCommand;
  const redis = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const command = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    requests.push({ method: req.method, authorization: req.headers.authorization, command });
    const [operation, key, ...args] = command;
    if (operation === unavailableCommand || key !== pilotKey) {
      res.writeHead(503);
      return res.end();
    }

    let result;
    if (operation === "HMGET") {
      result = args.map(field => hash.has(field) ? String(hash.get(field)) : null);
    } else if (operation === "HINCRBY") {
      const [field, increment] = args;
      result = (hash.get(field) || 0) + Number(increment);
      hash.set(field, result);
    } else {
      res.writeHead(400);
      return res.end();
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ result }));
  });
  redis.listen(0, "127.0.0.1");
  t.after(() => new Promise((resolve, reject) => redis.close(error => error ? reject(error) : resolve())));
  await once(redis, "listening");
  process.env.UPSTASH_REDIS_REST_URL = "http://127.0.0.1:" + redis.address().port;
  process.env.UPSTASH_REDIS_REST_TOKEN = fakeToken;
  t.after(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  const local = createSkillPilotCounters();
  await local.record("tests");
  assert.deepEqual(counts(await local.snapshot()), [0, 0, 0, 1]);
  assert.equal(requests.length, 0, "local mode must never use the configured Redis");

  const first = createSkillPilotCounters({ useUpstash: true });
  const initial = await first.snapshot();
  assert.equal(initial.storage, "upstash-redis");
  assert.equal(initial.writeErrors, 0);
  assert.deepEqual(counts(initial), [0, 0, 0, 0]);

  const second = createSkillPilotCounters({ useUpstash: true });
  await Promise.all([
    first.record("httpSamples"),
    second.record("httpSamples"),
    first.record("mcpSamples"),
    first.record("skillReviews"),
    second.record("skillReviews"),
    second.record("tests"),
  ]);

  const restarted = createSkillPilotCounters({ useUpstash: true });
  const afterRestart = await restarted.snapshot();
  assert.equal(afterRestart.storage, "upstash-redis");
  assert.equal(afterRestart.writeErrors, 0);
  assert.deepEqual(counts(afterRestart), [2, 1, 2, 1]);

  unavailableCommand = "HINCRBY";
  await restarted.record("httpSamples");
  let snapshot = await restarted.snapshot();
  assert.equal(snapshot.writeErrors, 1);
  assert.deepEqual(counts(snapshot), [2, 1, 2, 1]);

  unavailableCommand = "HMGET";
  snapshot = await restarted.snapshot();
  assert.equal(snapshot.storage, "upstash-redis");
  assert.deepEqual(counts(snapshot), [null, null, null, null]);

  unavailableCommand = undefined;
  assert.deepEqual(counts(await restarted.snapshot()), [2, 1, 2, 1]);

  for (const request of requests) {
    assert.equal(request.method, "POST");
    assert.equal(request.authorization, "Bearer " + fakeToken);
    if (request.command[0] === "HINCRBY") {
      assert.ok(fields.includes(request.command[2]));
      assert.deepEqual(request.command, ["HINCRBY", pilotKey, request.command[2], 1]);
    } else {
      assert.deepEqual(request.command, ["HMGET", pilotKey, ...fields]);
    }
  }
  assert.equal(requests.filter(({ command }) => command[0] === "HINCRBY").length, 7);
});

