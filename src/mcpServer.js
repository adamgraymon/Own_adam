#!/usr/bin/env node
/**
 * Módulo 4: Servidor MCP (Model Context Protocol - JSON-RPC 2.0)
 * Interfaz 100% para IAs (sin pantallas humanas).
 * Soportado tanto por HTTP Streamable (POST /mcp) como por STDIO (node src/mcpServer.js).
 */

import readline from "node:readline";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { quoteSwapAndEscrow } from "./swapRouter.js";
import { AgenticEscrowLedger } from "./escrowContract.js";
import {
  auditQuantStrategyBacktest,
  auditSmartContractDeliverable,
  auditApiOracleSla,
  auditAgentSkillDeliverable,
  auditRagEmbeddingsDeliverable,
  auditAiInferenceDeliverable,
  auditDepinGpuComputeSla,
} from "./multiVerticalAuditors.js";

export const MCP_TOOLS = [
  {
    name: "discover_verified_stores",
    description:
      "[EN] Query ERC-8004 Dual-Tier AI Marketplace (INSTITUTIONAL_B2B & RETAIL_INDIE) across 8 verticals, including Official First-Party curated packages. | [ES] Consulta el Catálogo Dual ERC-8004 (Institucional B2B y Retail/Indie) en las 8 verticales y paquetes oficiales. | [中文] 查询 ERC-8004 双层 AI 市场目录（机构 B2B 与零售/独立开发者，覆盖 8 大垂直领域）。",
    inputSchema: {
      type: "object",
      properties: {
        minReputation: {
          type: "number",
          description: "Minimum ERC-8004 reputation score (0-100). Recommended >= 70.",
        },
        marketTier: {
          type: "string",
          enum: ["ALL", "INSTITUTIONAL_B2B", "RETAIL_INDIE"],
          description: "Filter by INSTITUTIONAL_B2B (non-retail enterprise/funds), RETAIL_INDIE (traders/indie bots), or ALL.",
        },
        vertical: {
          type: "string",
          description: "Filter by vertical (e.g. VERTICAL_1_DATASET, VERTICAL_2_QUANT_ALPHA, VERTICAL_3_SOLIDITY_SECURITY, etc. or ALL).",
        },
        maxPriceUsdc: {
          type: "number",
          description: "Optional maximum starting price in USDC.",
        },
        firstPartyOnly: {
          type: "boolean",
          description: "If true, returns only TrustGate Official First-Party stores & instant-delivery bundles.",
        },
      },
    },
  },
  {
    name: "quote_multitoken_escrow",
    description:
      "[EN] Atomic multi-token swap quote (SOL, ETH, VIRTUAL, USDT -> Base USDC) with Dual-Lane Guardrail & volume discount (1% from 10 USDC). | [ES] Cotiza conversión atómica a USDC en Base con descuento por volumen. | [中文] 多代币原子兑换报价 (SOL/ETH/USDT 转 Base USDC) 及 ERC-8183 托管费用计算。",
    inputSchema: {
      type: "object",
      properties: {
        tokenSymbol: { type: "string", enum: ["SOL", "ETH", "VIRTUAL", "USDT", "USDC"] },
        tokenAmount: { type: "number" },
      },
      required: ["tokenSymbol", "tokenAmount"],
    },
  },
  {
    name: "open_escrow_job",
    description:
      "[EN] Lock USDC in non-custodial ERC-8183 Smart Contract on Base Mainnet to hire an AI store. | [ES] Bloquea fondos en USDC en el contrato ERC-8183 para contratar una Tienda IA. | [中文] 在 Base 主网 ERC-8183 非托管智能合约中锁定 USDC 资金以雇佣 AI 代理商店。",
    inputSchema: {
      type: "object",
      properties: {
        buyerId: { type: "string" },
        storeId: { type: "string" },
        tokenSymbol: { type: "string" },
        tokenAmount: { type: "number" },
        minRows: { type: "number" },
      },
      required: ["storeId", "tokenSymbol", "tokenAmount"],
    },
  },
  {
    name: "submit_encrypted_deliverable",
    description:
      "[EN] Vertical 1 (Datasets): Audit encrypted CSV/JSON dataset (100% deterministic antimalware/clone scan + 30-row Vitter cryptographic blind sampling) & settle USDC or refund 100%. | [ES] Línea 1 (Datasets): Escáner Antimalware + Muestreo Ciego de 30 filas y liquidación automática. | [中文] 垂直领域1 (数据集审计): AES-256 加密 CSV/JSON 数据集反恶意软件与盲抽样审计，自动释放 USDC 或 100% 退款。",
    inputSchema: {
      type: "object",
      properties: {
        jobId: { type: "string" },
        rawDatasetJsonString: { type: "string" },
      },
      required: ["jobId", "rawDatasetJsonString"],
    },
  },
  {
    name: "audit_quant_backtest_escrow",
    description:
      "[EN] Vertical 2 (Quant Backtests): Audit trading strategy backtests (NQ futures, crypto, forex) for Look-Ahead Bias, fake PnL accounting, Profit Factor, Max Drawdown & Sharpe Ratio. | [ES] Línea 2 (Backtests Cuantitativos): Audita historial de trading detectando Look-Ahead Bias y PnL falso. | [中文] 垂直领域2 (量化交易回测审计): 检测未来函数 (Look-Ahead Bias)、虚假盈亏 (PnL)、夏普比率、最大回撤与盈亏比。",
    inputSchema: {
      type: "object",
      properties: {
        trades: { type: "array", description: "Array of trades with entryTime/entryTimestampMs, exitTime/exitTimestampMs, side, entryPrice, exitPrice, size, pnlUsd" },
        minTrades: { type: "number" },
        minProfitFactor: { type: "number" },
        maxDrawdownPct: { type: "number" },
      },
      required: ["trades"],
    },
  },
  {
    name: "audit_smart_contract_escrow",
    description:
      "[EN] Vertical 3 (Solidity Smart Contracts): Compile Solidity source with real solc 0.8.38, scan against rugpull backdoors (selfdestruct, delegatecall, tx.origin, assembly sstore) & verify required ABI functions. | [ES] Línea 3 (Smart Contracts Solidity): Compila con solc real y bloquea puertas traseras. | [中文] 垂直领域3 (Solidity 智能合约安全审计): 真实 solc 编译、反跑路后门扫描 (selfdestruct/delegatecall/tx.origin) 与 ABI 接口验证。",
    inputSchema: {
      type: "object",
      properties: {
        soliditySourceCode: { type: "string" },
        contractName: { type: "string" },
        requiredFunctions: { type: "array", items: { type: "string" } },
      },
      required: ["soliditySourceCode"],
    },
  },
  {
    name: "audit_api_sla_escrow",
    description:
      "[EN] Vertical 4 (x402 Paid API SLA Oracle): Verify paid API latency SLA (ms), mandatory JSON schema keys & cryptographic timestamp freshness. | [ES] Línea 4 (Oráculo SLA de APIs Pagas x402): Audita latencia, esquema JSON y frescura de datos. | [中文] 垂直领域4 (x402 付费 API 与预言机 SLA 审计): 验证响应延迟 (ms)、JSON 必填字段与时间戳新鲜度。",
    inputSchema: {
      type: "object",
      properties: {
        apiResponsePayload: { type: "object" },
        observedLatencyMs: { type: "number" },
        maxLatencyMs: { type: "number" },
        requiredKeys: { type: "array", items: { type: "string" } },
      },
      required: ["apiResponsePayload"],
    },
  },
  {
    name: "audit_agent_skill_escrow",
    description:
      "[EN] Vertical 5 (Agent Skills & MCP Plugins): Scan SKILL.md, prompts & scripts against Trojan Skills (.env/PRIVATE_KEY exfiltration, eval/child_process, Base64 droppers & zero-width Unicode injection). | [ES] Línea 5 (Skills y Plugins MCP): Bloquea Skills Troyanos y robo de llaves privadas. | [中文] 垂直领域5 (AI 技能与 MCP 插件木马审计): 扫描 SKILL.md 与脚本，拦截私钥环境变量窃取、远程代码执行与隐形 Unicode 提示词注入。",
    inputSchema: {
      type: "object",
      properties: {
        skillMarkdown: { type: "string" },
        bundledScripts: { type: "string" },
        requiredSections: { type: "array", items: { type: "string" } },
      },
      required: ["skillMarkdown"],
    },
  },
  {
    name: "audit_rag_embeddings_escrow",
    description:
      "[EN] Vertical 6 (RAG Knowledge Bases & Vector Embeddings): Verify exact vector dimensions, valid L2 norm (no zero/NaN vectors), zero cloned chunks & block RAG Data Poisoning. | [ES] Línea 6 (Memorias RAG y Vectores): Verifica dimensiones, norma L2 y bloquea envenenamiento RAG. | [中文] 垂直领域6 (RAG 向量知识库防投毒审计): 验证向量维度一致性、L2 范数有效性并拦截间接提示词注入投毒。",
    inputSchema: {
      type: "object",
      properties: {
        chunks: { type: "array" },
        expectedDimension: { type: "number" },
        minChunks: { type: "number" },
      },
      required: ["chunks"],
    },
  },
  {
    name: "audit_ai_inference_escrow",
    description:
      "[EN] Vertical 7 (Proof-of-Inference & Anti-Model-Downgrade): Audit LLM output against token billing inflation, repetitive quantization collapse & constraint violations. | [ES] Línea 7 (Proof-of-Inference): Audita contra sobrefacturación de tokens y cambiazo de modelo IA. | [中文] 垂直领域7 (AI 推理防降级证明): 审计 Token 虚假超额计费、模型偷换导致的重复坍塌及指令约束合规性。",
    inputSchema: {
      type: "object",
      properties: {
        responseText: { type: "string" },
        billedOutputTokens: { type: "number" },
        mustIncludeTerms: { type: "array", items: { type: "string" } },
        forbiddenTerms: { type: "array", items: { type: "string" } },
        minUniqueWordRatio: { type: "number" },
      },
      required: ["responseText", "billedOutputTokens"],
    },
  },
  {
    name: "audit_depin_gpu_sla_escrow",
    description:
      "[EN] Vertical 8 (DePIN & GPU Compute SLA): Verify decentralized GPU hardware benchmarks (FP16 TFLOPS, available VRAM GB, memory bandwidth GB/s, thermal throttling & packet loss). | [ES] Línea 8 (Alquiler de GPUs y Cómputo DePIN): Verifica TFLOPS FP16, VRAM y temperatura. | [中文] 垂直领域8 (DePIN 去中心化 GPU 算力 SLA 审计): 验证 FP16 TFLOPS 算力、可用显存 (VRAM)、显存带宽与温度丢包率。",
    inputSchema: {
      type: "object",
      properties: {
        benchmarkReport: { type: "object" },
        minTflopsFp16: { type: "number" },
        minVramGb: { type: "number" },
        minMemoryBandwidthGbs: { type: "number" },
        maxTempCelsius: { type: "number" },
      },
      required: ["benchmarkReport"],
    },
  },
  {
    name: "verify_onchain_escrow_status",
    description:
      "[EN] Return Base Mainnet TrustGateEscrow8183 (0xd4f77bf843b3c359b233aca46d7ff6604cbd0a5e) cryptographic proofs, Sourcify exact_match verification & settled tx hashes. | [ES] Devuelve las pruebas criptográficas del contrato en Base Mainnet y Sourcify exact_match. | [中文] 获取 Base 主网托管合约 (0xd4f77bf8...0a5e) 的 Sourcify 源码精确匹配证明与链上交易哈希。",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "purchase_firstparty_catalog_item",
    description:
      "[EN] Instant purchase & cryptographic delivery of TrustGate Official First-Party curated packages (Institutional CME Globex NQ microstructure, Sourcify Solidity blueprints, Enterprise RAG/Skill Firewall, Retail Anti-Rugpull & Zero-Lookahead Starter Packs from 1 USDC). | [ES] Compra y entrega instantánea de paquetes oficiales de TrustGate (Institucional y Retail desde 1 USDC). | [中文] 即时购买并获取 TrustGate 官方认证精选数据包（芝商所 NQ 微观结构、Sourcify 智能合约蓝图、企业级 RAG 防毒包及 1 USDC 起的零售反貔貅工具包）。",
    inputSchema: {
      type: "object",
      properties: {
        itemId: {
          type: "string",
          enum: [
            "inst-cme-nq-microstructure-v06",
            "inst-sourcify-erc8183-vault-v06",
            "inst-enterprise-rag-skill-firewall-v06",
            "retail-anti-rugpull-scanner-pack-v06",
            "retail-nq-quant-starter-backtest-v06",
            "retail-safe-mcp-skill-starter-v06",
          ],
          description: "ID of the curated First-Party package to purchase.",
        },
        buyerId: { type: "string", description: "Buyer agent ID (optional)." },
        paymentToken: { type: "string", enum: ["USDC", "SOL", "ETH", "VIRTUAL", "USDT"] },
        paymentTxHash: {
          type: "string",
          description:
            "Base Mainnet (Chain ID 8453) USDC transfer transaction hash (0x...) paying the exact item price to Treasury 0x861Ac49F8299C45Cca6bD9F0254080Fd82061Ac4. If omitted on external HTTP calls, returns a 402 Payment Invoice.",
        },
      },
      required: ["itemId"],
    },
  },
  {
    name: "register_and_certify_store",
    description:
      "[EN] Freemium ERC-8004 Store Onboarding (0 USDC upfront; 2.0% Broker referral fee + 1.0%-1.5% Escrow fee on sales). Requires passing a live deterministic audit of sampleDeliverable for the target vertical. | [ES] Registro y certificación gratuita ERC-8004 para tiendas IA externas (auditoría determinista obligatoria en vivo; comisión solo por venta exitosa). | [中文] 免费注册并认证 ERC-8004 外部 AI 商店（0 预付费用，必须通过实时确定性安全审计，仅在成交时收取 2% 经纪佣金 + 托管费）。",
    inputSchema: {
      type: "object",
      properties: {
        storeId: { type: "string" },
        storeName: { type: "string" },
        walletAddress: { type: "string" },
        endpointUrl: { type: "string" },
        vertical: {
          type: "string",
          enum: [
            "VERTICAL_1_DATASET",
            "VERTICAL_2_QUANT_ALPHA",
            "VERTICAL_3_SOLIDITY_SECURITY",
            "VERTICAL_4_X402_ORACLES",
            "VERTICAL_5_CERTIFIED_SKILLS",
            "VERTICAL_6_RAG_KNOWLEDGE",
            "VERTICAL_7_VERIFIED_INFERENCE",
            "VERTICAL_8_DEPIN_GPU",
          ],
        },
        marketTier: {
          type: "string",
          enum: ["INSTITUTIONAL_B2B", "RETAIL_INDIE"],
        },
        startingPriceUsdc: { type: "number" },
        sampleDeliverable: {
          type: "object",
          description: "Sample deliverable payload to be audited live before listing.",
        },
      },
      required: ["storeId", "storeName", "walletAddress", "vertical", "sampleDeliverable"],
    },
  },
];

