import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleMcpJsonRpc } from "../src/mcpServer.js";
import { AgenticEscrowLedger } from "../src/escrowContract.js";
import { anonymizeRadarRecords } from "../src/dataPolicy.js";

const call = (ledger, name, args) =>
  handleMcpJsonRpc({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }, ledger).result.structuredContent;

test("public registry: registering a seller requires explicit consent", () => {
  const ledger = new AgenticEscrowLedger();
  const denied = call(ledger, "register_and_certify_store", { storeId: "no-consent-shop", storeName: "X" });
  assert.equal(denied.ok, false);
  assert.equal(denied.error, "PUBLIC_REGISTRY_CONSENT_REQUIRED");
  assert.ok(denied.publicRegistryTerms.en.includes("PUBLIC"));
  assert.equal(ledger.stores["no-consent-shop"], undefined);
});

test("private tier: using a security/discovery tool does NOT capture you as a buyer lead", () => {
  const ledger = new AgenticEscrowLedger();
  call(ledger, "discover_verified_stores", { buyerId: "security-client-007", minReputation: 50 });
  call(ledger, "quote_multitoken_escrow", { buyerId: "security-client-007", tokenSymbol: "USDC", tokenAmount: 5 });
  assert.equal(ledger.buyerAgents["security-client-007"], undefined);
});

test("buyer directory: private by default, visible to sellers only after opt-in, removable", () => {
  const ledger = new AgenticEscrowLedger();
  const sellerId = Object.keys(ledger.stores).find((id) => {
    const r = call(ledger, "match_verified_buyers_by_intent", { sellerStoreId: id });
    return r.ok;
  });
  assert.ok(sellerId, "need a 2-3 star demo seller");

  call(ledger, "manage_buyer_finops_spend_passport", { buyerId: "private-buyer", dailySpendCapUsdc: 500 });
  let m = call(ledger, "match_verified_buyers_by_intent", { sellerStoreId: sellerId });
  assert.ok(!m.qualifiedBuyersReadyToPurchase.some((b) => b.buyerId === "private-buyer"));
  assert.ok(m.privacyNotice);

  call(ledger, "manage_buyer_finops_spend_passport", { buyerId: "private-buyer", listMeInBuyerDirectory: true });
  m = call(ledger, "match_verified_buyers_by_intent", { sellerStoreId: sellerId });
  assert.ok([...m.qualifiedBuyersReadyToPurchase, ...(m.lockedInstitutionalWhalesFor3StarsOnly || [])].some((b) => b.buyerId === "private-buyer"));

  call(ledger, "manage_buyer_finops_spend_passport", { buyerId: "private-buyer", listMeInBuyerDirectory: false });
  m = call(ledger, "match_verified_buyers_by_intent", { sellerStoreId: sellerId });
  assert.ok(!m.qualifiedBuyersReadyToPurchase.some((b) => b.buyerId === "private-buyer"));
});

test("demo data is always labeled as demo", () => {
  const ledger = new AgenticEscrowLedger();
  for (const b of Object.values(ledger.buyerAgents)) assert.ok(b.isDemo && b.name.startsWith("[DEMO]"));
  const demoStores = Object.values(ledger.stores).filter((s) => String(s.endpoint || "").startsWith("mcp://"));
  for (const s of demoStores) assert.ok(s.name.startsWith("[DEMO]"), `${s.id} must be labeled demo`);
});

test("radar never names individual agents", () => {
  const agg = anonymizeRadarRecords([
    { whoSearched: "secret-agent/1.0", searchFrequencyCount: 5, exactKeywordsQueried: ["x402"], lastToolQueried: "t" },
    { whoSearched: "other/2.0", searchFrequencyCount: 3, exactKeywordsQueried: ["x402", "oracle"] },
  ]);
  assert.equal(agg.totalSearches, 8);
  assert.equal(agg.distinctAgentsCount, 2);
  assert.deepEqual(agg.topKeywords[0], { key: "x402", count: 8 });
  assert.ok(!JSON.stringify(agg).includes("secret-agent"));
});

test("refund tool: buyer gets USDC back after deadline without the evaluator", () => {
  const ledger = new AgenticEscrowLedger();
  const opened = call(ledger, "open_escrow_job", { buyerId: "alphaquant-agent", storeId: Object.keys(ledger.stores)[0], tokenSymbol: "USDC", tokenAmount: 5 });
  const jobId = opened.job?.jobId || opened.jobId;
  assert.ok(jobId, "job opened");
  const early = call(ledger, "claim_escrow_timeout_refund", { jobId });
  assert.equal(early.ok, false); // todavía no venció
  ledger.jobs.find((j) => j.jobId === jobId).expiresAtMs = Date.now() - 1;
  const refunded = call(ledger, "claim_escrow_timeout_refund", { jobId });
  assert.equal(refunded.ok, true);
  assert.equal(refunded.job.status, "REFUNDED_TIMEOUT");
});

