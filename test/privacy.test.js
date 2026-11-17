import { test } from "node:test";
import assert from "node:assert/strict";
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