/**
 * Procesa cualquier mensaje JSON-RPC 2.0 del protocolo MCP sobre una instancia del Ledger.
 */
export function handleMcpJsonRpc(rpcRequest, ledger) {
  const { jsonrpc = "2.0", id = null, method, params = {} } = rpcRequest || {};
  ledger.wallets.protocol_treasury.stats.mcpCallsHandled += 1;

  try {
    if (method === "initialize") {
      return {
        jsonrpc,
        id,
        result: {
          protocolVersion: "2025-06-18",
          capabilities: { tools: {} },
          serverInfo: {
            name: "trustgate-erc8183-mcp",
            version: "0.6.0",
          },
        },
      };
    }

    if (method === "notifications/initialized" || method === "notifications/cancelled") {
      return null;
    }

    if (method === "ping") {
      return {
        jsonrpc,
        id,
        result: {},
      };
    }

    if (method === "server/discover") {
      return {
        jsonrpc,
        id,
        result: {
          protocolVersion: "2025-06-18",
          serverInfo: {
            name: "trustgate-erc8183-mcp",
            version: "0.6.0",
            contractAddress: ledger.wallets.escrow_contract.address,
            chainId: 8453,
            sourcifyMatchId: 59283147,
          },
          capabilities: { tools: {}, resources: {}, prompts: {} },
          tools: MCP_TOOLS,
        },
      };
    }

    if (method === "resources/list") {
      return {
        jsonrpc,
        id,
        result: {
          resources: [
            {
              uri: "https://own-adam.onrender.com/catalog.json",
              name: "TrustGate Dual-Tier AI Marketplace Catalog (Institutional B2B & Retail/Indie)",
              mimeType: "application/json",
            },
            {
              uri: "https://own-adam.onrender.com/.well-known/agent.json",
              name: "ERC-8004 Agent Identity & Base Mainnet Contract Manifest",
              mimeType: "application/json",
            },
          ],
        },
      };
    }

    if (method === "resources/templates/list") {
      return {
        jsonrpc,
        id,
        result: { resourceTemplates: [] },
      };
    }

    if (method === "prompts/list") {
      return {
        jsonrpc,
        id,
        result: { prompts: [] },
      };
    }

    if (method === "tools/list") {
      ledger.logWirePacket({
        protocol: "MCP-JSONRPC",
        from: params.callerAgent || "External-AI-Agent",
        to: "MCP-Server",
        action: "tools/list",
        status: 200,
        payloadSummary: `Exposed ${MCP_TOOLS.length} machine tools to agent context`,
      });
      return {
        jsonrpc,
        id,
        result: { tools: MCP_TOOLS },
      };
    }

    if (method === "tools/call") {
      const toolName = params.name;
      const args = params.arguments || {};

      ledger.logWirePacket({
        protocol: "MCP-JSONRPC",
        from: args.buyerId || args.callerAgent || "AI-Agent",
        to: "MCP-Server",
        action: `tools/call:${toolName}`,
        status: 200,
        payloadSummary: JSON.stringify(args).slice(0, 110),
      });

      let output;
      switch (toolName) {
        case "discover_verified_stores":
          output = ledger.discoverStoresErc8004({
            minReputation: args.minReputation ?? 70,
            marketTier: args.marketTier || "ALL",
            vertical: args.vertical || "ALL",
            maxPriceUsdc: args.maxPriceUsdc ?? null,
            firstPartyOnly: Boolean(args.firstPartyOnly),
          });
          break;
        case "quote_multitoken_escrow":
          output = quoteSwapAndEscrow({
            tokenSymbol: args.tokenSymbol,
            tokenAmount: args.tokenAmount,
          });
          break;
        case "open_escrow_job":
          output = ledger.createAndFundJob({
            buyerId: args.buyerId,
            storeId: args.storeId,
            tokenSymbol: args.tokenSymbol,
            tokenAmount: args.tokenAmount,
            minRows: args.minRows ?? 1500,
          });
          break;
        case "submit_encrypted_deliverable":
          output = ledger.submitAndAuditDeliverable({
            jobId: args.jobId,
            rawDatasetJsonString: args.rawDatasetJsonString,
          });
          break;
        case "audit_quant_backtest_escrow":
          output = auditQuantStrategyBacktest({
            trades: args.trades,
            spec: {
              minTrades: args.minTrades ?? 20,
              minProfitFactor: args.minProfitFactor ?? 1.25,
              maxDrawdownPct: args.maxDrawdownPct ?? 25.0,
            },
          });
          break;
        case "audit_smart_contract_escrow":
          output = auditSmartContractDeliverable({
            soliditySourceCode: args.soliditySourceCode,
            contractName: args.contractName || "",
            requiredFunctions: args.requiredFunctions || [],
          });
          break;
        case "audit_api_sla_escrow":
          output = auditApiOracleSla({
            apiResponsePayload: args.apiResponsePayload,
            observedLatencyMs: args.observedLatencyMs ?? 45,
            slaSpec: {
              maxLatencyMs: args.maxLatencyMs ?? 300,
              requiredKeys: args.requiredKeys || ["symbol", "price", "timestamp"],
            },
          });
          break;
        case "audit_agent_skill_escrow":
          output = auditAgentSkillDeliverable({
            skillMarkdown: args.skillMarkdown,
            bundledScripts: args.bundledScripts || "",
            requiredSections: args.requiredSections || ["name:", "description:"],
          });
          break;
        case "audit_rag_embeddings_escrow":
          output = auditRagEmbeddingsDeliverable({
            chunks: args.chunks,
            expectedDimension: args.expectedDimension ?? 8,
            minChunks: args.minChunks ?? 5,
          });
          break;
        case "audit_ai_inference_escrow":
          output = auditAiInferenceDeliverable({
            responseText: args.responseText,
            billedOutputTokens: args.billedOutputTokens ?? 50,
            mustIncludeTerms: args.mustIncludeTerms || [],
            forbiddenTerms: args.forbiddenTerms || [],
            minUniqueWordRatio: args.minUniqueWordRatio ?? 0.35,
          });
          break;
        case "audit_depin_gpu_sla_escrow":
          output = auditDepinGpuComputeSla({
            benchmarkReport: args.benchmarkReport,
            slaSpec: {
              minTflopsFp16: args.minTflopsFp16 ?? 120,
              minVramGb: args.minVramGb ?? 40,
              minMemoryBandwidthGbs: args.minMemoryBandwidthGbs ?? 900,
              maxTempCelsius: args.maxTempCelsius ?? 85,
            },
          });
          break;
        case "verify_onchain_escrow_status":
          output = {
            ok: true,
            ...ledger.getAgentCardManifest().identity,
            paymentTerms: ledger.getAgentCardManifest().paymentTerms,
          };
          break;
        case "purchase_firstparty_catalog_item":
          output = ledger.purchaseFirstPartyCatalogItem({
            itemId: args.itemId,
            buyerId: args.buyerId || "alphaquant-agent",
            paymentToken: args.paymentToken || "USDC",
            paymentTxHash: args.paymentTxHash || null,
            requireOnChainPaymentProof: Boolean(args._requireOnChainPaymentProof),
            onChainVerificationResult: args._onChainVerificationResult || null,
          });
          break;
        case "register_and_certify_store":
          output = ledger.registerAndCertifyStore({
            storeId: args.storeId,
            storeName: args.storeName,
            walletAddress: args.walletAddress,
            endpointUrl: args.endpointUrl,
            vertical: args.vertical,
            marketTier: args.marketTier,
            startingPriceUsdc: args.startingPriceUsdc,
            sampleDeliverable: args.sampleDeliverable || {},
          });
          break;
        default:
          return {
            jsonrpc,
            id,
            error: { code: -32601, message: `Herramienta MCP desconocida: ${toolName}` },
          };
      }

      return {
        jsonrpc,
        id,
        result: {
          content: [{ type: "text", text: JSON.stringify(output) }],
          structuredContent: output,
          isError: output?.ok === false || output?.viable === false,
        },
      };
    }

    return {
      jsonrpc,
      id,
      error: { code: -32601, message: `Método JSON-RPC no soportado: ${method}` },
    };
  } catch (err) {
    return {
      jsonrpc,
      id,
      error: { code: -32000, message: err.message },
    };
  }
}

// Modo STDIO nativo para conectar directo en clientes de IA (Claude, Cursor, Antigravity, etc.)
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const standaloneLedger = new AgenticEscrowLedger();
  const rl = readline.createInterface({ input: process.stdin, terminal: false });

  rl.on("line", (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      const req = JSON.parse(trimmed);
      const resp = handleMcpJsonRpc(req, standaloneLedger);
      if (resp) {
        process.stdout.write(JSON.stringify(resp) + "\n");
      }
    } catch (err) {
      process.stdout.write(
        JSON.stringify({
          jsonrpc: "2.0",
          id: null,
          error: { code: -32700, message: "Parse error: " + err.message },
        }) + "\n"
      );
    }
  });
}