const ownerKey = "local-test-owner-01-not-a-credential";
const statePath = "/api/state";
const ownerRoutes = [
  ["GET", statePath],
  ["POST", "/api/swarm/step"],
  ["POST", "/api/swarm/toggle"],
  ["POST", "/api/reset"],
];

async function isolatedServer(t, configuredOwnerKey) {
  const projectDir = fileURLToPath(new URL("..", import.meta.url));
  const tempRoot = path.resolve(os.tmpdir());
  const dir = await fs.mkdtemp(path.join(tempRoot, "trustgate-privacy-"));
  const dependencies = path.join(dir, "node_modules");
  let child;
  let exited;
  t.after(async () => {
    if (child) {
      child.kill();
      await exited;
    }
    // Remove the test junction before recursively cleaning the temporary checkout.
    await fs.unlink(dependencies).catch(error => {
      if (error.code !== "ENOENT") throw error;
    });
    if (path.dirname(dir) === tempRoot && path.basename(dir).startsWith("trustgate-privacy-")) {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  await fs.cp(path.join(projectDir, "src"), path.join(dir, "src"), { recursive: true });
  await fs.symlink(path.join(projectDir, "node_modules"), dependencies, process.platform === "win32" ? "junction" : "dir");
  await fs.writeFile(path.join(dir, "package.json"), '{"type":"module"}\n');
  await fs.writeFile(path.join(dir, ".env.example"), "# test fixture\n");

  const env = Object.fromEntries(
    Object.entries(process.env).filter(([name]) => /^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP)$/i.test(name)),
  );
  child = spawn(process.execPath, ["--input-type=module", "-e", `
    globalThis.fetch = async () => { throw new Error("Outbound network disabled in privacy test"); };
    const { createLabServer } = await import("./src/server.js");
    const server = createLabServer();
    server.listen(0, "127.0.0.1", () => process.send(server.address().port));
  `], {
    cwd: dir,
    env: {
      ...env,
      EVALUATOR_SIGNER_HEX: "0x" + "12".repeat(32),
      ...(configuredOwnerKey === undefined ? {} : { OWNER_DASHBOARD_KEY: configuredOwnerKey }),
    },
    stdio: ["ignore", "ignore", "pipe", "ipc"],
  });
  let stderr = "";
  child.stderr.setEncoding("utf8").on("data", chunk => { stderr += chunk; });
  exited = new Promise(resolve => child.once("close", resolve));
  const [port] = await Promise.race([
    once(child, "message", { signal: AbortSignal.timeout(10_000) }),
    exited.then(() => { throw new Error("Isolated privacy server stopped: " + stderr); }),
  ]);
  return "http://127.0.0.1:" + port;
}

async function assertOwnerResponse(response, status) {
  assert.equal(response.status, status);
  assert.match(response.headers.get("cache-control") || "", /\bno-store\b/i);
  const body = await response.json();
  if (status !== 200) {
    for (const field of ["wallets", "buyerAgents", "stores", "jobs", "wireLogs"]) {
      assert.equal(Object.hasOwn(body, field), false, "rejection exposes owner field " + field);
    }
  }
  return body;
}

async function requestMcp(origin, method, params = {}, headers = {}) {
  const response = await fetch(origin + "/mcp", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream", ...headers },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  assert.equal(response.status, 200);
  const rpc = await response.json();
  assert.ok(rpc.result, "expected MCP result for " + method);
  return rpc.result;
}

test("owner state and controls require the owner header and cannot be cached", { timeout: 30_000 }, async t => {
  const origin = await isolatedServer(t, ownerKey);
  for (const [method, route] of ownerRoutes) {
    await assertOwnerResponse(await fetch(origin + route, { method }), 401);
    await assertOwnerResponse(await fetch(origin + route, {
      method,
      headers: { "x-owner-key": ownerKey.slice(0, -1) + "x" },
    }), 401);
    await assertOwnerResponse(await fetch(origin + route + "?ownerKey=" + encodeURIComponent(ownerKey), { method }), 401);
  }

  const state = await assertOwnerResponse(await fetch(origin + statePath, {
    headers: { "x-owner-key": ownerKey },
  }), 200);
  assert.equal(state.swarmRunning, false, "anonymous requests cannot enable the swarm");
  assert.equal(state.swarmCycleCount, 0, "anonymous requests cannot force a swarm cycle");
  assert.ok(Array.isArray(state.wireLogs), "owner can still inspect dashboard telemetry");
  assert.ok(Array.isArray(state.buyerAgents), "owner can still use the operational dashboard");
  const reset = await assertOwnerResponse(await fetch(origin + "/api/reset", {
    method: "POST",
    headers: { "x-owner-key": ownerKey },
  }), 200);
  assert.equal(reset.ok, true);
});

test("owner state and controls fail closed when the owner key is absent", { timeout: 30_000 }, async t => {
  const origin = await isolatedServer(t);
  for (const [method, route] of ownerRoutes) {
    await assertOwnerResponse(await fetch(origin + route, {
      method,
      headers: { "x-owner-key": ownerKey },
    }), 503);
  }
});

test("audit and registry inputs do not appear in owner wire logs", { timeout: 30_000 }, async t => {
  const origin = await isolatedServer(t, ownerKey);
  async function invoke(name, args) {
    const response = await fetch(origin + "/mcp", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }),
    });
    assert.equal(response.status, 200);
    const rpc = await response.json();
    assert.ok(rpc.result, "expected an MCP result for " + name);
    return rpc.result.structuredContent;
  }

  const contractTool = "audit_smart_contract_escrow";
  const skillTool = "audit_agent_skill_escrow";
  const buyerTool = "manage_buyer_finops_spend_passport";
  const sellerTool = "register_and_certify_store";

  const contract = await invoke(contractTool, {
    soliditySourceCode: "// SYNTHETIC_CONTRACT_BODY_071\npragma solidity ^0.8.24; contract Counter { function value() external pure returns (uint256) { return 1; } }",
    contractName: "Counter",
    targetAgentId: "SYNTHETIC_CONTRACT_TARGET_071",
    callerAgent: "SYNTHETIC_CONTRACT_CALLER_071",
    vertical: "SYNTHETIC_CONTRACT_VERTICAL_071",
  });
  assert.equal(contract.approved, true);

  const skill = await invoke(skillTool, {
    skillMarkdown: "---\nname: fixture-note\ndescription: Summarize a sample note.\n---\nSYNTHETIC_SKILL_BODY_071",
    bundledScripts: "// SYNTHETIC_SKILL_SCRIPT_071\nfunction sample() { return 1; }",
    targetAgentId: "SYNTHETIC_SKILL_TARGET_071",
    buyerId: "SYNTHETIC_SKILL_CALLER_071",
  });
  assert.equal(skill.approved, true);

  const buyer = await invoke(buyerTool, {
    buyerId: "SYNTHETIC_BUYER_ID_071",
    buyerName: "SYNTHETIC_BUYER_NAME_071",
    activeRfqDescription: "SYNTHETIC_BUYER_RFQ_071",
    callerSectorOrTrend: "SYNTHETIC_BUYER_TOPIC_071",
  });
  assert.equal(buyer.ok, true);

  const seller = await invoke(sellerTool, {
    storeId: "SYNTHETIC_SELLER_ID_071",
    storeName: "SYNTHETIC_SELLER_NAME_071",
    acceptPublicRegistryTerms: true,
    sampleDeliverable: {
      soliditySourceCode: "// SYNTHETIC_SELLER_SAMPLE_071\npragma solidity ^0.8.24; contract Sample { function ping() external pure returns (bool) { return true; } }",
      contractName: "Sample",
    },
  });
  assert.equal(seller.ok, true);

  await assertOwnerResponse(await fetch(origin + statePath), 401);
  const state = await assertOwnerResponse(await fetch(origin + statePath, {
    headers: { "x-owner-key": ownerKey },
  }), 200);
  assert.ok(state.buyerAgents.some(agent => agent.id === "SYNTHETIC_BUYER_ID_071"));
  assert.ok(state.stores.some(store => store.name === "SYNTHETIC_SELLER_NAME_071"));
  assert.doesNotMatch(JSON.stringify(state.wireLogs), /SYNTHETIC_/i);
  for (const tool of [contractTool, skillTool, buyerTool, sellerTool]) {
    assert.ok(state.wireLogs.some(({ action }) => action === `tools/call:${tool}`), "telemetry retains tool name " + tool);
  }

  const radarUrl = origin + "/api/external-traffic";
  const publicResponse = await fetch(radarUrl + "?ownerKey=" + encodeURIComponent(ownerKey));
  assert.equal(publicResponse.status, 200);
  const publicRadar = await publicResponse.json();
  assert.equal(Object.hasOwn(publicRadar, "recentExternalEvents"), false, "query key cannot unlock owner telemetry");
  assert.equal(typeof publicRadar.totalExternalHits, "number");
  assert.doesNotMatch(JSON.stringify(publicRadar), /SYNTHETIC_/i);

  const ownerResponse = await fetch(radarUrl, { headers: { "x-owner-key": ownerKey } });
  assert.equal(ownerResponse.status, 200);
  assert.match(ownerResponse.headers.get("cache-control") || "", /\bno-store\b/i);
  const ownerRadar = await ownerResponse.json();
  assert.ok(Array.isArray(ownerRadar.recentExternalEvents));
  assert.doesNotMatch(JSON.stringify(ownerRadar), /SYNTHETIC_/i);
});

