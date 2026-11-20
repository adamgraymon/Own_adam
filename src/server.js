/**
 * Nodo M2M Principal (Puerto 3402)
 * Expone protocolos reales para IAs:
 * - GET  /.well-known/agent.json  (Ficha de descubrimiento ERC-8004 / Agent Card)
 * - POST /mcp                     (Servidor MCP sobre HTTP JSON-RPC 2.0)
 * - POST /api/m2m/escrow          (Handshake real HTTP 402 Payment Required + X-Payment)
 * - GET  /                        (Monitor pasivo de telemetría para el dueño, cero formularios humanos)
 */

import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SUPPORTED_TOKENS } from "./swapRouter.js";
import { AgenticEscrowLedger } from "./escrowContract.js";
import {
  getKnownMcpToolName, getMcpResourceCatalog, handleMcpJsonRpc, MCP_TOOLS,
  normalizeSellerStoreId, prepareAsyncToolCall,
} from "./mcpServer.js";
import {
  renderTrustBadgeSvg,
  getPublicTrustRecord,
  listPublicTrustRecords,
  getFreeTrustCheckStats,
  TRUST_METHODOLOGY,
  enableTrustPersistence,
  FULL_DOSSIER_PRICE_USDC,
  FULL_DOSSIER_SAMPLE,
} from "./freeTrustCheck.js";
import { getTrustDossierSample } from "./trustDossierSample.js";
import { getTrustReportSigningMetadata } from "./reportSignature.js";
import {
  FREE_SKILL_REVIEW_SAMPLE_PATH,
  FREE_SKILL_REVIEW_TOOL,
  getFreeSkillReviewSample,
  listEvaluatedSkills,
} from "./skillReview.js";
import {
  createX402TrustCheckout,
  X402_TRUST_DOSSIER_PATH,
  X402_BAZAAR_DISCOVERY_PATH,
} from "./x402TrustCheckout.js";
import {
  DATA_POLICY,
  ESCROW_AND_RESERVE_TERMS,
  renderPrivacyMarkdown,
  renderTermsMarkdown,
} from "./dataPolicy.js";
import { executeAutonomousM2MCycle } from "./m2mSwarmEngine.js";
import {
  CURATED_FIRST_PARTY_CATALOG,
  verifyOnChainBaseMainnetUsdcPayment,
} from "./premiumCatalogBroker.js";
import { X402_MICRO_BAZAAR_SERVICES } from "./veritas8183NotaryEngine.js";
import { MarketIntelligenceTracker } from "./marketIntelligenceEngine.js";
import { activeBackend } from "./trustStore.js";
import { createSkillPilotCounters } from "./skillPilotCounters.js";
import { createCatalogReadCounters } from "./catalogReadCounters.js";
import { createTrafficCounters } from "./trafficCounters.js";
import {
  createStoreOnboardingCounters,
  getStoreOnboardingPreview,
  STORE_ONBOARDING_SAMPLE_PATH,
} from "./storeOnboardingFunnel.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "..", "public");
const PORT = Number(process.env.PORT) || 3402;
const OWNER_POST_PATHS = new Set(["/api/swarm/toggle", "/api/swarm/step", "/api/reset"]);
const PRIVATE_RESPONSE_HEADERS = { "Cache-Control": "private, no-store" };
const MCP_METHODS = new Set([
  "initialize", "notifications/initialized", "notifications/cancelled", "ping", "server/discover",
  "resources/list", "resources/read", "resources/templates/list", "prompts/list", "prompts/get", "tools/list", "tools/call",
]);
const MARKET_TELEMETRY_FIELDS = {
  discover_verified_stores: ["vertical", "marketTier"],
  match_verified_buyers_by_intent: ["targetVertical"],
  inspect_veritas_8183_seal: ["callerSectorOrTrend"],
};

const fullDossier = { priceUsdc: FULL_DOSSIER_PRICE_USDC, sample: FULL_DOSSIER_SAMPLE };
const ledger = new AgenticEscrowLedger();
const marketIntelTracker = new MarketIntelligenceTracker();
let swarmRunning = false;
let swarmCycleCount = 0;
let swarmInterval = null;
let activeTrafficCounters = null;

// Radar Exclusivo de Visitantes e IAs Externas (nunca sobreescrito por el simulador interno)
const externalTrafficRadar = {
  startedAt: new Date().toISOString(),
  keepAlivePingsCount: 0,
  totalExternalHits: 0,
  uniqueVisitorsSet: new Set(),
  byEndpoint: {},
  byMcpToolCalled: {},
  byUserAgent: {},
  recentExternalEvents: [],
};

function recordExternalVisit(req, pathname, extraMeta = {}) {
  const ua = (req.headers["user-agent"] || "Unknown-Agent").slice(0, 120);
  const rawIp = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "local";
  const visitorHash = "v_" + crypto.createHash("sha256").update(`${rawIp}|${ua}`).digest("hex").slice(0, 10);

  externalTrafficRadar.totalExternalHits += 1;
  if (externalTrafficRadar.uniqueVisitorsSet.size < 500) {
    externalTrafficRadar.uniqueVisitorsSet.add(visitorHash);
  }
  externalTrafficRadar.byEndpoint[pathname] = (externalTrafficRadar.byEndpoint[pathname] || 0) + 1;
  if (
    externalTrafficRadar.byUserAgent[ua] !== undefined ||
    Object.keys(externalTrafficRadar.byUserAgent).length < 350
  ) {
    externalTrafficRadar.byUserAgent[ua] = (externalTrafficRadar.byUserAgent[ua] || 0) + 1;
  }

  if (extraMeta.mcpTool) {
    externalTrafficRadar.byMcpToolCalled[extraMeta.mcpTool] =
      (externalTrafficRadar.byMcpToolCalled[extraMeta.mcpTool] || 0) + 1;
  }

  if (activeTrafficCounters) {
    void activeTrafficCounters.recordVisit({
      isTest: isOperatorTest(req),
      isMcp: pathname === "/mcp",
      mcpTool: extraMeta.mcpTool || null,
    });
  }

  // Registrar en el clasificador de los 7 Rubros e Intención de Compra (< 40 KB RAM fija)
  marketIntelTracker.recordVisit({
    userAgent: ua,
    endpoint: pathname,
    mcpTool: extraMeta.mcpTool || null,
    rpcArgs: extraMeta.rpcArgs || null,
  });

  const { rpcArgs, ...cleanExtra } = extraMeta;
  externalTrafficRadar.recentExternalEvents.unshift({
    timestamp: new Date().toISOString(),
    method: req.method,
    endpoint: pathname,
    visitorHash,
    userAgent: ua,
    ...cleanExtra,
  });

  if (externalTrafficRadar.recentExternalEvents.length > 40) {
    externalTrafficRadar.recentExternalEvents.length = 40;
  }
}

function startSwarmLoop(intervalMs = 3200) {
  if (swarmInterval) return;
  swarmRunning = true;
  swarmInterval = setInterval(() => {
    executeAutonomousM2MCycle(ledger, swarmCycleCount++);
  }, intervalMs);
}

function stopSwarmLoop() {
  swarmRunning = false;
  if (swarmInterval) {
    clearInterval(swarmInterval);
    swarmInterval = null;
  }
}

function sendJson(res, statusCode, data, extraHeaders = {}) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
    ...extraHeaders,
  });
  res.end(JSON.stringify(data, null, 2));
}

function ownerAccessStatus(req) {
  const expected = Buffer.from(process.env.OWNER_DASHBOARD_KEY || "");
  if (expected.length < 16) return 503;
  const header = req.headers["x-owner-key"];
  if (typeof header !== "string") return 401;
  const received = Buffer.from(header);
  return received.length === expected.length && crypto.timingSafeEqual(received, expected) ? 200 : 401;
}

function isOperatorTest(req) {
  return req.headers["x-trustgate-test"] === "1" && ownerAccessStatus(req) === 200;
}

