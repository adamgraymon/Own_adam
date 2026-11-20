import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { once } from "node:events";
import { createSkillPilotCounters } from "../src/skillPilotCounters.js";
import { createCatalogReadCounters } from "../src/catalogReadCounters.js";
import { createTrafficCounters } from "../src/trafficCounters.js";

const fields = ["httpSamples", "mcpSamples", "skillReviews", "tests"];
const pilotKey = "veritas:skill-review-pilot:v1";
const catalogKey = "veritas:catalog-reads:v1";
const catalogFields = [
  "auditedServers:http", "auditedServers:mcp", "auditedServers:tests",
  "evaluatedSkills:http", "evaluatedSkills:mcp", "evaluatedSkills:tests",
  "commercialCatalog:http", "commercialCatalog:mcp", "commercialCatalog:tests",
];
const fakeToken = "loopback-pilot-test-token";

function counts(snapshot) {
  return fields.map(field => snapshot[field]);
}

test("pilot and catalog counters store separate fixed aggregates in Redis and survive store recreation", async t => {
  const hashes = new Map([[pilotKey, new Map()], [catalogKey, new Map()]]);
  const requests = [];
  let unavailableCommand;
  const redis = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const command = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    requests.push({ method: req.method, authorization: req.headers.authorization, command });
    const [operation, key, ...args] = command;
    const hash = hashes.get(key);
    if (operation === unavailableCommand || !hash) {
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
  const localCatalog = createCatalogReadCounters();
  await localCatalog.record("auditedServers", "http");
  const localCatalogTotals = await localCatalog.snapshot();
  assert.equal(localCatalogTotals.storage, "memory");
  assert.deepEqual(localCatalogTotals.auditedServers, { http: 1, mcp: 0, tests: 0 });
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

  const catalog = createCatalogReadCounters({ useUpstash: true });
  const initialCatalog = await catalog.snapshot();
  assert.deepEqual(initialCatalog, {
    auditedServers: { http: 0, mcp: 0, tests: 0 },
    evaluatedSkills: { http: 0, mcp: 0, tests: 0 },
    commercialCatalog: { http: 0, mcp: 0, tests: 0 },
    storage: "upstash-redis",
    writeErrors: 0,
  });

  await Promise.all([
    catalog.record("auditedServers", "http"),
    catalog.record("auditedServers", "http"),
    catalog.record("auditedServers", "mcp"),
    catalog.record("evaluatedSkills", "tests"),
    catalog.record("commercialCatalog", "mcp"),
    catalog.record("commercialCatalog", "http"),
    catalog.record("commercialCatalog", "tests"),
    catalog.record("unknown", "http"),
    catalog.record("auditedServers", "unknown"),
  ]);
  const restartedCatalog = createCatalogReadCounters({ useUpstash: true });
  assert.deepEqual(await restartedCatalog.snapshot(), {
    auditedServers: { http: 2, mcp: 1, tests: 0 },
    evaluatedSkills: { http: 0, mcp: 0, tests: 1 },
    commercialCatalog: { http: 1, mcp: 1, tests: 1 },
    storage: "upstash-redis",
    writeErrors: 0,
  });
  assert.deepEqual(counts(await restarted.snapshot()), [2, 1, 2, 1]);

  for (const { method, authorization, command } of requests) {
    assert.equal(method, "POST");
    assert.equal(authorization, "Bearer " + fakeToken);
    const [operation, key, field] = command;
    assert.ok(hashes.has(key));
    const expectedFields = key === pilotKey ? fields : catalogFields;
    if (operation === "HINCRBY") {
      assert.ok(expectedFields.includes(field));
      assert.deepEqual(command, ["HINCRBY", key, field, 1]);
    } else {
      assert.deepEqual(command, ["HMGET", key, ...expectedFields]);
    }
  }
  for (const key of hashes.keys()) {
    assert.equal(requests.filter(({ command }) => command[0] === "HINCRBY" && command[1] === key).length, 7);
  }
});

test("traffic counters coalesce high-volume visit bursts into a single atomic Redis EVAL batch", async t => {
  const trafficKey = "veritas:traffic-totals:v1";
  const hash = new Map();
  const evalCalls = [];
  const hmgetCalls = [];
  const redis = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const command = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    const [operation, ...rest] = command;
    let result;
    if (operation === "EVAL") {
      const [_script, numKeys, key, ...args] = rest;
      assert.equal(numKeys, 1);
      assert.equal(key, trafficKey);
      evalCalls.push(args);
      for (let i = 0; i < args.length; i += 2) {
        const field = args[i];
        const delta = Number(args[i + 1]);
        hash.set(field, (hash.get(field) || 0) + delta);
      }
      result = 1;
    } else if (operation === "HMGET") {
      const [key, ...fieldsToGet] = rest;
      assert.equal(key, trafficKey);
      hmgetCalls.push(fieldsToGet.length);
      result = fieldsToGet.map(f => (hash.has(f) ? String(hash.get(f)) : null));
    } else {
      res.writeHead(400);
      return res.end();
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ result }));
  });
  redis.listen(0, "127.0.0.1");
  t.after(() => new Promise((resolve, reject) => redis.close(err => (err ? reject(err) : resolve()))));
  await once(redis, "listening");
  process.env.UPSTASH_REDIS_REST_URL = "http://127.0.0.1:" + redis.address().port;
  process.env.UPSTASH_REDIS_REST_TOKEN = fakeToken;
  t.after(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  const traffic = createTrafficCounters({ useUpstash: true, flushIntervalMs: 60_000 });
  for (let i = 0; i < 250; i += 1) {
    await traffic.recordVisit({ isMcp: true });
  }
  await traffic.recordVisit({ isMcp: true, mcpTool: "get_trust_dossier_sample" });
  await traffic.recordVisit({ isTest: true });

  assert.equal(evalCalls.length, 0, "no Redis writes before the batch flush window fires");

  const snap = await traffic.snapshot();
  assert.equal(evalCalls.length, 1, "all 252 visits flushed in a single atomic EVAL command");
  assert.equal(hmgetCalls.length, 1);
  assert.equal(snap.totalExternalHits, 251);
  assert.equal(snap.mcpRequests, 251);
  assert.equal(snap.mcpToolsCall, 1);
  assert.equal(snap.tests, 1);
  assert.deepEqual(snap.byMcpToolCalled, { get_trust_dossier_sample: 1 });
  assert.equal(snap.writeErrors, 0);
});

