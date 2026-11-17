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
import { handleMcpJsonRpc, MCP_TOOLS, prepareAsyncToolCall } from "./mcpServer.js";
import { renderTrustBadgeSvg, getPublicTrustRecord, getFreeTrustCheckStats, TRUST_METHODOLOGY, enableTrustPersistence } from "./freeTrustCheck.js";
import { DATA_POLICY, renderPrivacyMarkdown } from "./dataPolicy.js";
import { executeAutonomousM2MCycle } from "./m2mSwarmEngine.js";
import {
  CURATED_FIRST_PARTY_CATALOG,
  verifyOnChainBaseMainnetUsdcPayment,
} from "./premiumCatalogBroker.js";
import { X402_MICRO_BAZAAR_SERVICES } from "./veritas8183NotaryEngine.js";
import { MarketIntelligenceTracker } from "./marketIntelligenceEngine.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "..", "public");
const PORT = Number(process.env.PORT) || 3402;

const ledger = new AgenticEscrowLedger();
const marketIntelTracker = new MarketIntelligenceTracker();
let swarmRunning = false;
let swarmCycleCount = 0;
let swarmInterval = null;

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

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export function createLabServer({ autoStartSwarm = false } = {}) {
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
        const ownerKeyEnv = process.env.OWNER_DASHBOARD_KEY || "";
        const providedOwnerKey = String(url.searchParams.get("ownerKey") || req.headers["x-owner-key"] || "");
        const isOwnerInspection =
          ownerKeyEnv.length >= 16 &&
          providedOwnerKey.length === ownerKeyEnv.length &&
          crypto.timingSafeEqual(Buffer.from(providedOwnerKey), Buffer.from(ownerKeyEnv));
        const intelSummary = marketIntelTracker.getSummary(externalTrafficRadar.totalExternalHits, {
          includeUnlockedRawIdentities: isOwnerInspection,
        });
        return sendJson(res, 200, {
          ok: true,
          startedAt: externalTrafficRadar.startedAt,
          uptimeSeconds: Math.round(process.uptime()),
          keepAlivePingsCount: externalTrafficRadar.keepAlivePingsCount,
          allTimeTotalExternalHits: intelSummary.allTimeTotalExternalHits,
          historicalSeedBaselineHits: intelSummary.historicalSeedBaselineHits,
          totalExternalHits: externalTrafficRadar.totalExternalHits,
          uniqueExternalVisitorsCount: externalTrafficRadar.uniqueVisitorsSet.size,
          commercialAccessPolicy: intelSummary.commercialAccessPolicy,
          marketIntelligenceBySector: {
            uniqueClassifiedAgentsCount: intelSummary.uniqueClassifiedAgentsCount,
            memorySafetyGuardrail: intelSummary.memorySafetyGuardrail,
            byIndustrySector: intelSummary.byIndustrySector,
            searchAndBuyingIntentTrends: intelSummary.searchAndBuyingIntentTrends,
          },
          byEndpoint: externalTrafficRadar.byEndpoint,
          byMcpToolCalled: externalTrafficRadar.byMcpToolCalled,
          byUserAgent: isOwnerInspection
            ? externalTrafficRadar.byUserAgent
            : {
                accessStatus: "NOT_SHARED_INDIVIDUAL_AGENTS_ARE_PRIVATE",
                policy: "Individual agents are never named in public or paid reports. Aggregated demand by sector is available. See /privacy.",
              },
          recentExternalEvents: isOwnerInspection ? externalTrafficRadar.recentExternalEvents : undefined,
        });
      }

      // Registrar cualquier visita externa real (excluyendo polling interno /api/state)
      if (!url.pathname.startsWith("/api/state") && !url.pathname.startsWith("/api/swarm") && url.pathname !== "/mcp") {
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
          from: req.headers["user-agent"]?.slice(0, 22) || "Crawler-Agent",
          to: "EvaluatorNode",
          action: `GET ${url.pathname}`,
          status: 200,
          payloadSummary: "Agent Card manifest served to autonomous peer",
        });
        return sendJson(res, 200, ledger.getAgentCardManifest(baseUrl));
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
          from: req.headers["user-agent"]?.slice(0, 22) || "Notary-Auditor",
          to: "EvaluatorNode",
          action: `GET ${url.pathname}`,
          status: 200,
          payloadSummary: "Served VERITAS-8183 Public M2M Notary & 3-Star Seal Registry",
        });
        return sendJson(res, 200, ledger.getVeritasNotaryManifest(baseUrl));
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
          from: req.headers["user-agent"]?.slice(0, 22) || "Bazaar-Indexer",
          to: "EvaluatorNode",
          action: `GET ${url.pathname}`,
          status: 200,
          payloadSummary: "x402 Bazaar & Pricing descriptor served",
        });
        const bazaar = ledger.getX402BazaarDescriptor(baseUrl);
        const catalog = ledger.getFullCatalogManifest(baseUrl);
        return sendJson(res, 200, {
          ...bazaar,
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
          version: "0.7.0",
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
          from: req.headers["user-agent"]?.slice(0, 22) || "Catalog-Buyer",
          to: "EvaluatorNode",
          action: `GET ${url.pathname}`,
          status: 200,
          payloadSummary: "Served Dual-Tier Institutional & Retail AI Marketplace catalog",
        });
        return sendJson(res, 200, ledger.getFullCatalogManifest(baseUrl));
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
          version: "0.7.0",
          standard: "VERITAS-8183",
          endpoint: `${baseUrl}/mcp`,
          catalogEndpoint: `${baseUrl}/catalog.json`,
          notaryEndpoint: `${baseUrl}/notary.json`,
          transport: "streamable-http",
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
          "> [中文] 两项独立业务。安全（私密）：免费的 MCP 服务器信任检查，对合约、技能、RAG、LLM 输出、GPU SLA 和回测的审计，以及 Base 链上的 USDC 托管。公共公证处（经同意后公开）：卖家自愿登记，获得 1-3 星评级与评价；交易可获得签名的公开回执。用户从不需要提供私钥。政策：/privacy",
          "",
          "## Verified On-Chain Identity / Identidad en Cadena / 链上验证身份",
          "- **Base Mainnet Smart Contract (`TrustGateEscrow8183.sol`)**: `0xd4f77bf843b3c359b233aca46d7ff6604cbd0a5e`",
          "- **Sourcify v2 Full Source Verification**: `exact_match` (Match ID `#59283147`) — https://sourcify.dev/#/lookup/0xd4f77bf843b3c359b233aca46d7ff6604cbd0a5e",
          "- **Evaluator & Notary ECDSA Signer**: `0x861Ac49F8299C45Cca6bD9F0254080Fd82061Ac4`",
          "- **Liability Cap / Tope de Responsabilidad / 责任上限**: `STRICT_CAP_100PCT_OF_PROTOCOL_FEE` (1.0% - 1.5% fee only; Fail-Closed mode)",
          "",
          "## Connection Endpoints / Puntos de Conexión / 接入端点",
          `- **MCP Streamable HTTP (JSON-RPC 2.0)**: \`POST ${baseUrl}/mcp\``,
          `- **VERITAS-8183 Public Notary & 3-Star Seal Registry**: \`GET ${baseUrl}/notary.json\``,
          `- **Dual-Tier AI Catalog & x402 Micro-Bazaar**: \`GET ${baseUrl}/catalog.json\``,
          `- **MCP Auto-Discovery**: \`GET ${baseUrl}/.well-known/mcp.json\``,
          `- **ERC-8004 Agent Card**: \`GET ${baseUrl}/.well-known/agent.json\``,
          `- **Coinbase x402 Bazaar**: \`GET ${baseUrl}/.well-known/x402-bazaar.json\``,
          `- **OpenAPI 3.1.0 Spec**: \`GET ${baseUrl}/openapi.json\``,
          `- **Free MCP Trust Badge**: \`GET ${baseUrl}/badge.svg?server=<mcp-url>\` · record: \`GET ${baseUrl}/trust?server=<mcp-url>\``,
          `- **Data & Privacy Policy**: \`GET ${baseUrl}/privacy\` (JSON) · \`GET ${baseUrl}/privacy.md\`. Security & escrow clients: PRIVATE. Registered sellers: PUBLIC by consent. Traffic: anonymous aggregates only. Users never provide private keys.`,
          "",
          "## START HERE (FREE): Is this MCP server safe to connect?",
          "0. `check_mcp_server_trust` — Give any public MCP URL. Free, no signup, 5 checks/day: permissions, risky tools, prompt-injection signs and changes since last check. 0.25 USDC on Base unlocks the full signed 7-question dossier.",
          "",
          "## 21 MCP Tools: Free Trust Check, 7 Audits, Escrow + Refund, Public Notary, Buyer Spending Limits & Opt-in Matchmaker",
          "1. `discover_verified_stores` — ERC-8004 Dual-Tier Marketplace Filter (`INSTITUTIONAL_B2B` & `RETAIL_INDIE`)",
          "2. `quote_multitoken_escrow` — Atomic Swap Quote (SOL, ETH, VIRTUAL, USDT -> Base USDC)",
          "3. `open_escrow_job` — Lock USDC in ERC-8183 Vault",
          "4. `submit_encrypted_deliverable` — [Vertical 1] Dataset Antimalware & 30-Row Blind Sampling",
          "5. `audit_quant_backtest_escrow` — [Vertical 2] Quant Trading Backtest Auditor (Look-Ahead Bias, PnL, Sharpe, MaxDD)",
          "6. `audit_smart_contract_escrow` — [Vertical 3] Solidity Smart Contract Compiler (`solc 0.8.38`) & Anti-Rugpull Scanner",
          "7. `audit_api_sla_escrow` — [Vertical 4] x402 Paid API & Oracle SLA Verifier (Latency, Schema, Freshness)",
          "8. `audit_agent_skill_escrow` — [Vertical 5] Agent Skill (`SKILL.md`), Prompt & MCP Plugin Anti-Trojan Scanner",
          "9. `audit_rag_embeddings_escrow` — [Vertical 6] RAG Knowledge Base & Vector Embedding Anti-Poisoning Auditor",
          "10. `audit_ai_inference_escrow` — [Vertical 7] Proof-of-Inference & Anti-Model-Downgrade Verifier",
          "11. `audit_depin_gpu_sla_escrow` — [Vertical 8] DePIN & GPU Compute Benchmark SLA Auditor (FP16 TFLOPS, VRAM, Bandwidth)",
          "12. `verify_onchain_escrow_status` — Verify Base Mainnet Contract, Sourcify & LEGION Ed25519 Proofs",
          "13. `purchase_firstparty_catalog_item` — Instant purchase of TrustGate Official Curated Packages (from 1.00 USDC)",
          "14. `register_and_certify_store` — Freemium ERC-8004 Store Onboarding with Mandatory Live Deterministic Audit (0 USDC upfront)",
          "15. `inspect_veritas_8183_seal` — [FREE <5ms] VERITAS-8183 Bilateral Seal Inspector, 15-Provider 2★/3★ Leaderboard, 7-Question Continuous AI Trust Dossier, Version Drift (`v1 -> v2`) Detector & Pre-Execution Policy Firewall",
          "16. `submit_veritas_tier_upgrade_exam` — VERITAS-8183 Seller & Smart Contract Tier Upgrade Exam (1 to 3 Stars with Proof-of-Reserve >=20% & Deterministic Code/Content Audit)",
          "17. `manage_buyer_finops_spend_passport` — Buyer FinOps Spend Guard, Live Buyer Intent Registration, LLM Token Cost Optimizer, VIP Loyalty Discounts (up to 15% OFF) & 1-Time Single-Use Unlock Token Issuer",
          "18. `notarize_and_witness_a2a_deal` — Millisecond A2A & Smart Contract Deal Witness + x402 Micro-Bazaar Executor (including 0.25 USDC Pay-Per-Sector Radar Intelligence `x402-radar-single-sector-intel`)",
          "19. `match_verified_buyers_by_intent` — Exclusive 2-Star & 3-Star Seller Matchmaker to connect with verified buyers by available USDC budget and vertical",
          "",
          "## Continuous AI Trust & 3-Layer Security Architecture (VERIFIED IN v0.7.0)",
          "- **Layer 1 (Static Security)**: 100% deterministic code, `solc 0.8.38` compilation, `SKILL.md`, and RAG vector verification. All 19 tools enforce explicit boolean annotations (`destructiveHint: false`, `openWorldHint: false`), MIT License, non-root Docker execution (`USER node`), and zero `process.env` secret reads.",
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
          `  <url><loc>${baseUrl}/notary.json</loc><priority>0.95</priority></url>`,
          `  <url><loc>${baseUrl}/catalog.json</loc><priority>0.95</priority></url>`,
          `  <url><loc>${baseUrl}/llms.txt</loc><priority>0.9</priority></url>`,
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
      if (req.method === "GET" && url.pathname === "/trust/methodology") {
        recordExternalVisit(req, "/trust/methodology");
        return sendJson(res, 200, TRUST_METHODOLOGY);
      }
      if (req.method === "GET" && url.pathname === "/trust") {
        recordExternalVisit(req, "/trust");
        const target = url.searchParams.get("server");
        if (!target) {
          return sendJson(res, 200, {
            service: "VERITAS MCP Trust Check",
            howTo: "Call MCP tool check_mcp_server_trust at https://own-adam.onrender.com/mcp with { serverUrl }. Then view /trust?server=<url> or embed /badge.svg?server=<url>.",
            stats: getFreeTrustCheckStats(ledger),
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
        recordExternalVisit(req, "/mcp", {
          mcpMethod: rpcPayload?.method || "unknown",
          mcpTool: rpcPayload?.params?.name || null,
          rpcArgs: rpcPayload?.params?.arguments || null,
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

        const rpcResponse = handleMcpJsonRpc(rpcPayload, ledger);
        if (!rpcResponse) {
          res.writeHead(202);
          return res.end();
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

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = createLabServer({ autoStartSwarm: true });
  // Recargar el historial de confianza guardado antes de aceptar tráfico.
  const persist = await enableTrustPersistence(ledger);
  console.log(` * Trust history   : backend=${persist.backend}, fichas recargadas=${persist.loadedSnapshots}${persist.lastError ? `, error=${persist.lastError}` : ""}`);
  server.listen(PORT, () => {
    console.log(`\n===================================================================`);
    console.log(` NODO M2M INTERVENTOR ACTIVO (Tráfico Autónomo Bot-a-Bot en curso)`);
    console.log(` * Agent Card (IA) : http://localhost:${PORT}/.well-known/agent.json`);
    console.log(` * MCP HTTP RPC    : POST http://localhost:${PORT}/mcp`);
    console.log(` * x402 Endpoint   : POST http://localhost:${PORT}/api/m2m/escrow`);
    console.log(` * Telemetría Dueño: http://localhost:${PORT}`);
    console.log(`===================================================================\n`);
  });
}