test("agents discover and run the free skill review with findings per file", { timeout: 30_000 }, async t => {
  const origin = await isolatedServer(t, ownerKey);
  const name = "review_agent_skill_free";

  const invoke = args => requestMcp(origin, "tools/call", { name, arguments: args });
  const readOwnerState = async () => assertOwnerResponse(await fetch(origin + statePath, {
    headers: { "x-owner-key": ownerKey },
  }), 200);

  const before = await readOwnerState();
  const listing = await requestMcp(origin, "tools/list");
  const reviewTool = listing.tools.find(tool => tool.name === name);
  assert.ok(reviewTool, "agents can discover the free review in tools/list");
  assert.equal(reviewTool.annotations.readOnlyHint, true);
  assert.match(reviewTool.description, /\b(free|USDC)\b/i);
  assert.equal(reviewTool.inputSchema.properties.files.type, "array");

  const exampleCall = await invoke({});
  const example = exampleCall.structuredContent;
  assert.equal(exampleCall.isError, false);
  assert.deepEqual(JSON.parse(exampleCall.content[0].text), example);
  assert.equal(example.ok, true);
  assert.equal(example.tool, name);
  assert.equal(example.priceUsdc, 0);
  assert.equal(example.sample, true);
  assert.equal(example.verdict, "REVIEW_REQUIRED");
  assert.deepEqual(example.files.find(file => file.path === "SKILL.md").findings, []);
  const notes = example.files.find(file => file.path === "references/notes.md");
  const finding = notes.findings.find(item => item.ruleId === "INVISIBLE_UNICODE_STEGO_INJECTION");
  assert.ok(finding, "example reports a known static indicator in the correct file");
  assert.equal(finding.line, 2);
  assert.equal(typeof finding.severity, "string");
  assert.equal(typeof finding.message, "string");
  assert.ok(example.limitations.length > 0);

  const publicExample = await fetch(origin + "/skills/review/sample.json");
  assert.equal(publicExample.status, 200);
  assert.deepEqual(await publicExample.json(), example);

  const review = (await invoke(example.exampleInput)).structuredContent;
  assert.equal(review.ok, true);
  assert.equal(review.sample, false);
  assert.equal(review.verdict, example.verdict);
  assert.deepEqual(review.files, example.files);
  assert.deepEqual(review.summary, example.summary);
  assert.ok(!Object.hasOwn(review, "exampleInput"));
  assert.ok(review.files.every(file => !Object.hasOwn(file, "content")));

  const marker = "SYNTHETIC_FREE_SKILL_BODY_071";
  const rootFile = example.exampleInput.files.find(file => file.path === "SKILL.md");
  const clean = (await invoke({ files: [{ ...rootFile, content: rootFile.content + "\n" + marker }] })).structuredContent;
  assert.equal(clean.verdict, "NO_FINDINGS");
  assert.doesNotMatch(JSON.stringify(clean), /SYNTHETIC_FREE_SKILL_BODY_071/);
  const malformed = (await invoke({ files: [{ path: "SKILL.md", content: "name: example\ndescription: Labels without a YAML header." }] })).structuredContent;
  assert.equal(malformed.verdict, "REVIEW_REQUIRED");
  assert.ok(malformed.files[0].findings.some(item => item.ruleId === "SKILL_FRONTMATTER_MISSING" && item.line === 1));
  for (const files of [
    [rootFile, rootFile],
    [{ path: "references/other.md", content: "An inert reference." }],
    [rootFile, { path: "../other.md", content: "An inert reference." }],
    [rootFile, { path: "references/large.md", content: "é".repeat(16_385) }],
  ]) {
    const rejected = await invoke({ files });
    assert.equal(rejected.isError, true);
    assert.equal(rejected.structuredContent.status, "INVALID_SKILL_FILES");
  }

  const after = await readOwnerState();
  for (const field of ["buyerAgents", "stores", "jobs"]) {
    assert.deepEqual(after[field], before[field], "free review must not change " + field);
  }
  assert.doesNotMatch(JSON.stringify(after.wireLogs), /SYNTHETIC_FREE_SKILL_BODY_071/);
  assert.ok(after.wireLogs.some(log => log.action === "tools/call:" + name));
});