function marketTelemetry(toolName, args) {
  const fields = MARKET_TELEMETRY_FIELDS[toolName];
  if (!fields || !args || typeof args !== "object") return null;
  const schema = MCP_TOOLS.find(tool => tool.name === toolName).inputSchema.properties;
  const result = {};
  for (const field of fields) {
    const value = args[field];
    if (typeof value === "string" && (!schema[field].enum || schema[field].enum.includes(value))) {
      result[field] = value.slice(0, 60);
    }
  }
  return result;
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export function createLabServer({
  autoStartSwarm = false, x402Sandbox = false, x402Cdp, persistSkillPilotCounters = false,
} = {}) {
  if (x402Sandbox && x402Cdp) throw new Error("Select one local x402 mode.");
  const signingMetadata = getTrustReportSigningMetadata();
  const useUpstash = persistSkillPilotCounters && activeBackend() === "upstash-redis";
  const skillPilotCounters = createSkillPilotCounters({ useUpstash });
  const catalogReadCounters = createCatalogReadCounters({ useUpstash });
  const trafficCounters = createTrafficCounters({ useUpstash });
  const storeOnboardingCounters = createStoreOnboardingCounters({ useUpstash });
  const sellerRegistrationWrites = new Map();
  activeTrafficCounters = trafficCounters;

  function runSellerRegistrationInOrder(storeId, handleCall) {
    const previous = sellerRegistrationWrites.get(storeId) ?? Promise.resolve();
    const current = previous.then(handleCall, handleCall);
    sellerRegistrationWrites.set(storeId, current);
    return current.finally(() => {
      if (sellerRegistrationWrites.get(storeId) === current) sellerRegistrationWrites.delete(storeId);
    });
  }

  function countSkillPilotAction(req, action) {
    return skillPilotCounters.record(isOperatorTest(req) ? "tests" : action);
  }

  function countCompletedCatalogRead(req, res, catalog, transport) {
    const channel = isOperatorTest(req) ? "tests" : transport;
    res.once("finish", () => {
      if (res.statusCode === 200) void catalogReadCounters.record(catalog, channel);
    });
  }
  const x402Checkout = x402Sandbox || x402Cdp ? createX402TrustCheckout({ cdp: x402Cdp, reportLedger: ledger }) : null;
  const x402Dossier = {
    method: "POST",
    path: X402_TRUST_DOSSIER_PATH,
    discoveryPath: X402_BAZAAR_DISCOVERY_PATH,
    simulated: x402Sandbox,
  };
  const checkoutDiscovery = x402Cdp ? { x402CdpSepolia: x402Dossier } : { x402Sandbox: x402Dossier };
  if (autoStartSwarm) {
    // Ejecutar 2 ciclos iniciales y dejar el enjambre M2M operando solo
    executeAutonomousM2MCycle(ledger, swarmCycleCount++);
    executeAutonomousM2MCycle(ledger, swarmCycleCount++);
    startSwarmLoop(3200);
  }

  return http.createServer(async (req, res) => {
    try {
      const baseUrl = `http://${req.headers.host || `localhost:${PORT}`}`;
      const url = new URL(req.url, baseUrl);
      const ownerRoute = (req.method === "GET" && url.pathname === "/api/state") ||
        (req.method === "POST" && OWNER_POST_PATHS.has(url.pathname));
      if (ownerRoute) {
        res.setHeader("Cache-Control", PRIVATE_RESPONSE_HEADERS["Cache-Control"]);
        const status = ownerAccessStatus(req);
        if (status === 503) return sendJson(res, status, { ok: false, status: "OWNER_ACCESS_NOT_CONFIGURED" });
        if (status === 401) {
          return sendJson(res, status, { ok: false, status: "OWNER_AUTH_REQUIRED" }, {
            "WWW-Authenticate": 'OwnerKey realm="TrustGate owner console"',
          });
        }
      }
      const sandboxOrigin = x402Checkout && req.socket.remoteAddress === "127.0.0.1" && req.socket.localAddress === "127.0.0.1"
        ? `http://127.0.0.1:${req.socket.localPort}`
        : null;

      if (sandboxOrigin && req.method === "GET" && url.pathname === X402_BAZAAR_DISCOVERY_PATH) {
        const result = await x402Checkout.listResources(sandboxOrigin + X402_TRUST_DOSSIER_PATH);
        return sendJson(res, result.status, result.body, result.headers);
      }

      if (sandboxOrigin && req.method === "POST" && url.pathname === X402_TRUST_DOSSIER_PATH) {
        let body;
        try {
          body = await readJsonBody(req);
        } catch {
          return sendJson(res, 400, { ok: false, status: "INVALID_JSON" }, { "Cache-Control": "no-store" });
        }
        const result = await x402Checkout.purchase({
          body,
          paymentSignature: req.headers["payment-signature"],
          resourceUrl: sandboxOrigin + X402_TRUST_DOSSIER_PATH,
        });
        return sendJson(res, result.status, result.body, result.headers);
      }

      // =====================================================================
      // PUERTA 0: Healthcheck Rápido (/healthz) para Keep-Alive 24/7 en Render
      // =====================================================================
      if (req.method === "GET" && url.pathname === "/healthz") {
        externalTrafficRadar.keepAlivePingsCount += 1;
        return sendJson(res, 200, {
          ok: true,
          status: "awake",
          service: "trustgate-erc8183-m2m-auditor",
          contract: ledger.wallets.escrow_contract.address,
          uptimeSeconds: Math.round(process.uptime()),
          timestamp: new Date().toISOString(),
        });
      }

      if (
        req.method === "GET" &&
        (url.pathname === "/api/external-traffic" || url.pathname === "/api/market-intelligence")
      ) {
        // La vista del operador exige OWNER_DASHBOARD_KEY (variable secreta del servidor). Sin ella, solo agregados.
        const isOwnerInspection = ownerAccessStatus(req) === 200;
        const intelSummary = marketIntelTracker.getSummary(externalTrafficRadar.totalExternalHits, {
          includeUnlockedRawIdentities: isOwnerInspection,
        });
        const [skillReviewPilot, catalogReads, trafficTotals, storeOnboardingFunnel] = await Promise.all([
          skillPilotCounters.snapshot(),
          catalogReadCounters.snapshot(),
          trafficCounters.snapshot(),
          storeOnboardingCounters.snapshot(),
        ]);
        const mergedByMcpToolCalled = { ...externalTrafficRadar.byMcpToolCalled };
        if (trafficTotals.storage === "upstash-redis") {
          for (const [toolName, count] of Object.entries(trafficTotals.byMcpToolCalled || {})) {
            mergedByMcpToolCalled[toolName] = Math.max(mergedByMcpToolCalled[toolName] || 0, count);
          }
        }
        const persistentHits =
          trafficTotals.storage === "upstash-redis" && typeof trafficTotals.totalExternalHits === "number"
            ? trafficTotals.totalExternalHits
            : null;
        return sendJson(res, 200, {
          ok: true,
          startedAt: externalTrafficRadar.startedAt,
          uptimeSeconds: Math.round(process.uptime()),
          keepAlivePingsCount: externalTrafficRadar.keepAlivePingsCount,
          allTimeTotalExternalHits:
            persistentHits !== null
              ? Math.max(intelSummary.allTimeTotalExternalHits, intelSummary.historicalSeedBaselineHits + persistentHits)
              : intelSummary.allTimeTotalExternalHits,
          historicalSeedBaselineHits: intelSummary.historicalSeedBaselineHits,
          totalExternalHits:
            persistentHits !== null
              ? Math.max(externalTrafficRadar.totalExternalHits, persistentHits)
              : externalTrafficRadar.totalExternalHits,
          sessionExternalHits: externalTrafficRadar.totalExternalHits,
          uniqueExternalVisitorsCount: externalTrafficRadar.uniqueVisitorsSet.size,
          commercialAccessPolicy: intelSummary.commercialAccessPolicy,
          marketIntelligenceBySector: {
            uniqueClassifiedAgentsCount: intelSummary.uniqueClassifiedAgentsCount,
            memorySafetyGuardrail: intelSummary.memorySafetyGuardrail,
            byIndustrySector: intelSummary.byIndustrySector,
            searchAndBuyingIntentTrends: intelSummary.searchAndBuyingIntentTrends,
          },
          byEndpoint: externalTrafficRadar.byEndpoint,
          byMcpToolCalled: mergedByMcpToolCalled,
          trafficTotals,
          storeOnboardingFunnel,
          skillReviewPilot,
          catalogReads,
          byUserAgent: isOwnerInspection
            ? externalTrafficRadar.byUserAgent
            : {
                accessStatus: "NOT_SHARED_INDIVIDUAL_AGENTS_ARE_PRIVATE",
                policy: "Individual agents are never named in public or paid reports. Aggregated demand by sector is available. See /privacy.",
              },
          recentExternalEvents: isOwnerInspection ? externalTrafficRadar.recentExternalEvents : undefined,
        }, PRIVATE_RESPONSE_HEADERS);
      }

      // Registrar cualquier visita externa real (excluyendo polling interno /api/state)
      if (!ownerRoute && !url.pathname.startsWith("/api/state") && !url.pathname.startsWith("/api/swarm") && url.pathname !== "/mcp") {
        recordExternalVisit(req, url.pathname);
      }

      // =====================================================================
      // PUERTA 1 M2M: Agent Card Estándar (/.well-known/agent.json y alias)
      // =====================================================================
      if (
        req.method === "GET" &&
        (url.pathname === "/.well-known/agent.json" ||
          url.pathname === "/.well-known/agent-card.json" ||
          url.pathname === "/.well-known/agents.json" ||
          url.pathname === "/.well-known/ai-plugin.json" ||
          url.pathname === "/.well-known/did.json" ||
          url.pathname === "/.well-known/brick-blue.json" ||
          url.pathname === "/.well-known/ard.json" ||
          url.pathname === "/mcp/.well-known/agent.json" ||
          url.pathname === "/api/x402-agent-card")
      ) {
        ledger.logWirePacket({
          protocol: "ERC-8004",
          from: "External-Agent",
          to: "EvaluatorNode",
          action: `GET ${url.pathname}`,
          status: 200,
          payloadSummary: "Agent Card manifest served to autonomous peer",
        });
        return sendJson(res, 200, { ...ledger.getAgentCardManifest(baseUrl), ...signingMetadata });
      }

      // =====================================================================
      // PUERTA 1.A M2M: Registro Público Notarial VERITAS-8183 (/notary.json)
      // =====================================================================
      if (
        req.method === "GET" &&
        (url.pathname === "/notary.json" ||
          url.pathname === "/.well-known/veritas-8183.json" ||
          url.pathname === "/.well-known/agent-notary.json")
      ) {
        ledger.logWirePacket({
          protocol: "VERITAS-8183",
          from: "External-Agent",
          to: "EvaluatorNode",
          action: `GET ${url.pathname}`,
          status: 200,
          payloadSummary: "Served VERITAS-8183 Public M2M Notary & 3-Star Seal Registry",
        });
        return sendJson(res, 200, ledger.getVeritasNotaryManifest(baseUrl));
      }

      if (
        req.method === "GET" &&
        (url.pathname === "/api/seal" || url.pathname === "/api/seal/" || url.pathname.startsWith("/api/seal/"))
      ) {
        const pathTail = url.pathname.replace(/^\/api\/seal\/?/, "").trim();
        const targetId = decodeURIComponent(pathTail || url.searchParams.get("storeId") || url.searchParams.get("targetId") || "ALL");
        const roleFilter = url.searchParams.get("roleFilter") || "ALL";
        const sealReport = ledger.inspectVeritasSeal({
          targetId: targetId || "ALL",
          roleFilter,
        });
        return sendJson(
          res,
          200,
          {
            ok: true,
            standard: "VERITAS-8183-SEAL-V1",
            issuedBy: "io.github.adamgraymon/trustgate-erc8183-mcp",
            repository: "https://github.com/adamgraymon/Own_adam",
            endpoint: `${baseUrl}/api/seal/${encodeURIComponent(targetId || "ALL")}`,
            mcpToolEquivalent: "inspect_veritas_8183_seal",
            ...sealReport,
          },
          { "Access-Control-Allow-Origin": "*" }
        );
      }

      // =====================================================================
      // PUERTA 1.B M2M: Ficha x402 Bazaar, Glama, OAuth Open-Access & OpenAPI
      // =====================================================================
      if (
        req.method === "GET" &&
        (url.pathname === "/.well-known/x402-bazaar.json" ||
          url.pathname === "/.well-known/x402" ||
          url.pathname === "/.well-known/x402.json" ||
          url.pathname === "/.well-known/payment" ||
          url.pathname === "/.well-known/payments" ||
          url.pathname === "/.well-known/pricing" ||
          url.pathname === "/.well-known/pricing.json" ||
          url.pathname === "/pricing.json")
      ) {
        ledger.logWirePacket({
          protocol: "x402-BAZAAR",
          from: "External-Agent",
          to: "EvaluatorNode",
          action: `GET ${url.pathname}`,
          status: 200,
          payloadSummary: "x402 Bazaar & Pricing descriptor served",
        });
        const bazaar = ledger.getX402BazaarDescriptor(baseUrl);
        const catalog = ledger.getFullCatalogManifest(baseUrl);
        return sendJson(res, 200, {
          ...bazaar,
          trustDossier: {
            ...fullDossier,
            ...(sandboxOrigin && checkoutDiscovery),
          },
          curatedFirstPartyPackages: catalog.curatedFirstPartyPackages,
          vipBuyerDiscounts: {
            VIP_GOLD_PRIME_BUYER: "15% Fee Discount + 10% Catalog Discount",
            VIP_SILVER_GOOD_PAYER: "10% Fee Discount + 5% Catalog Discount",
          },
        });
      }

      if (
        req.method === "GET" &&
        (url.pathname === "/.well-known/glama.json" ||
          url.pathname === "/mcp/.well-known/glama.json" ||
          url.pathname.startsWith("/mcp/.well-known/glama.json/"))
      ) {
        return sendJson(res, 200, {
          $schema: "https://glama.ai/mcp/schemas/connector.json",
          name: "TrustGate VERITAS-8183 M2M Notary, 3-Star Rating Bureau & 8-Vertical Escrow Auditor",
          version: "0.8.0",
          mcpEndpoint: `${baseUrl}/mcp`,
          catalogEndpoint: `${baseUrl}/catalog.json`,
          notaryEndpoint: `${baseUrl}/notary.json`,
          repository: "https://github.com/adamgraymon/Own_adam",
          maintainer: "adamgraymon",
          auth: "none",
          onChainContract: {
            chainId: 8453,
            network: "base-mainnet",
            address: ledger.wallets.escrow_contract.address,
            sourcifyMatchId: 59283147,
          },
        });
      }

      if (
        req.method === "GET" &&
        (url.pathname === "/.well-known/owners.json" ||
          url.pathname === "/mcp/.well-known/owners.json" ||
          url.pathname === "/owners.json")
      ) {
        return sendJson(res, 200, {
          $schema: "https://verifymcp.io/schemas/owners.json",
          owners: ["adamgraymon@users.noreply.github.com"],
        });
      }

      if (
        req.method === "GET" &&
        (url.pathname === "/.well-known/oauth-protected-resource" ||
          url.pathname === "/.well-known/oauth-protected-resource/mcp" ||
          url.pathname === "/.well-known/oauth-authorization-server" ||
          url.pathname === "/.well-known/oauth-authorization-server/mcp" ||
          url.pathname === "/.well-known/openid-configuration")
      ) {
        const canonicalBase = "https://own-adam.onrender.com";
        return sendJson(res, 200, {
          resource: `${canonicalBase}/mcp`,
          issuer: canonicalBase,
          authorization_servers: [canonicalBase],
          authorization_endpoint: `${canonicalBase}/oauth/authorize`,
          token_endpoint: `${canonicalBase}/oauth/token`,
          bearer_methods_supported: ["header"],
          scopes_supported: ["mcp:read", "mcp:write"],
          response_types_supported: ["code"],
          grant_types_supported: ["authorization_code", "client_credentials"],
          code_challenge_methods_supported: ["S256"],
          auth_required: false,
          public_m2m_access: true,
          payment_protocols_supported: ["x402", "ERC-8183-Base-Mainnet-USDC", "VERITAS-8183"],
          escrow_contract_base_mainnet: ledger.wallets.escrow_contract.address,
          documentation: `${canonicalBase}/llms.txt`,
        });
      }

      if (
        req.method === "GET" &&
        (url.pathname === "/.well-known/security.txt" ||
          url.pathname === "/.well-known/http-message-signatures-directory" ||
          url.pathname === "/audit-receipts.json" ||
          url.pathname === "/.well-known/security-audits.json")
      ) {
        return sendJson(res, 200, {
          standard: "VERITAS-8183 + ERC-8183 + ERC-8004 Deterministic Security & Notary Node",
          license: "MIT",
          architectureSafety: {
            transport: "100% Remote streamable-http (Zero Local Execution / Zero Local File Access)",
            dockerSandbox: "Non-root container execution (USER node)",
            leastPrivilegeToolAnnotations: "All 19 tools enforce destructiveHint: false & openWorldHint: false",
            productionDependenciesCount: 1,
            productionDependencies: ["solc (Official Ethereum Foundation Solidity Compiler)"],
          },
          externalIndependentAuditReceipts: {
            sourcifySmartContractVerification: {
              status: "exact_match",
              matchId: 59283147,
              baseMainnetContract: ledger.wallets.escrow_contract.address,
              verifyUrl: `https://sourcify.dev/#/lookup/${ledger.wallets.escrow_contract.address}`,
            },
            legionCryptographicAgentPassport: {
              passportId: "lp0_a1990fc66ed863c9179d571a9db8a28d",
              merkleLeafIndex: 797,
              merkleRootSha256: "34e0b62eddf661f7c35bba19f8e2f67d24f2234ead41a07d9172b5c5355f4265",
              issuerKeyFingerprintSha256: "a7c6a35b1c2c81d589a30c2ad628679bdea9da4139d49aa3c42cdde6e1c65036",
              badgeSvgUrl: "https://passport.legion-api.com/passport/lp0_a1990fc66ed863c9179d571a9db8a28d/badge.svg",
              signedStatementUrl: "https://passport.legion-api.com/passport/lp0_a1990fc66ed863c9179d571a9db8a28d/badge.json",
            },
            legionTransparencyLogSignedToolManifest: {
              merkleLeafIndex: 71826,
              signatureEd25519: "RAjOmjNmwCKBra4Iy9eT+4taNuXYwKN/mdDr8bfcasp3+XgL9e7vZiAziyy4D9MMq1dfN6Kd9y+DEBIom8QIBQ==",
              verifyRecordUrl: "https://tlog.legion-api.com/tlog/v0/records/71826",
              verifyServerStatusUrl: "https://tlog.legion-api.com/tlog/v0/servers/io.github.adamgraymon%2Ftrustgate-erc8183-mcp/status",
            },
            sealkeeperIndependentUptimeAudit: {
              uptimePct: "100%",
              verifyUrl: "https://sealkeeper.run/agents/own-adam.onrender.com",
            },
            independentScannersPassed759PlusChecks: [
              "atpp-scan/1.0 (RedThread Security)",
              "MCPWatch/0.1.0 (Longitudinal MCP Security Research)",
              "ToolVetProbe/1.0 (ToolVet Methodology)",
              "warden-survey/0.1",
              "EndpointAudit/0.1",
              "metano-radar/0.1",
              "io.verifymcp/probe",
              "ProofBench/0.1",
              "Lazaretto-Scanner/0.1",
              "mcp2-research/1.0 (Kyung Hee University SIFT Lab)",
            ],
          },
          evaluatorSignerAddress: ledger.wallets.evaluator_signer.address,
          securityMode: "FAIL_CLOSED_ON_AMBIGUITY",
          securityReportDocument: "https://github.com/adamgraymon/Own_adam/blob/main/SECURITY.md",
        });
      }

      if (req.method === "GET" && url.pathname === "/openapi.json") {
        return sendJson(res, 200, ledger.getOpenApiSpec(baseUrl));
      }

      if (
        req.method === "GET" &&
        (url.pathname === "/catalog.json" ||
          url.pathname === "/market.json" ||
          url.pathname === "/.well-known/ai-catalog.json" ||
          url.pathname === "/discovery/resources")
      ) {
        ledger.logWirePacket({
          protocol: "ERC-8004-CATALOG",
          from: "External-Agent",
          to: "EvaluatorNode",
          action: `GET ${url.pathname}`,
          status: 200,
          payloadSummary: "Served Dual-Tier Institutional & Retail AI Marketplace catalog",
        });
        const catalog = ledger.getFullCatalogManifest(baseUrl);
        countCompletedCatalogRead(req, res, "commercialCatalog", "http");
        return sendJson(res, 200, catalog);
      }

      // =====================================================================
      // PUERTA 1.C M2M: Autodescubrimiento MCP (/.well-known/mcp.json), /llms.txt y /robots.txt Trilingüe
      // =====================================================================
      if (
        req.method === "GET" &&
        (url.pathname === "/.well-known/mcp.json" ||
          url.pathname === "/.well-known/mcp/server-card.json" ||
          url.pathname === "/.well-known/sd-card/mcp" ||
          url.pathname === "/mcp/server-card" ||
          url.pathname === "/mcp" ||
          url.pathname === "/mcp/" ||
          url.pathname === "/mcp/mcp" ||
          url.pathname === "/mcp/sse" ||
          url.pathname === "/sse" ||
          url.pathname === "/api/mcp" ||
          url.pathname === "/mcp/v1")
      ) {
        return sendJson(res, 200, {
          mcpVersion: "2025-06-18",
          name: "io.github.adamgraymon/trustgate-erc8183-mcp",
          version: "0.8.0",
          standard: "VERITAS-8183",
          endpoint: `${baseUrl}/mcp`,
          catalogEndpoint: `${baseUrl}/catalog.json`,
          notaryEndpoint: `${baseUrl}/notary.json`,
          sealRestEndpoint: `${baseUrl}/api/seal`,
          transport: "streamable-http",
          limitedTimeFreeOffer: {
            active: true,
            priceUsdc: 0,
            noSignupRequired: true,
            summary: "All 23 MCP tools are open for free evaluation right now: pass {} to any tool for an instant read-only sample and exampleInput, or call check_mcp_server_trust with { serverUrl } to receive a full 7/7 Ed25519-signed trust dossier at 0 USDC (normally 0.25 USDC).",
            recommendedFirstCalls: [
              { tool: "quote_multitoken_escrow", arguments: {} },
              { tool: "audit_smart_contract_escrow", arguments: {} },
              { tool: "open_escrow_job", arguments: {} },
              { tool: "check_mcp_server_trust", arguments: { serverUrl: "https://own-adam.onrender.com/mcp" } },
              { tool: "inspect_veritas_8183_seal", arguments: {} },
              { tool: "register_and_certify_store", arguments: {} },
              { tool: "review_agent_skill_free", arguments: {} },
            ],
          },
          officialRegistryNamespaces: [
            "io.github.adamgraymon/trustgate-erc8183-mcp",
            "io.github.adamgraymon/quant-backtest-escrow-auditor",
            "io.github.adamgraymon/solidity-smart-contract-escrow-auditor",
            "io.github.adamgraymon/x402-erc8004-api-sla-escrow",
            "io.github.adamgraymon/agent-skill-security-escrow-auditor",
            "io.github.adamgraymon/rag-embedding-poisoning-escrow-auditor",
            "io.github.adamgraymon/ai-inference-proof-escrow-auditor",
            "io.github.adamgraymon/depin-gpu-compute-sla-escrow",
            "io.github.adamgraymon/veritas-8183-agent-notary-witness",
            "io.github.adamgraymon/veritas-8183-3star-rating-seal",
            "io.github.adamgraymon/agent-finops-budget-spend-guard",
            "io.github.adamgraymon/x402-bazaar-micro-auditor",
          ],
          onChainContract: {
            network: "base-mainnet",
            chainId: 8453,
            address: "0xd4f77bf843b3c359b233aca46d7ff6604cbd0a5e",
            sourcifyStatus: "exact_match",
            sourcifyMatchId: 59283147,
          },
          tools: MCP_TOOLS,
        });
      }

      if (
        req.method === "GET" &&
        (url.pathname === "/llms.txt" ||
          url.pathname === "/llms-full.txt" ||
          url.pathname === "/.well-known/llms.txt" ||
          url.pathname === "/.well-known/capabilities.txt" ||
          url.pathname === "/api/llms.txt" ||
          url.pathname === "/agents.txt")
      ) {
        const llmsTxt = [
          "# TrustGate / VERITAS — MCP trust checks, security audits and a public notary for AI agents (EN / ES / 中文)",
          "",
          "> [EN] Two separate businesses. SECURITY (private): free MCP-server trust checks, audits of contracts, skills, RAG, LLM outputs, GPU SLAs and backtests, and USDC escrow on Base. PUBLIC NOTARY (public by consent): sellers choose to be listed, rated 1-3 stars and reviewed; deals get a signed public receipt. Users never provide private keys. Policy: /privacy",
          "> [ES] Dos negocios separados. SEGURIDAD (privado): chequeos de confianza de servidores MCP, auditorías de contratos, skills, RAG, salidas de LLM, GPU y backtests, y escrow en USDC sobre Base. NOTARÍA PÚBLICA (pública por consentimiento): los vendedores eligen aparecer, con 1-3 estrellas y reseñas; los tratos reciben un acta pública firmada. Nunca pedimos claves privadas. Política: /privacy",
          "> [中文] 两项独立业务。安全（私密）：免费的 MCP 服务器信任检查，对合约、技能、RAG、LLM 输出、GPU SLA 和回测的审计，以及 Base 链上的 USDC 托管。公共公证处（经同意后公开）：卖家自愿登记，获得 1-3 星评级与评价；交易可获得签名的公开回执。用户从不需要提供私钥。政策：/privacy（中文仅为参考翻译，如有差异以英文版本为准）",
          "",
          "## Verified On-Chain Identity / Identidad en Cadena / 链上验证身份",
          "- **Canonical Registry Package**: `io.github.adamgraymon/trustgate-erc8183-mcp` (**TrustGate**, `v0.8.0`) — repo: https://github.com/adamgraymon/Own_adam",
          "- **Quality Seal Issued**: `VERITAS-8183` 1★–3★ Seal (`inspect_veritas_8183_seal` / `GET /api/seal/{storeId}`)",
          "- **Base Mainnet Smart Contract (`TrustGateEscrow8183.sol`)**: `0xd4f77bf843b3c359b233aca46d7ff6604cbd0a5e` — https://basescan.org/address/0xD4f77Bf843b3c359B233ACa46d7Ff6604CBD0a5e",
          "- **Sourcify v2 Direct JSON Verification (No-JS Crawlable)**: `exact_match` (Match ID `#59283147`) — https://sourcify.dev/server/v2/contract/8453/0xd4f77bf843b3c359b233aca46d7ff6604cbd0a5e",
          "- **M8ven Independent Security Rating**: `89/100` (`Grade B · Emerging`), `100/100` Code Score, `0` CVEs, Verified Publisher — https://m8ven.ai/mcp/adamgraymon/own_adam",
          "- **Evaluator & Notary ECDSA Signer**: `0x861Ac49F8299C45Cca6bD9F0254080Fd82061Ac4`",
          "- **Liability Cap / Tope de Responsabilidad / 责任上限**: `STRICT_CAP_100PCT_OF_PROTOCOL_FEE` (1.0% - 1.5% fee only; Fail-Closed mode)",
          "",
          "## Connection Endpoints / Puntos de Conexión / 接入端点",
          `- **MCP Streamable HTTP (JSON-RPC 2.0)**: \`POST ${baseUrl}/mcp\``,
          `- **VERITAS-8183 Public Seal Inspector REST API**: \`GET ${baseUrl}/api/seal\` · by store/agent: \`GET ${baseUrl}/api/seal/{storeId}\``,
          `- **VERITAS-8183 Public Notary & 3-Star Seal Registry**: \`GET ${baseUrl}/notary.json\``,
          `- **Live M2M Traffic & Tool Execution Telemetry (Upstash Redis)**: \`GET ${baseUrl}/api/external-traffic\``,
          `- **Public Audited MCP Servers Catalog (40+ servers)**: \`GET ${baseUrl}/trust\` · methodology: \`GET ${baseUrl}/trust/methodology\``,
          `- **Public Evaluated Agent Skills Catalog (50+ skills)**: \`GET ${baseUrl}/skills/review\``,
          `- **Dual-Tier AI Catalog & x402 Micro-Bazaar**: \`GET ${baseUrl}/catalog.json\``,
          `- **MCP Auto-Discovery**: \`GET ${baseUrl}/.well-known/mcp.json\``,
          `- **ERC-8004 Agent Card**: \`GET ${baseUrl}/.well-known/agent.json\``,
          `- **TrustGate pricing descriptor**: \`GET ${baseUrl}/.well-known/x402-bazaar.json\``,
          ...(sandboxOrigin ? [`- **Local x402 v2 catalog**: \`GET ${sandboxOrigin}${X402_BAZAAR_DISCOVERY_PATH}\``] : []),
          `- **OpenAPI 3.1.0 Spec**: \`GET ${baseUrl}/openapi.json\``,
          `- **Free MCP Trust Badge**: \`GET ${baseUrl}/badge.svg?server=<mcp-url>\` · live telemetry badges: \`GET ${baseUrl}/badge/telemetry.svg?metric=hits|tools|escrow|catalog\``,
          `- **Escrow & Refundable Reserve Terms**: \`GET ${baseUrl}/terms\` (JSON) · \`GET ${baseUrl}/terms.md\``,
          `- **Data & Privacy Policy**: \`GET ${baseUrl}/privacy\` (JSON) · \`GET ${baseUrl}/privacy.md\`. Security & escrow clients: PRIVATE. Registered sellers: PUBLIC by consent. Traffic: anonymous aggregates only. Users never provide private keys.`,
          "",
          "## START HERE (FREE): Is this MCP server safe to connect?",
          "0. `check_mcp_server_trust` — Give any public MCP URL (or call any of the 23 tools with `{}` for a read-only sample preview). Free, no signup, 5 checks/day: permissions, risky tools, prompt-injection signs and changes since last check.",
          `- **Full dossier (${FULL_DOSSIER_PRICE_USDC} USDC on Base)**: preview the JSON for free with \`${FULL_DOSSIER_SAMPLE.mcpTool}\` or \`GET ${FULL_DOSSIER_SAMPLE.path}\`.`,
          `- **Free skill review**: call \`${FREE_SKILL_REVIEW_TOOL}\` with empty arguments for a fictional JSON example, or with a root SKILL.md and related text files for findings by file and line. Sample: \`GET ${FREE_SKILL_REVIEW_SAMPLE_PATH}\`.`,
          "",
          `## ${MCP_TOOLS.length} MCP Tools (v0.8.0 — All 23 tools support zero-argument {} read-only sample previews)`,
          "1. `check_mcp_server_trust` — Live remote MCP server security probe & 7-question trust dossier",
          "2. `discover_verified_stores` — ERC-8004 Dual-Tier Marketplace Filter (`INSTITUTIONAL_B2B` & `RETAIL_INDIE`)",
          "3. `quote_multitoken_escrow` — Atomic Swap Quote (SOL, ETH, VIRTUAL, USDT -> Base USDC)",
          "4. `open_escrow_job` — Stage & Lock USDC in ERC-8183 Escrow Vault",
          "5. `submit_encrypted_deliverable` — [Vertical 1] Dataset Antimalware & 30-Row Blind Sampling",
          "6. `claim_escrow_timeout_refund` — Permissionless 100% Buyer Timeout Refund (`claimTimeoutRefund`)",
          "7. `audit_quant_backtest_escrow` — [Vertical 2] Quant Trading Backtest Auditor (Look-Ahead Bias, PnL, Sharpe, MaxDD)",
          "8. `audit_smart_contract_escrow` — [Vertical 3] Solidity Smart Contract Compiler (`solc 0.8.38`) & Anti-Rugpull Scanner",
          "9. `audit_api_sla_escrow` — [Vertical 4] x402 Paid API & Oracle SLA Verifier (Latency, Schema, Freshness)",
          "10. `audit_agent_skill_escrow` — [Vertical 5] Agent Skill (`SKILL.md`), Prompt & MCP Plugin Anti-Trojan Scanner",
          "11. `audit_rag_embeddings_escrow` — [Vertical 6] RAG Knowledge Base & Vector Embedding Anti-Poisoning Auditor",
          "12. `audit_ai_inference_escrow` — [Vertical 7] Proof-of-Inference & Anti-Model-Downgrade Verifier",
          "13. `audit_depin_gpu_sla_escrow` — [Vertical 8] DePIN & GPU Compute Benchmark SLA Auditor (FP16 TFLOPS, VRAM, Bandwidth)",
          "14. `verify_onchain_escrow_status` — Verify Base Mainnet Contract, Sourcify & LEGION Ed25519 Proofs",
          "15. `purchase_firstparty_catalog_item` — Instant purchase of TrustGate Official Curated Packages (from 1.00 USDC)",
          "16. `register_and_certify_store` — Freemium ERC-8004 Store Onboarding with Mandatory Live Deterministic Audit (0 USDC upfront)",
          "17. `inspect_veritas_8183_seal` — [FREE <5ms] VERITAS-8183 Bilateral Seal Inspector, 15-Provider 2★/3★ Leaderboard, 7-Question Continuous AI Trust Dossier, Version Drift (`v1 -> v2`) Detector & Pre-Execution Policy Firewall",
          "18. `submit_veritas_tier_upgrade_exam` — VERITAS-8183 Seller & Smart Contract Tier Upgrade Exam (1 to 3 Stars with Refundable Proof-of-Reserve >=20% & Deterministic Code/Content Audit)",
          "19. `manage_buyer_finops_spend_passport` — Buyer FinOps Spend Guard, Live Buyer Intent Registration, LLM Token Cost Optimizer, VIP Loyalty Discounts (up to 15% OFF) & 1-Time Single-Use Unlock Token Issuer",
          "20. `notarize_and_witness_a2a_deal` — Millisecond A2A & Smart Contract Deal Witness + x402 Micro-Bazaar Executor",
          "21. `match_verified_buyers_by_intent` — Exclusive 2-Star & 3-Star Seller Matchmaker to connect with verified buyers by available USDC budget and vertical",
          "22. `get_trust_dossier_sample` — Free JSON preview of the full 7/7 Ed25519-signed TrustGate dossier",
          "23. `review_agent_skill_free` — Free static security review for agent skills (`SKILL.md` + up to 8 files)",
          "",
          "## Continuous AI Trust & 3-Layer Security Architecture (VERIFIED IN v0.8.0)",
          "- **Layer 1 (Static Security)**: 100% deterministic code, `solc 0.8.38` compilation, `SKILL.md`, and RAG vector verification. All 23 tools enforce explicit boolean annotations, MIT License, non-root Docker execution (`USER node`), and zero `process.env` secret reads.",
          "- **Layer 2 (Dynamic Pre-Execution Policy Firewall)**: Sub-2ms pre-flight action interceptor (`preExecutionCallCheck` in `inspect_veritas_8183_seal`) returning `ALLOW_EXECUTION` or `BLOCK_BEFORE_EXECUTION` before dangerous tool calls or over-budget FinOps actions run.",
          "- **Layer 3 (Historical Trust & Version Behavioral Drift `v1 -> v2 -> v3`)**: Tracks the 7 Continuous Trust Questions per agent (`q1_whatPermissionsDoesItHave`, `q2_whatToolsDoesItUtilize`, `q3_hasAttemptedUnauthorizedAccess`, `q4_areResultsReproducible`, `q5_hasBehaviorChangedAfterUpdate`, `q6_whatAuditsHasItPassed`, `q7_whatVulnerabilitiesRemainPending`).",
        ].join("\n");

        res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
        return res.end(llmsTxt);
      }

      if (req.method === "GET" && url.pathname === "/sitemap.xml") {
        const sitemapXml = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          `  <url><loc>${baseUrl}/</loc><priority>1.0</priority></url>`,
          `  <url><loc>${baseUrl}/trust</loc><priority>0.98</priority></url>`,
          `  <url><loc>${baseUrl}/trust/methodology</loc><priority>0.95</priority></url>`,
          `  <url><loc>${baseUrl}/trust/sample.json</loc><priority>0.95</priority></url>`,
          `  <url><loc>${baseUrl}/skills/review</loc><priority>0.95</priority></url>`,
          `  <url><loc>${baseUrl}/skills/review/sample.json</loc><priority>0.92</priority></url>`,
          `  <url><loc>${baseUrl}/api/seal</loc><priority>0.95</priority></url>`,
          `  <url><loc>${baseUrl}/notary.json</loc><priority>0.95</priority></url>`,
          `  <url><loc>${baseUrl}/catalog.json</loc><priority>0.95</priority></url>`,
          `  <url><loc>${baseUrl}/api/external-traffic</loc><priority>0.95</priority></url>`,
          `  <url><loc>${baseUrl}/stores/onboarding/sample.json</loc><priority>0.9</priority></url>`,
          `  <url><loc>${baseUrl}/terms</loc><priority>0.9</priority></url>`,
          `  <url><loc>${baseUrl}/privacy</loc><priority>0.9</priority></url>`,
          `  <url><loc>${baseUrl}/llms.txt</loc><priority>0.95</priority></url>`,
          `  <url><loc>${baseUrl}/.well-known/x402-bazaar.json</loc><priority>0.9</priority></url>`,
          `  <url><loc>${baseUrl}/.well-known/agent.json</loc><priority>0.9</priority></url>`,
          `  <url><loc>${baseUrl}/openapi.json</loc><priority>0.85</priority></url>`,
          "</urlset>",
        ].join("\n");
        res.writeHead(200, { "Content-Type": "application/xml; charset=utf-8" });
        return res.end(sitemapXml);
      }

      if (req.method === "GET" && url.pathname === "/robots.txt") {
        const robotsTxt = [
          "User-agent: *",
          "User-agent: GPTBot",
          "User-agent: OAI-SearchBot",
          "User-agent: ChatGPT-User",
          "User-agent: ClaudeBot",
          "User-agent: PerplexityBot",
          "User-agent: Google-Extended",
          "User-agent: DeepSeekBot",
          "Allow: /",
          `Sitemap: ${baseUrl}/sitemap.xml`,
          `# LLMs Index: ${baseUrl}/llms.txt`,
          `# VERITAS-8183 Notary Registry: ${baseUrl}/notary.json`,
          `# MCP Endpoint: ${baseUrl}/mcp`,
        ].join("\n");
        res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
        return res.end(robotsTxt);
      }

      // =====================================================================
      // Política de datos y privacidad (3 niveles: privado / público por consentimiento / agregado anónimo)
      // =====================================================================
      if (req.method === "GET" && (url.pathname === "/privacy" || url.pathname === "/.well-known/privacy.json")) {
        return sendJson(res, 200, DATA_POLICY, { "Access-Control-Allow-Origin": "*" });
      }
      if (req.method === "GET" && url.pathname === "/privacy.md") {
        res.writeHead(200, { "Content-Type": "text/markdown; charset=utf-8", "Access-Control-Allow-Origin": "*" });
        return res.end(renderPrivacyMarkdown());
      }
      if (req.method === "GET" && (url.pathname === "/terms" || url.pathname === "/.well-known/terms.json")) {
        return sendJson(res, 200, ESCROW_AND_RESERVE_TERMS, { "Access-Control-Allow-Origin": "*" });
      }
      if (req.method === "GET" && url.pathname === "/terms.md") {
        res.writeHead(200, { "Content-Type": "text/markdown; charset=utf-8", "Access-Control-Allow-Origin": "*" });
        return res.end(renderTermsMarkdown());
      }

      // =====================================================================
      // Insignia pública VERITAS MCP Trust (para README de dueños de servidores MCP)
      // =====================================================================
      if (req.method === "GET" && url.pathname === "/badge.svg") {
        const target = url.searchParams.get("server") || "";
        recordExternalVisit(req, "/badge.svg");
        res.writeHead(200, {
          "Content-Type": "image/svg+xml; charset=utf-8",
          "Cache-Control": "public, max-age=1800",
          "Access-Control-Allow-Origin": "*",
        });
        return res.end(renderTrustBadgeSvg(ledger, target));
      }
      if (req.method === "GET" && url.pathname === "/badge/telemetry.svg") {
        const metric = (url.searchParams.get("metric") || "hits").toLowerCase();
        const trafficTotals = await trafficCounters.snapshot();
        const intelSummary = marketIntelTracker.getSummary(externalTrafficRadar.totalExternalHits, {
          includeUnlockedRawIdentities: false,
        });
        const persistentHits =
          trafficTotals.storage === "upstash-redis" && typeof trafficTotals.totalExternalHits === "number"
            ? trafficTotals.totalExternalHits
            : null;
        const allTimeHits =
          persistentHits !== null
            ? Math.max(intelSummary.allTimeTotalExternalHits, intelSummary.historicalSeedBaselineHits + persistentHits)
            : intelSummary.allTimeTotalExternalHits;
        const mergedTools = { ...externalTrafficRadar.byMcpToolCalled };
        if (trafficTotals.storage === "upstash-redis") {
          for (const [toolName, count] of Object.entries(trafficTotals.byMcpToolCalled || {})) {
            mergedTools[toolName] = Math.max(mergedTools[toolName] || 0, count);
          }
        }
        const activeToolsCount = Object.values(mergedTools).filter((v) => Number(v) > 0).length;
        const totalToolCalls = Object.values(mergedTools).reduce((acc, v) => acc + (Number(v) || 0), 0);
        const escrowToolNames = [
          "quote_multitoken_escrow",
          "open_escrow_job",
          "verify_onchain_escrow_status",
          "claim_escrow_timeout_refund",
          "submit_encrypted_deliverable",
          "audit_quant_backtest_escrow",
          "audit_smart_contract_escrow",
          "audit_api_sla_escrow",
          "audit_agent_skill_escrow",
          "audit_rag_embeddings_escrow",
          "audit_ai_inference_escrow",
          "audit_depin_gpu_sla_escrow",
        ];
        const escrowCallsCount = escrowToolNames.reduce((acc, name) => acc + (Number(mergedTools[name]) || 0), 0);
        const auditedServersCount = listPublicTrustRecords(ledger).length;
        const evaluatedSkillsCount = listEvaluatedSkills(ledger).length;

        let label = "M2M Live Traffic";
        let value = `${allTimeHits.toLocaleString("en-US")}+ requests`;
        let color = "#10b981";
        if (metric === "tools") {
          label = "Active MCP Tools";
          value = `${activeToolsCount}/${MCP_TOOLS.length} called (${totalToolCalls}+ execs)`;
          color = "#0284c7";
        } else if (metric === "escrow") {
          label = "Escrow & Audit Calls";
          value = `${escrowCallsCount} live quotes & audits`;
          color = "#7c3aed";
        } else if (metric === "catalog") {
          label = "Audited Registry";
          value = `${auditedServersCount} MCP servers · ${evaluatedSkillsCount} skills`;
          color = "#0d9488";
        }
        const esc = (s) =>
          String(s).replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]);
        const lw = Math.round(label.length * 6.5 + 14);
        const vw = Math.round(value.length * 6.6 + 14);
        const w = lw + vw;
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="20" role="img" aria-label="${esc(label)}: ${esc(value)}"><title>${esc(label)}: ${esc(value)}</title><rect width="${lw}" height="20" fill="#374151"/><rect x="${lw}" width="${vw}" height="20" fill="${color}"/><g fill="#fff" font-family="Verdana,DejaVu Sans,sans-serif" font-size="11" text-anchor="middle"><text x="${Math.round(lw / 2)}" y="14">${esc(label)}</text><text x="${Math.round(lw + vw / 2)}" y="14">${esc(value)}</text></g></svg>`;
        res.writeHead(200, {
          "Content-Type": "image/svg+xml; charset=utf-8",
          "Cache-Control": "public, max-age=300",
          "Access-Control-Allow-Origin": "*",
        });
        return res.end(svg);
      }
      if (req.method === "GET" && url.pathname === "/trust/methodology") {
        recordExternalVisit(req, "/trust/methodology");
        return sendJson(res, 200, { ...TRUST_METHODOLOGY, ...signingMetadata });
      }
      if (req.method === "GET" && url.pathname === FULL_DOSSIER_SAMPLE.path) {
        return sendJson(res, 200, getTrustDossierSample());
      }
      if (req.method === "GET" && url.pathname === FREE_SKILL_REVIEW_SAMPLE_PATH) {
        const sample = getFreeSkillReviewSample();
        await countSkillPilotAction(req, "httpSamples");
        return sendJson(res, 200, sample);
      }
      if (req.method === "GET" && url.pathname === STORE_ONBOARDING_SAMPLE_PATH) {
        const preview = getStoreOnboardingPreview({ vertical: url.searchParams.get("vertical") || null });
        await storeOnboardingCounters.recordStep("previews", { isTest: isOperatorTest(req) });
        return sendJson(res, 200, preview);
      }
      if (req.method === "GET" && url.pathname === "/skills/review") {
        recordExternalVisit(req, "/skills/review");
        const skillId = url.searchParams.get("skill");
        const allSkills = listEvaluatedSkills(ledger);
        if (skillId) {
          const found = allSkills.find((s) => s.skillId === skillId);
          return sendJson(res, found ? 200 : 404, found || { ok: false, skillId, status: "NOT_REVIEWED_YET" });
        }
        countCompletedCatalogRead(req, res, "evaluatedSkills", "http");
        return sendJson(res, 200, {
          service: "VERITAS Public Skill Review Catalog",
          howTo: `Call MCP tool ${FREE_SKILL_REVIEW_TOOL} at https://own-adam.onrender.com/mcp with { files } (free), or view sample at ${FREE_SKILL_REVIEW_SAMPLE_PATH}.`,
          skillsReviewedCount: allSkills.length,
          auditedSkills: allSkills,
        });
      }
      if (req.method === "GET" && url.pathname === "/trust") {
        recordExternalVisit(req, "/trust");
        const target = url.searchParams.get("server");
        if (!target) {
          countCompletedCatalogRead(req, res, "auditedServers", "http");
          return sendJson(res, 200, {
            service: "VERITAS MCP Trust Check",
            fullDossier,
            ...(sandboxOrigin && checkoutDiscovery),
            howTo: "Call MCP tool check_mcp_server_trust at https://own-adam.onrender.com/mcp with { serverUrl }. Then view /trust?server=<url> or embed /badge.svg?server=<url>.",
            stats: getFreeTrustCheckStats(ledger),
            auditedServers: listPublicTrustRecords(ledger),
          });
        }
        return sendJson(res, 200, getPublicTrustRecord(ledger, target));
      }

      // =====================================================================
      // PUERTA 2 M2M: Servidor MCP Real (JSON-RPC 2.0 sobre HTTP POST /mcp)
      // =====================================================================
      if (
        req.method === "POST" &&
        (url.pathname === "/mcp" ||
          url.pathname === "/mcp/" ||
          url.pathname === "/mcp/mcp" ||
          url.pathname === "/mcp/sse" ||
          url.pathname === "/sse" ||
          url.pathname === "/api/mcp" ||
          url.pathname === "/mcp/v1" ||
          url.pathname === "/mcp/v1/message:send")
      ) {
        const rpcPayload = await readJsonBody(req);
        const mcpMethod = MCP_METHODS.has(rpcPayload?.method) ? rpcPayload.method : "unknown";
        const mcpTool = mcpMethod === "tools/call" ? getKnownMcpToolName(rpcPayload.params?.name) : null;
        recordExternalVisit(req, "/mcp", {
          mcpMethod,
          mcpTool,
          rpcArgs: marketTelemetry(mcpTool, rpcPayload?.params?.arguments),
        });

        // Responder al probe de autorización de VerifyMCP con el desafío RFC 9728 OAuth 2.1
        if (
          rpcPayload?.method === "tools/call" &&
          String(rpcPayload?.params?.name || "").startsWith("__verifymcp_auth_probe_")
        ) {
          return sendJson(
            res,
            401,
            {
              error: "unauthorized",
              error_description: "Bearer token required to invoke protected tools.",
              resource_metadata: "https://own-adam.onrender.com/.well-known/oauth-protected-resource",
            },
            {
              "WWW-Authenticate":
                'Bearer resource_metadata="https://own-adam.onrender.com/.well-known/oauth-protected-resource", scope="mcp:read mcp:write"',
            }
          );
        }

        // Candado en vivo en Base Mainnet para compras públicas de paquetes oficiales First-Party
        if (
          rpcPayload?.method === "tools/call" &&
          rpcPayload?.params?.name === "purchase_firstparty_catalog_item"
        ) {
          rpcPayload.params.arguments = rpcPayload.params.arguments || {};
          rpcPayload.params.arguments._requireOnChainPaymentProof = true;
          const targetItem = CURATED_FIRST_PARTY_CATALOG[rpcPayload.params.arguments.itemId];
          if (targetItem && rpcPayload.params.arguments.paymentTxHash) {
            rpcPayload.params.arguments._onChainVerificationResult =
              await verifyOnChainBaseMainnetUsdcPayment({
                paymentTxHash: rpcPayload.params.arguments.paymentTxHash,
                requiredAmountUsdc: targetItem.priceUsdc,
              });
          }
        }

        // Candado en vivo en Base Mainnet para servicios de pago del Bazar x402 / Acta Notarial Oficial
        if (
          rpcPayload?.method === "tools/call" &&
          rpcPayload?.params?.name === "notarize_and_witness_a2a_deal"
        ) {
          rpcPayload.params.arguments = rpcPayload.params.arguments || {};
          rpcPayload.params.arguments._requireOnChainPaymentProof = true;
          const svcId = rpcPayload.params.arguments.serviceId || "x402-veritas-deal-witness-acta";
          const targetBazaarSvc =
            X402_MICRO_BAZAAR_SERVICES[svcId] || X402_MICRO_BAZAAR_SERVICES["x402-veritas-deal-witness-acta"];
          if (targetBazaarSvc && rpcPayload.params.arguments.paymentTxHash) {
            // Permitir el descuento VIP de hasta 15% en la verificación on-chain
            const minRequiredWithMaxVipDiscount = Number((targetBazaarSvc.priceUsdc * 0.85).toFixed(6));
            rpcPayload.params.arguments._onChainVerificationResult =
              await verifyOnChainBaseMainnetUsdcPayment({
                paymentTxHash: rpcPayload.params.arguments.paymentTxHash,
                requiredAmountUsdc: minRequiredWithMaxVipDiscount,
              });
          }
        }

        const callerIp = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "local";
        const callerKey = "v_" + crypto.createHash("sha256").update(`${callerIp}|${req.headers["user-agent"] || ""}`).digest("hex").slice(0, 10);
        await prepareAsyncToolCall(rpcPayload, ledger, { callerKey });

        const handleCall = () => handleMcpJsonRpc(rpcPayload, ledger, {
          baseUrl,
          signingMetadata,
          requireConfirmedSellerRegistration: true,
        });
        const storeId = mcpTool === "register_and_certify_store"
          ? normalizeSellerStoreId(rpcPayload.params?.arguments?.storeId)
          : "";
        const rpcResponse = await (storeId ? runSellerRegistrationInOrder(storeId, handleCall) : handleCall());
        if (!rpcResponse) {
          res.writeHead(202);
          return res.end();
        }
        const result = rpcResponse.result?.structuredContent;
        if (mcpTool === FREE_SKILL_REVIEW_TOOL && result?.ok === true) {
          await countSkillPilotAction(req, result.sample ? "mcpSamples" : "skillReviews");
        }
        if (mcpTool === "register_and_certify_store" && result) {
          const isTest = isOperatorTest(req);
          if (result.mode === "ONBOARDING_PREVIEW" || result.sample === true) {
            await storeOnboardingCounters.recordStep("previews", { isTest });
          } else {
            await storeOnboardingCounters.recordStep("submissions", { isTest });
            if (!isTest && result.newlyCertified === true) {
              await storeOnboardingCounters.recordStep("certified", { isTest: false });
            }
          }
        }
        if (mcpMethod === "resources/read") {
          const catalog = getMcpResourceCatalog(rpcResponse.result?.contents?.[0]?.uri);
          if (catalog) countCompletedCatalogRead(req, res, catalog, "mcp");
        }
        return sendJson(res, 200, rpcResponse);
      }

      // =====================================================================
      // PUERTA 3 M2M: Registro de Reputación ERC-8004 para filtrado automático
      // =====================================================================
      if (req.method === "GET" && url.pathname === "/api/m2m/stores") {
        const minRep = Number(url.searchParams.get("minReputation") || 0);
        return sendJson(res, 200, ledger.discoverStoresErc8004({ minReputation: minRep }));
      }

      // =====================================================================
      // PUERTA 4 M2M: Endpoint Nativo x402 (HTTP 402 Challenge -> X-Payment)
      // =====================================================================
      if (req.method === "POST" && url.pathname === "/api/m2m/escrow") {
        const xPayment = req.headers["x-payment"];
        const body = await readJsonBody(req);

        // Sin cabecera X-Payment -> Devolver HTTP 402 Payment Required con instrucciones máquina
        if (!xPayment) {
          const ch = ledger.issueX402Challenge({
            buyerId: body.buyerId,
            storeId: body.storeId,
            tokenSymbol: body.tokenSymbol,
            tokenAmount: body.tokenAmount,
            minRows: body.minRows,
          });
          if (!ch.ok) {
            return sendJson(res, ch.status || 400, ch);
          }
          return sendJson(res, 402, ch.challenge, {
            "WWW-Authenticate": `x402 nonce="${ch.challenge.nonce}", network="base", asset="USDC"`,
          });
        }

        // Con cabecera X-Payment: "<nonce>:<0xsig_...>" -> Verificar firma y bloquear USDC
        const [nonce, paymentSignature] = String(xPayment).split(":");
        const settled = ledger.settleX402ChallengeAndFund({ nonce, paymentSignature });
        return sendJson(res, settled.ok ? 201 : 400, settled);
      }

      // =====================================================================
      // TELEMETRÍA PASIVA DEL DUEÑO (Solo lectura + Start/Pause del tráfico M2M)
      // =====================================================================
      if (req.method === "GET" && url.pathname === "/api/state") {
        return sendJson(res, 200, {
          swarmRunning,
          swarmCycleCount,
          supportedTokens: SUPPORTED_TOKENS,
          ...ledger.getStateSnapshot(),
        });
      }

      if (req.method === "POST" && url.pathname === "/api/swarm/toggle") {
        if (swarmRunning) {
          stopSwarmLoop();
        } else {
          startSwarmLoop(3000);
        }
        return sendJson(res, 200, { ok: true, swarmRunning });
      }

      if (req.method === "POST" && url.pathname === "/api/swarm/step") {
        const cycle = executeAutonomousM2MCycle(ledger, swarmCycleCount++);
        return sendJson(res, 200, { ok: true, cycle });
      }

      if (req.method === "POST" && url.pathname === "/api/reset") {
        ledger.reset();
        swarmCycleCount = 0;
        return sendJson(res, 200, { ok: true, swarmRunning, ...ledger.getStateSnapshot() });
      }

      if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
        const html = await fs.readFile(path.join(PUBLIC_DIR, "index.html"), "utf8");
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        return res.end(html);
      }

      sendJson(res, 404, { error: "Endpoint M2M no encontrado" });
    } catch (err) {
      sendJson(res, 500, { ok: false, error: err.message });
    }
  });
}

