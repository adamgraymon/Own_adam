import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { buildMcpTrustReport, enableTrustPersistence, getPublicTrustRecord } from "../src/freeTrustCheck.js";

const tools = [{ name: "read_notes", description: "Read notes", annotations: { readOnlyHint: true } }];
const probe = (url, t = tools) => ({
  ok: true,
  checkedAt: new Date().toISOString(),
  serverUrl: url,
  serverInfo: { name: "demo", version: "1.0" },
  initLatencyMs: 1,
  toolsListLatencyMs: 1,
  tools: t,
  secondToolsList: t,
});
const flush = () => new Promise((r) => setTimeout(r, 150));

test("local-file backend: history survives a simulated restart", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "veritas-"));
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  process.env.TRUST_DATA_DIR = dir;

  const ledgerA = { evaluatorSecretKey: "k" };
  await enableTrustPersistence(ledgerA);
  buildMcpTrustReport({ ledger: ledgerA, probe: probe("https://a.org/mcp") });
  await flush();

  // "Reinicio": ledger nuevo, recarga desde disco
  const ledgerB = { evaluatorSecretKey: "k" };
  const status = await enableTrustPersistence(ledgerB);
  assert.equal(status.backend, "local-file");
  assert.equal(status.loadedSnapshots, 1);
  const r = buildMcpTrustReport({ ledger: ledgerB, probe: probe("https://a.org/mcp", [...tools, { name: "run_shell", description: "x" }]) });
  assert.equal(r.answers.q5_hasBehaviorChangedAfterUpdate.status, "CHANGED_SINCE_LAST_CHECK");
  const rec = getPublicTrustRecord(ledgerB, "https://a.org/mcp");
  assert.equal(rec.totalChecks, 2);
  assert.equal(rec.history.length, 2);
  assert.equal(rec.history[1].added, 1);
  delete process.env.TRUST_DATA_DIR;
});

test("upstash backend: HSET on save, HGETALL on load", async () => {
  const hash = new Map();
  let auth = null;
  const srv = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      auth = req.headers.authorization;
      const [cmd, , field, value] = JSON.parse(body);
      let result = null;
      if (cmd === "HSET") { hash.set(field, value); result = 1; }
      if (cmd === "HGETALL") result = [...hash.entries()].flat();
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ result }));
    });
  });
  await new Promise((r) => srv.listen(0, r));
  process.env.UPSTASH_REDIS_REST_URL = `http://127.0.0.1:${srv.address().port}`;
  process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
  try {
    const ledgerA = { evaluatorSecretKey: "k" };
    await enableTrustPersistence(ledgerA);
    buildMcpTrustReport({ ledger: ledgerA, probe: probe("https://b.org/mcp") });
    await flush();
    assert.equal(auth, "Bearer test-token");
    assert.ok(hash.has("https://b.org/mcp"));

    const ledgerB = { evaluatorSecretKey: "k" };
    const status = await enableTrustPersistence(ledgerB);
    assert.equal(status.backend, "upstash-redis");
    const r = buildMcpTrustReport({ ledger: ledgerB, probe: probe("https://b.org/mcp") });
    assert.equal(r.answers.q5_hasBehaviorChangedAfterUpdate.status, "NO_CHANGE");
  } finally {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    srv.close();
  }
});

test("seller onboarding starts commercial history at zero and persists registration + withdrawal across restarts", async () => {
  const { AgenticEscrowLedger } = await import("../src/escrowContract.js");
  const { handleMcpJsonRpc } = await import("../src/mcpServer.js");
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "veritas-seller-"));
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  process.env.TRUST_DATA_DIR = dir;

  try {
    const ledgerA = new AgenticEscrowLedger();
    await enableTrustPersistence(ledgerA);

    const registered = handleMcpJsonRpc(
      {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "register_and_certify_store",
          arguments: {
            acceptPublicRegistryTerms: true,
            storeId: "honest-zero-start-node",
            storeName: "Honest Zero Start Node",
            walletAddress: "0x111122223333444455556666777788889999AAAA",
            endpointUrl: "https://honest-zero.example/mcp",
            vertical: "VERTICAL_3_SOLIDITY_SECURITY",
            marketTier: "RETAIL_INDIE",
            startingPriceUsdc: 5.0,
            sampleDeliverable: {
              contractName: "SafeVaultSample",
              soliditySourceCode:
                "// SPDX-License-Identifier: MIT\npragma solidity 0.8.38;\ncontract SafeVaultSample { uint256 public total; function add(uint256 a) external { total += a; } }",
            },
          },
        },
      },
      ledgerA
    ).result.structuredContent;

    assert.equal(registered.ok, true);
    assert.equal(registered.storeProfile.technicalAuditPassed, true);
    assert.equal(registered.storeProfile.completedJobs, 0);
    assert.equal(registered.storeProfile.reputationScore, 0);
    assert.equal(registered.publicRegistryConsent.accepted, true);
    await flush();

    // Simulated restart 1: registration and consent survive
    const ledgerB = new AgenticEscrowLedger();
    await enableTrustPersistence(ledgerB);
    assert.ok(ledgerB.stores["honest-zero-start-node"]);
    assert.equal(ledgerB.stores["honest-zero-start-node"].completedJobs, 0);
    assert.equal(ledgerB.stores["honest-zero-start-node"].reputationScore, 0);
    assert.equal(ledgerB.stores["honest-zero-start-node"].publicRegistryConsent.accepted, true);

    // Withdraw consent: removes store and persists tombstone across restart
    const withdrawn = handleMcpJsonRpc(
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "register_and_certify_store",
          arguments: {
            storeId: "honest-zero-start-node",
            acceptPublicRegistryTerms: false,
          },
        },
      },
      ledgerB
    ).result.structuredContent;
    assert.equal(withdrawn.ok, true);
    assert.equal(withdrawn.certificationStatus, "PUBLIC_LISTING_WITHDRAWN");
    assert.equal(ledgerB.stores["honest-zero-start-node"], undefined);
    await flush();

    // Simulated restart 2: withdrawn store stays removed
    const ledgerC = new AgenticEscrowLedger();
    await enableTrustPersistence(ledgerC);
    assert.equal(ledgerC.stores["honest-zero-start-node"], undefined);
  } finally {
    delete process.env.TRUST_DATA_DIR;
  }
});