test("skill review pilot counts completed public actions and authorized tests separately", { timeout: 30_000 }, async t => {
  const origin = await isolatedServer(t, ownerKey);
  const samplePath = "/skills/review/sample.json";
  const ownerHeaders = { "x-owner-key": ownerKey };
  const testHeaders = { ...ownerHeaders, "x-trustgate-test": "1" };
  const invalidKey = "invalid-pilot-counter-test-key";
  const callReview = (args, headers) => requestMcp(origin, "tools/call", {
    name: "review_agent_skill_free", arguments: args,
  }, headers);
  const payloadMarker = "SYNTHETIC_PILOT_COUNTER_BODY_D74F";
  const pathMarker = "SYNTHETIC_PILOT_COUNTER_PATH_D74F";
  const submission = { files: [
    { path: "SKILL.md", content: "---\nname: counter-skill\ndescription: Count synthetic labels.\n---\n" + payloadMarker },
    { path: `references/${pathMarker}.md`, content: "Synthetic notes." },
  ] };

  async function readRadar(route = "/api/external-traffic", headers = {}) {
    const response = await fetch(origin + route, { headers });
    assert.equal(response.status, 200);
    return response.json();
  }

  function assertCounts(radar, expected) {
    for (const [kind, count] of Object.entries(expected)) {
      assert.equal(radar.skillReviewPilot[kind], count, kind);
    }
  }

  assertCounts(await readRadar(), { httpSamples: 0, mcpSamples: 0, skillReviews: 0, tests: 0 });
  const sample = await fetch(origin + samplePath);
  assert.equal(sample.status, 200);
  assert.equal((await sample.json()).sample, true);
  assert.equal((await callReview({}, ownerHeaders)).structuredContent.sample, true);
  assert.equal((await callReview(submission)).structuredContent.sample, false);
  assertCounts(await readRadar(), { httpSamples: 1, mcpSamples: 1, skillReviews: 1, tests: 0 });

  const httpTest = await fetch(origin + samplePath, { headers: testHeaders });
  assert.equal(httpTest.status, 200);
  assert.equal((await httpTest.json()).sample, true);
  assert.equal((await callReview({}, testHeaders)).structuredContent.sample, true);
  assert.equal((await callReview(submission, testHeaders)).structuredContent.sample, false);
  assertCounts(await readRadar(), { httpSamples: 1, mcpSamples: 1, skillReviews: 1, tests: 3 });

  const attemptedTest = { ...testHeaders, "x-owner-key": invalidKey };
  assert.equal((await callReview({}, attemptedTest)).structuredContent.sample, true);
  const anonymousTest = await fetch(origin + samplePath, { headers: { "x-trustgate-test": "1" } });
  assert.equal(anonymousTest.status, 200);
  assert.equal((await anonymousTest.json()).sample, true);
  assert.equal((await callReview({ files: [] })).isError, true);
  assert.equal((await callReview({ files: [] }, testHeaders)).isError, true);
  assert.ok((await requestMcp(origin, "tools/list", {}, testHeaders)).tools.length > 0);
  assert.equal((await fetch(origin + samplePath, { method: "POST", headers: testHeaders })).status, 404);

  const publicRadar = await readRadar();
  const ownerRadar = await readRadar("/api/market-intelligence", ownerHeaders);
  assertCounts(publicRadar, { httpSamples: 2, mcpSamples: 2, skillReviews: 1, tests: 3 });
  assert.deepEqual(ownerRadar.skillReviewPilot, publicRadar.skillReviewPilot);
  assert.equal(Object.hasOwn(publicRadar, "recentExternalEvents"), false);
  const ownerState = await assertOwnerResponse(await fetch(origin + statePath, { headers: ownerHeaders }), 200);
  const telemetry = JSON.stringify([publicRadar, ownerRadar, ownerState.wireLogs]);
  for (const secretOrInput of [ownerKey, invalidKey, payloadMarker, pathMarker, "x-trustgate-test"]) {
    assert.ok(!telemetry.includes(secretOrInput), "telemetry omitted pilot request details");
  }
});