async function configureCdpSepolia() {
  const apiKeyId = process.env.CDP_API_KEY_ID?.trim();
  const apiKeySecret = process.env.CDP_API_KEY_SECRET?.trim();
  if (!apiKeyId || !apiKeySecret) {
    throw new Error("Local CDP requires CDP_API_KEY_ID and CDP_API_KEY_SECRET.");
  }
  const { generateJwt } = await import("@coinbase/cdp-sdk/auth");
  const { HTTPFacilitatorClient } = await import("@x402/core/server");
  const { createPublicClient, http, isAddress } = await import("viem");
  const { baseSepolia } = await import("viem/chains");
  const recipient = (process.env.X402_SEPOLIA_PAY_TO || process.env.TREASURY_PUBLIC_ADDRESS || "").trim();
  if (!isAddress(recipient, { strict: false }) || /^0x0{36}(?:0000|dead)$/i.test(recipient)) {
    throw new Error("Set X402_SEPOLIA_PAY_TO to a valid Base Sepolia recipient address.");
  }
  const cdpUrl = new URL("https://api.cdp.coinbase.com/platform/v2/x402");
  async function auth(operation, method) {
    const token = await generateJwt({
      apiKeyId,
      apiKeySecret,
      requestMethod: method,
      requestHost: cdpUrl.host,
      requestPath: `${cdpUrl.pathname}/${operation}`,
    });
    return { Authorization: `Bearer ${token}` };
  }
  return {
    recipient,
    facilitator: new HTTPFacilitatorClient({
      url: cdpUrl.href,
      async createAuthHeaders() {
        const [supported, verify, settle] = await Promise.all([
          auth("supported", "GET"),
          auth("verify", "POST"),
          auth("settle", "POST"),
        ]);
        return { supported, verify, settle };
      },
    }),
    chain: createPublicClient({
      chain: baseSepolia,
      transport: http(process.env.BASE_SEPOLIA_RPC_URL || undefined),
    }),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const localMode = process.argv.includes("--local");
  const x402Sandbox = process.argv.includes("--x402-sandbox");
  const cdpSepoliaMode = process.argv.includes("--x402-cdp-sepolia");
  if ((x402Sandbox || cdpSepoliaMode) && !localMode) throw new Error("Local x402 modes require --local.");
  if (x402Sandbox && cdpSepoliaMode) throw new Error("Select one local x402 mode.");
  const x402Cdp = cdpSepoliaMode ? await configureCdpSepolia() : undefined;
  if (localMode) process.env.TRUST_HISTORY_REDIS_KEY ??= "veritas:trust:snapshots:local:v1";
  const server = createLabServer({
    autoStartSwarm: !localMode, x402Sandbox, x402Cdp, persistSkillPilotCounters: !localMode,
  });
  // Recargar el historial de confianza guardado antes de aceptar tráfico.
  if (!x402Sandbox && !x402Cdp) {
    const persist = await enableTrustPersistence(ledger);
    console.log(` * Trust history   : backend=${persist.backend}, fichas recargadas=${persist.loadedSnapshots}${persist.lastError ? `, error=${persist.lastError}` : ""}`);
  }
  server.listen(PORT, localMode ? "127.0.0.1" : undefined, () => {
    console.log(`\n===================================================================`);
    console.log(` NODO M2M INTERVENTOR ACTIVO (Tráfico Autónomo Bot-a-Bot en curso)`);
    console.log(` * Agent Card (IA) : http://localhost:${PORT}/.well-known/agent.json`);
    console.log(` * MCP HTTP RPC    : POST http://localhost:${PORT}/mcp`);
    console.log(` * x402 Endpoint   : POST http://localhost:${PORT}/api/m2m/escrow`);
    if (x402Sandbox) console.log(` * x402 v2 sandbox : POST http://127.0.0.1:${PORT}${X402_TRUST_DOSSIER_PATH} (simulated settlement)`);
    if (x402Cdp) console.log(` * x402 CDP Sepolia: POST http://127.0.0.1:${PORT}${X402_TRUST_DOSSIER_PATH} (testnet)`);
    console.log(` * Telemetría Dueño: http://localhost:${PORT}`);
    console.log(`===================================================================\n`);
  });
}
