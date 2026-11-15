/**
 * Nodo M2M Principal (Puerto 3402)
 * Expone protocolos reales para IAs:
 * - GET  /.well-known/agent.json  (Ficha de descubrimiento ERC-8004 / Agent Card)
 * - POST /mcp                     (Servidor MCP sobre HTTP JSON-RPC 2.0)
 * - POST /api/m2m/escrow          (Handshake real HTTP 402 Payment Required + X-Payment)
 * - GET  /                        (Monitor pasivo de telemetría para el dueño, cero formularios humanos)
 */

import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SUPPORTED_TOKENS } from "./swapRouter.js";
import { AgenticEscrowLedger } from "./escrowContract.js";
import { handleMcpJsonRpc, MCP_TOOLS } from "./mcpServer.js";
import { executeAutonomousM2MCycle } from "./m2mSwarmEngine.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "..", "public");
const PORT = Number(process.env.PORT) || 3402;

const ledger = new AgenticEscrowLedger();
let swarmRunning = false;
let swarmCycleCount = 0;
let swarmInterval = null;

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
        return sendJson(res, 200, {
          ok: true,
          status: "awake",
          service: "trustgate-erc8183-m2m-auditor",
          contract: ledger.wallets.escrow_contract.address,
          uptimeSeconds: Math.round(process.uptime()),
          timestamp: new Date().toISOString(),
        });
      }

      // =====================================================================
      // PUERTA 1 M2M: Agent Card Estándar (/.well-known/agent.json)
      // =====================================================================
      if (
        req.method === "GET" &&
        (url.pathname === "/.well-known/agent.json" || url.pathname === "/api/x402-agent-card")
      ) {
        ledger.logWirePacket({
          protocol: "ERC-8004",
          from: req.headers["user-agent"]?.slice(0, 22) || "Crawler-Agent",
          to: "EvaluatorNode",
          action: "GET /.well-known/agent.json",
          status: 200,
          payloadSummary: "Agent Card manifest served to autonomous peer",
        });
        return sendJson(res, 200, ledger.getAgentCardManifest(baseUrl));
      }

      // =====================================================================
      // PUERTA 1.B M2M: Ficha x402 Bazaar & OpenAPI 3.1.0 para buscadores IA
      // =====================================================================
      if (req.method === "GET" && url.pathname === "/.well-known/x402-bazaar.json") {
        ledger.logWirePacket({
          protocol: "x402-BAZAAR",
          from: req.headers["user-agent"]?.slice(0, 22) || "Bazaar-Indexer",
          to: "EvaluatorNode",
          action: "GET /.well-known/x402-bazaar.json",
          status: 200,
          payloadSummary: "x402 Bazaar catalog descriptor served",
        });
        return sendJson(res, 200, ledger.getX402BazaarDescriptor(baseUrl));
      }

      if (req.method === "GET" && url.pathname === "/openapi.json") {
        return sendJson(res, 200, ledger.getOpenApiSpec(baseUrl));
      }

      // =====================================================================
      // PUERTA 1.C M2M: Autodescubrimiento MCP (/.well-known/mcp.json), /llms.txt y /robots.txt Trilingüe
      // =====================================================================
      if (req.method === "GET" && url.pathname === "/.well-known/mcp.json") {
        return sendJson(res, 200, {
          mcpVersion: "2025-06-18",
          name: "io.github.adamgraymon/trustgate-erc8183-mcp",
          version: "0.5.0",
          endpoint: `${baseUrl}/mcp`,
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

      if (req.method === "GET" && (url.pathname === "/llms.txt" || url.pathname === "/llms-full.txt")) {
        const llmsTxt = [
          "# TrustGate ERC-8183 — 8-Vertical M2M Escrow Auditor & Multi-Token USDC Solver (EN / ES / 中文)",
          "",
          "> [EN] Official #1 Machine-to-Machine (M2M) Non-Custodial USDC Escrow & Deterministic Auditor on Base Mainnet (Chain ID 8453). Published in The Official MCP Registry (`io.github.adamgraymon/*`).",
          "> [ES] Nodo M2M #1 Oficial de Interventoría Determinista y Fideicomiso No-Custodial en USDC sobre Base Mainnet (Chain ID 8453).",
          "> [中文] Base 主网 (Chain ID 8453) 官方排名第一的机器对机器 (M2M) ERC-8183 非托管 USDC 托管与 8 大垂直领域确定性审计节点。",
          "",
          "## Verified On-Chain Identity / Identidad en Cadena / 链上验证身份",
          "- **Base Mainnet Smart Contract (`TrustGateEscrow8183.sol`)**: `0xd4f77bf843b3c359b233aca46d7ff6604cbd0a5e`",
          "- **Sourcify v2 Full Source Verification**: `exact_match` (Match ID `#59283147`) — https://sourcify.dev/#/lookup/0xd4f77bf843b3c359b233aca46d7ff6604cbd0a5e",
          "- **Evaluator ECDSA Signer**: `0x861Ac49F8299C45Cca6bD9F0254080Fd82061Ac4`",
          "- **Liability Cap / Tope de Responsabilidad / 责任上限**: `STRICT_CAP_100PCT_OF_PROTOCOL_FEE` (1.0% - 1.5% fee only; Fail-Closed mode)",
          "",
          "## Connection Endpoints / Puntos de Conexión / 接入端点",
          `- **MCP Streamable HTTP (JSON-RPC 2.0)**: \`POST ${baseUrl}/mcp\``,
          `- **MCP Auto-Discovery**: \`GET ${baseUrl}/.well-known/mcp.json\``,
          `- **ERC-8004 Agent Card**: \`GET ${baseUrl}/.well-known/agent.json\``,
          `- **Coinbase x402 Bazaar**: \`GET ${baseUrl}/.well-known/x402-bazaar.json\``,
          `- **OpenAPI 3.1.0 Spec**: \`GET ${baseUrl}/openapi.json\``,
          `- **x402 Payment Handshake**: \`POST ${baseUrl}/api/m2m/escrow\``,
          "",
          "## 8 Audited Verticals & 12 MCP Tools (EN / ES / 中文)",
          "1. `discover_verified_stores` — ERC-8004 AI Store Reputation Filter / Filtro de reputación / AI 商店声誉过滤",
          "2. `quote_multitoken_escrow` — Atomic Swap Quote (SOL, ETH, VIRTUAL, USDT -> Base USDC) / Cotizador atómico / 多代币转 Base USDC 报价",
          "3. `open_escrow_job` — Lock USDC in ERC-8183 Vault / Bloqueo no-custodial en contrato / ERC-8183 智能合约锁定 USDC",
          "4. `submit_encrypted_deliverable` — [Vertical 1] Dataset Antimalware & 30-Row Blind Sampling / Auditoría de Datasets CSV/JSON / 数据集反恶意软件与盲抽样审计",
          "5. `audit_quant_backtest_escrow` — [Vertical 2] Quant Trading Backtest Auditor (Look-Ahead Bias, PnL, Sharpe, MaxDD) / Auditor de Estrategias Cuantitativas / 量化交易回测防未来函数审计",
          "6. `audit_smart_contract_escrow` — [Vertical 3] Solidity Smart Contract Compiler (`solc 0.8.38`) & Anti-Rugpull Scanner / Auditor de Contratos Solidity / Solidity 智能合约编译与反跑路后门审计",
          "7. `audit_api_sla_escrow` — [Vertical 4] x402 Paid API & Oracle SLA Verifier (Latency, Schema, Freshness) / Oráculo de SLA de APIs / x402 付费 API 与预言机延迟 SLA 审计",
          "8. `audit_agent_skill_escrow` — [Vertical 5] Agent Skill (`SKILL.md`), Prompt & MCP Plugin Anti-Trojan Scanner / Escáner Anti-Troyanos de Skills / AI 技能与 MCP 插件防私钥窃取木马审计",
          "9. `audit_rag_embeddings_escrow` — [Vertical 6] RAG Knowledge Base & Vector Embedding Anti-Poisoning Auditor / Auditor de Memorias RAG y Vectores / RAG 向量知识库防投毒与范数审计",
          "10. `audit_ai_inference_escrow` — [Vertical 7] Proof-of-Inference & Anti-Model-Downgrade Verifier / Verificador Anti-Cambiazo de Inferencia IA / AI 推理防降级证明与 Token 计费审计",
          "11. `audit_depin_gpu_sla_escrow` — [Vertical 8] DePIN & GPU Compute Benchmark SLA Auditor (FP16 TFLOPS, VRAM, Bandwidth) / Auditor de GPUs DePIN / DePIN 去中心化 GPU 算力基准 SLA 审计",
          "12. `verify_onchain_escrow_status` — Verify Base Mainnet Contract & Sourcify Proofs / Verificación On-Chain / 链上合约与 Sourcify 验证查询",
        ].join("\n");

        res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
        return res.end(llmsTxt);
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
          `Sitemap: ${baseUrl}/openapi.json`,
          `# LLMs Index: ${baseUrl}/llms.txt`,
          `# MCP Endpoint: ${baseUrl}/mcp`,
        ].join("\n");
        res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
        return res.end(robotsTxt);
      }

      // =====================================================================
      // PUERTA 2 M2M: Servidor MCP Real (JSON-RPC 2.0 sobre HTTP POST /mcp)
      // =====================================================================
      if (req.method === "POST" && url.pathname === "/mcp") {
        const rpcPayload = await readJsonBody(req);
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
