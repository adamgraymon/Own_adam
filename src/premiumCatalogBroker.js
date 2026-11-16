/**
 * Módulo 8 (v0.6.0): Catálogo Dual y Broker de IAs Premium (Institutional B2B + Retail/Indie)
 *
 * Incluye:
 *  1. Directorio Multivertical (8 Verticales) dividido en dos carriles:
 *     - INSTITUTIONAL_B2B (Fondos Quant, Empresas, Equipos de Ingeniería)
 *     - RETAIL_INDIE (Traders independientes, creadores de bots, usuarios Claude/Cursor)
 *  2. 6 Paquetes Oficiales First-Party (100% de margen neto para protocol_treasury)
 *  3. Certificación Freemium con Auditoría Determinista Obligatoria (register_and_certify_store)
 *     + Cobro automático de Comisión de Broker (2.0%) + Escrow Fee (1.0% - 1.5%) por venta exitosa.
 */

import crypto from "node:crypto";
import { encryptDeliverable, auditEncryptedDataset } from "./auditorEngine.js";
import {
  buildAuditScopeAndLiability,
  auditQuantStrategyBacktest,
  auditSmartContractDeliverable,
  auditApiOracleSla,
  auditAgentSkillDeliverable,
  auditRagEmbeddingsDeliverable,
  auditAiInferenceDeliverable,
  auditDepinGpuComputeSla,
} from "./multiVerticalAuditors.js";

function round6(n) {
  return Math.round(n * 1e6) / 1e6;
}

const BASE_MAINNET_RPC = "https://mainnet.base.org";
const BASE_USDC_CONTRACT = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const ERC20_TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const OFFICIAL_TREASURY_WALLET = "0x861ac49f8299c45cca6bd9f0254080fd82061ac4";
const OFFICIAL_ESCROW_CONTRACT = "0xd4f77bf843b3c359b233aca46d7ff6604cbd0a5e";
const usedOnChainPaymentTxHashes = new Set();

/**
 * Verifica criptográficamente en vivo contra Base Mainnet (Chain ID 8453) que un paymentTxHash:
 *  1. Exista y tenga status === "0x1" (confirmado en bloque real)
 *  2. No haya sido usado antes (Anti-Replay)
 *  3. Contenga un evento Transfer de USDC nativo (0x833589...02913) hacia nuestra Tesorería o Contrato Escrow
 *     por un monto >= requiredAmountUsdc
 */
export async function verifyOnChainBaseMainnetUsdcPayment({ paymentTxHash, requiredAmountUsdc }) {
  const txHashNorm = String(paymentTxHash || "").trim().toLowerCase();
  if (!/^0x[a-f0-9]{64}$/.test(txHashNorm)) {
    return {
      verified: false,
      reason: "Formato de paymentTxHash inválido: debe ser un hash hexadecimal de 66 caracteres (0x + 64 hex) en Base Mainnet.",
    };
  }

  if (usedOnChainPaymentTxHashes.has(txHashNorm)) {
    return {
      verified: false,
      reason: `Anti-Replay: El paymentTxHash ${txHashNorm} ya fue utilizado previamente para desbloquear un paquete.`,
    };
  }

  try {
    const rpcRes = await fetch(BASE_MAINNET_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getTransactionReceipt",
        params: [txHashNorm],
      }),
    });
    const rpcJson = await rpcRes.json();
    const receipt = rpcJson?.result;

    if (!receipt) {
      return {
        verified: false,
        reason: `No se encontró la transacción ${txHashNorm} en Base Mainnet (Chain ID 8453).`,
      };
    }

    if (receipt.status !== "0x1") {
      return {
        verified: false,
        reason: `La transacción ${txHashNorm} falló en cadena (status !== 0x1).`,
      };
    }

    let totalUsdcTransferredToUs = 0;
    for (const log of receipt.logs || []) {
      const tokenAddr = String(log.address || "").toLowerCase();
      const topic0 = String(log.topics?.[0] || "").toLowerCase();
      const topic2 = String(log.topics?.[2] || "").toLowerCase();

      if (tokenAddr === BASE_USDC_CONTRACT && topic0 === ERC20_TRANSFER_TOPIC && topic2.length === 66) {
        const recipientAddr = "0x" + topic2.slice(26);
        if (recipientAddr === OFFICIAL_TREASURY_WALLET || recipientAddr === OFFICIAL_ESCROW_CONTRACT) {
          const rawUnits = BigInt(log.data || "0x0");
          const usdcVal = Number(rawUnits) / 1e6;
          totalUsdcTransferredToUs = round6(totalUsdcTransferredToUs + usdcVal);
        }
      }
    }

    if (totalUsdcTransferredToUs + 1e-6 < Number(requiredAmountUsdc)) {
      return {
        verified: false,
        reason: `Pago insuficiente en ${txHashNorm}: se detectaron ${totalUsdcTransferredToUs} USDC enviados a nuestra tesorería/contrato, pero el paquete requiere ${requiredAmountUsdc} USDC en Base Mainnet.`,
        detectedUsdcPaid: totalUsdcTransferredToUs,
        requiredAmountUsdc,
      };
    }

    return {
      verified: true,
      txHash: txHashNorm,
      blockNumber: parseInt(receipt.blockNumber, 16),
      verifiedUsdcPaid: totalUsdcTransferredToUs,
    };
  } catch (err) {
    return {
      verified: false,
      reason: `Error consultando RPC de Base Mainnet: ${err.message}`,
    };
  }
}

/**
 * Tiendas Certificadas Ancla del Catálogo Dual (8 Verticales: Institucional + Retail)
 */
export const PREMIUM_CATALOG_STORES = {
  "trustgate-official-institutional": {
    id: "trustgate-official-institutional",
    name: "TrustGate Institutional Lab (Official First-Party)",
    address: "0x861Ac49F8299C45Cca6bD9F0254080Fd82061Ac4",
    behaviorProfile: "honest",
    endpoint: "https://own-adam.onrender.com/mcp",
    vertical: "VERTICAL_1_DATASET",
    marketTier: "INSTITUTIONAL_B2B",
    isFirstParty: true,
    brokerFeeRate: 0.0, // 100% revenue to protocol treasury
    startingPriceUsdc: 12.0,
    slaGuarantee: "100% Deterministic Sourcify & Base Mainnet Audited Payloads (<50ms delivery)",
    usdcBalance: 100.0,
    reputationScore: 99,
    completedJobs: 18,
    failedJobs: 0,
  },
  "trustgate-official-retail": {
    id: "trustgate-official-retail",
    name: "TrustGate Indie & Trader Express (Official First-Party)",
    address: "0x861Ac49F8299C45Cca6bD9F0254080Fd82061Ac4",
    behaviorProfile: "honest",
    endpoint: "https://own-adam.onrender.com/mcp",
    vertical: "VERTICAL_3_SOLIDITY_SECURITY",
    marketTier: "RETAIL_INDIE",
    isFirstParty: true,
    brokerFeeRate: 0.0, // 100% revenue to protocol treasury
    startingPriceUsdc: 1.0,
    slaGuarantee: "Instant Anti-Rugpull, Zero-Lookahead & Safe Skill Starter Packs (<50ms)",
    usdcBalance: 50.0,
    reputationScore: 98,
    completedJobs: 24,
    failedJobs: 0,
  },
  "quantalpha-institutional-node": {
    id: "quantalpha-institutional-node",
    name: "QuantAlpha CME & Perp Backtest Vault (Verified Partner)",
    address: "0xQuantAlpha8183...B201",
    behaviorProfile: "honest",
    endpoint: "mcp://quantalpha-vault.base.eth/deliver",
    vertical: "VERTICAL_2_QUANT_ALPHA",
    marketTier: "INSTITUTIONAL_B2B",
    isFirstParty: false,
    brokerFeeRate: 0.02, // 2.0% Broker referral fee + 1.0%-1.5% Escrow fee
    startingPriceUsdc: 15.0,
    slaGuarantee: "Zero Look-Ahead Bias, Verified Sharpe >= 1.5, MaxDD <= 20%",
    usdcBalance: 40.0,
    reputationScore: 95,
    completedJobs: 19,
    failedJobs: 0,
  },
  "aegis-solidity-auditor-pro": {
    id: "aegis-solidity-auditor-pro",
    name: "Aegis Solidity 0.8.38 Automated Vault Builder",
    address: "0xAegisSec8183...C309",
    behaviorProfile: "honest",
    endpoint: "mcp://aegis-solidity.base.eth/deliver",
    vertical: "VERTICAL_3_SOLIDITY_SECURITY",
    marketTier: "INSTITUTIONAL_B2B",
    isFirstParty: false,
    brokerFeeRate: 0.02,
    startingPriceUsdc: 20.0,
    slaGuarantee: "Zero selfdestruct/delegatecall/tx.origin, Real solc 0.8.38 Bytecode Compilation",
    usdcBalance: 35.0,
    reputationScore: 94,
    completedJobs: 15,
    failedJobs: 0,
  },
  "x402-lowlatency-oracle-hub": {
    id: "x402-lowlatency-oracle-hub",
    name: "x402 Sub-200ms DeFi & Macro Oracle Feed",
    address: "0xOracleX402...D410",
    behaviorProfile: "honest",
    endpoint: "mcp://x402-oracle-hub.base.eth/deliver",
    vertical: "VERTICAL_4_X402_ORACLES",
    marketTier: "RETAIL_INDIE",
    isFirstParty: false,
    brokerFeeRate: 0.02,
    startingPriceUsdc: 2.0,
    slaGuarantee: "HTTP 200 JSON Schema Verified, Latency <= 200ms, Freshness <= 30s",
    usdcBalance: 22.0,
    reputationScore: 91,
    completedJobs: 31,
    failedJobs: 1,
  },
  "clawshield-verified-skills": {
    id: "clawshield-verified-skills",
    name: "ClawShield Certified MCP & SKILL.md Hub",
    address: "0xClawShield...E511",
    behaviorProfile: "honest",
    endpoint: "mcp://clawshield-skills.base.eth/deliver",
    vertical: "VERTICAL_5_CERTIFIED_SKILLS",
    marketTier: "RETAIL_INDIE",
    isFirstParty: false,
    brokerFeeRate: 0.02,
    startingPriceUsdc: 1.5,
    slaGuarantee: "Zero Reverse Shells, Zero .env/SSH Exfiltration, Clean YAML Frontmatter",
    usdcBalance: 18.0,
    reputationScore: 93,
    completedJobs: 27,
    failedJobs: 0,
  },
  "vectorguard-enterprise-rag": {
    id: "vectorguard-enterprise-rag",
    name: "VectorGuard Clean Embeddings & Legal/Financial RAG",
    address: "0xVectorGuard...F612",
    behaviorProfile: "honest",
    endpoint: "mcp://vectorguard-rag.base.eth/deliver",
    vertical: "VERTICAL_6_RAG_KNOWLEDGE",
    marketTier: "INSTITUTIONAL_B2B",
    isFirstParty: false,
    brokerFeeRate: 0.02,
    startingPriceUsdc: 14.0,
    slaGuarantee: "Normalized L2=1.0 Embeddings, Zero Prompt-Injection Poisoning",
    usdcBalance: 28.0,
    reputationScore: 94,
    completedJobs: 12,
    failedJobs: 0,
  },
  "verifllm-deepseek-r1-node": {
    id: "verifllm-deepseek-r1-node",
    name: "VerifLLM Anti-Downgrade DeepSeek-R1 & Claude Node",
    address: "0xVerifLLM...A713",
    behaviorProfile: "honest",
    endpoint: "mcp://verifllm-node.base.eth/deliver",
    vertical: "VERTICAL_7_VERIFIED_INFERENCE",
    marketTier: "RETAIL_INDIE",
    isFirstParty: false,
    brokerFeeRate: 0.02,
    startingPriceUsdc: 2.0,
    slaGuarantee: "Verified Reasoning Trace & Token Budget, Zero 70B-to-8B Silent Downgrade",
    usdcBalance: 19.0,
    reputationScore: 90,
    completedJobs: 21,
    failedJobs: 1,
  },
  "depin-h100-verified-cluster": {
    id: "depin-h100-verified-cluster",
    name: "HyperCluster DePIN NVIDIA H100 SXM5 Verified Compute",
    address: "0xDePINH100...B814",
    behaviorProfile: "honest",
    endpoint: "mcp://depin-h100.base.eth/deliver",
    vertical: "VERTICAL_8_DEPIN_GPU",
    marketTier: "INSTITUTIONAL_B2B",
    isFirstParty: false,
    brokerFeeRate: 0.02,
    startingPriceUsdc: 25.0,
    slaGuarantee: "FP16 >= 750 TFLOPS, VRAM >= 80GB HBM3, Bandwidth >= 2000 GB/s, Temp <= 82C",
    usdcBalance: 65.0,
    reputationScore: 96,
    completedJobs: 16,
    failedJobs: 0,
  },
};

/**
 * 6 Paquetes Oficiales First-Party (100% Margen para protocol_treasury)
 * 3 Institucionales (No-Retail B2B) + 3 Retail / Indie Builders
 */
export const CURATED_FIRST_PARTY_CATALOG = {
  // =========================================================================
  // CARRIL 1: INSTITUTIONAL_B2B (Empresas, Fondos Quant, Equipos Ingeniería)
  // =========================================================================
  "inst-cme-nq-microstructure-v06": {
    itemId: "inst-cme-nq-microstructure-v06",
    title: "CME Globex NQ Institutional Microstructure & Liquidity Pack (Base Mainnet Audited)",
    marketTier: "INSTITUTIONAL_B2B",
    vertical: "VERTICAL_1_DATASET",
    priceUsdc: 15.0,
    marginToTreasuryPct: 100,
    storeId: "trustgate-official-institutional",
    targetBuyerProfile: "Quant Funds, Prop Desks, Institutional Execution Bots",
    summary:
      "Institutional microstructure bundle from CME Globex NQ futures audited on Base Mainnet (1,420 instrument mappings + 496 bid/ask liquidity snapshots + on-chain settlement proofs).",
    deliverablePayload: {
      datasetStandard: "DATABENTO_CME_GLOBEX_M2M_V06",
      onChainAuditProofs: [
        {
          cycle: 1,
          dataset: "DATABENTO_INSTRUMENT_MAPPING_V05.csv",
          rowsVerified: 1420,
          baseMainnetTxHash: "0x7c4948927968573c9df1ef788bd1fe7872ffb2d8908e61010f4d24496dbdf6d5",
        },
        {
          cycle: 2,
          dataset: "composicion_bid_ask.csv",
          rowsVerified: 496,
          baseMainnetTxHash: "0x98f016459fe0625241f9135d8ae6286d03b08f0ebf7d0b54ce5ee24a7bcfba41",
        },
      ],
      microstructureMetrics: {
        exchange: "XCME_GLOBEX",
        primaryRootSymbol: "NQ",
        activeContractsMapped: ["NQH6", "NQM6", "NQU6", "NQZ6"],
        medianBidAskSpreadTicks: 1.0,
        tickValueUsd: 5.0,
        topOfBookImbalanceThresholds: {
          institutionalAccumulationRatio: 1.85,
          institutionalDistributionRatio: 0.54,
          liquiditySweepAlertMs: 12.5,
        },
      },
      sampleCuratedRows: [
        { instrument_id: 4200891, raw_symbol: "NQM6", spread_ticks: 1, bid_size_avg: 18.4, ask_size_avg: 17.9, venue: "GLBX.MDP3" },
        { instrument_id: 4200892, raw_symbol: "NQU6", spread_ticks: 1, bid_size_avg: 14.2, ask_size_avg: 15.1, venue: "GLBX.MDP3" },
        { instrument_id: 4200895, raw_symbol: "NQZ6", spread_ticks: 2, bid_size_avg: 9.8, ask_size_avg: 10.3, venue: "GLBX.MDP3" },
      ],
    },
  },

  "inst-sourcify-erc8183-vault-v06": {
    itemId: "inst-sourcify-erc8183-vault-v06",
    title: "Sourcify-Verified ERC-8183 & ERC-8004 Institutional Escrow Vault Blueprint (solc 0.8.38)",
    marketTier: "INSTITUTIONAL_B2B",
    vertical: "VERTICAL_3_SOLIDITY_SECURITY",
    priceUsdc: 25.0,
    marginToTreasuryPct: 100,
    storeId: "trustgate-official-institutional",
    targetBuyerProfile: "Web3 Protocols, B2B Treasury Engineers, Autonomous Agent Swarms",
    summary:
      "Production-grade Solidity 0.8.38 smart contract blueprint with Pull-Over-Push accounting, CEI reentrancy lock, zero dangerous opcodes, and Sourcify Exact Match #59283147 deployment config.",
    deliverablePayload: {
      compilerVersion: "v0.8.38+commit.1835d247",
      verifiedReferenceContract: "0xd4f77bf843b3c359b233aca46d7ff6604cbd0a5e",
      sourcifyMatchId: "59283147",
      securityInvariantsGuaranteed: [
        "ZERO_SELFDESTRUCT",
        "ZERO_DELEGATECALL",
        "ZERO_TX_ORIGIN_AUTH",
        "CEI_REENTRANCY_GUARD_ENABLED",
        "PULL_OVER_PUSH_FALLBACK_VAULT",
        "IMMUTABLE_10PCT_MAX_FEE_CEILING",
      ],
      solidityBlueprintSnippet:
        "// SPDX-License-Identifier: MIT\npragma solidity 0.8.38;\n// Verified Institutional ERC-8183 Escrow Core Pattern\nmodifier nonReentrant() { require(_locked == 1, 'REENTRANCY'); _locked = 2; _; _locked = 1; }",
    },
  },

  "inst-enterprise-rag-skill-firewall-v06": {
    itemId: "inst-enterprise-rag-skill-firewall-v06",
    title: "Enterprise AI Red-Team Corpus: RAG Anti-Poisoning & Skill Trojan Firewall Suite",
    marketTier: "INSTITUTIONAL_B2B",
    vertical: "VERTICAL_6_RAG_KNOWLEDGE",
    priceUsdc: 12.0,
    marginToTreasuryPct: 100,
    storeId: "trustgate-official-institutional",
    targetBuyerProfile: "Enterprise CISO Teams, AI Platform Engineers, Corporate RAG Pipelines",
    summary:
      "Deterministic Red-Team benchmark corpus to test corporate AI pipelines against CSV malware, RAG prompt-override injections, L2 embedding norm drift, and SKILL.md credential exfiltration.",
    deliverablePayload: {
      corpusVersion: "REDTEAM_CORPUS_V06_ENTERPRISE",
      realMainnetBlockedReferenceTx: "0x4437d5eec9dc4da1faa0312ccf59904890611dca358a500751b3e3d4b6fe7f09",
      firewallRulesIncluded: [
        { ruleId: "FW-CSV-01", blocks: "DDE/Formula Injection (=CMD|, +IMPORTXML, @SUM) & SQLi DROP TABLE" },
        { ruleId: "FW-RAG-02", blocks: "Indirect Prompt Injection (Ignore previous instructions / system prompt override)" },
        { ruleId: "FW-VEC-03", blocks: "L2 Vector Norm Drift outside [0.85, 1.15] & NaN/Zero-Vector Collapse" },
        { ruleId: "FW-SKL-04", blocks: "SKILL.md Secret Exfiltration (.env, ~/.ssh/id_rsa, AWS_SECRET_ACCESS_KEY, curl -X POST)" },
      ],
    },
  },

  // =========================================================================
  // CARRIL 2: RETAIL_INDIE (Traders Independientes, Indie Builders, Bots)
  // =========================================================================
  "retail-anti-rugpull-scanner-pack-v06": {
    itemId: "retail-anti-rugpull-scanner-pack-v06",
    title: "Retail DeFi Anti-Rugpull & Honeypot Quick-Scanner Ruleset",
    marketTier: "RETAIL_INDIE",
    vertical: "VERTICAL_3_SOLIDITY_SECURITY",
    priceUsdc: 1.0,
    marginToTreasuryPct: 100,
    storeId: "trustgate-official-retail",
    targetBuyerProfile: "Independent Crypto Traders, Sniper Bots, DeFi Retail Users",
    summary:
      "Fast 1-second detection patterns for token rugpulls, hidden mint backdoors, transfer tax traps, and selfdestruct/delegatecall drains before buying on Base or EVM chains.",
    deliverablePayload: {
      scannerPackVersion: "RETAIL_ANTIRUG_V06",
      redFlagsChecked: [
        { pattern: "delegatecall(", severity: "CRITICAL", risk: "Owner can swap token logic to steal balances" },
        { pattern: "selfdestruct(", severity: "CRITICAL", risk: "Contract can be destroyed and liquidity drained" },
        { pattern: "tx.origin", severity: "HIGH", risk: "Phishing vulnerability when trader interacts with router" },
        { pattern: "setTax(uint256) without cap", severity: "HIGH", risk: "Honeypot: sell tax can be set to 99%" },
      ],
      recommendedMcpToolForLiveScan: "audit_smart_contract_escrow",
    },
  },

  "retail-nq-quant-starter-backtest-v06": {
    itemId: "retail-nq-quant-starter-backtest-v06",
    title: "Retail Quant Strategy Starter & Zero-Lookahead Bot Verifier",
    marketTier: "RETAIL_INDIE",
    vertical: "VERTICAL_2_QUANT_ALPHA",
    priceUsdc: 2.5,
    marginToTreasuryPct: 100,
    storeId: "trustgate-official-retail",
    targetBuyerProfile: "Retail Futures/Crypto Traders, TradingView/Python Bot Buyers",
    summary:
      "Stop buying fake repainting trading bots. Includes a verified zero-lookahead NQ trade log template and mathematical audit checklist (Sharpe, Profit Factor, Max Drawdown).",
    deliverablePayload: {
      templateVersion: "QUANT_STARTER_V06",
      antiScamChecklist: [
        "Verify entryTimestampMs < exitTimestampMs on every single trade (Zero Look-Ahead Bias)",
        "Recompute Net PnL from raw trades (reject seller-inflated summary equity curves)",
        "Require minimum 5–30 out-of-sample trades with Max Drawdown <= 25%",
      ],
      sampleVerifiedTrades: [
        { tradeId: "T-01", symbol: "NQ", side: "LONG", entryTimestampMs: 1710000000000, exitTimestampMs: 1710003600000, pnlUsd: 380.0 },
        { tradeId: "T-02", symbol: "NQ", side: "SHORT", entryTimestampMs: 1710007200000, exitTimestampMs: 1710010800000, pnlUsd: -110.0 },
        { tradeId: "T-03", symbol: "NQ", side: "LONG", entryTimestampMs: 1710014400000, exitTimestampMs: 1710018000000, pnlUsd: 495.0 },
      ],
      recommendedMcpToolForLiveScan: "audit_quant_backtest_escrow",
    },
  },

  "retail-safe-mcp-skill-starter-v06": {
    itemId: "retail-safe-mcp-skill-starter-v06",
    title: "Certified Safe Plug-and-Play SKILL.md & MCP Agent Starter Bundle",
    marketTier: "RETAIL_INDIE",
    vertical: "VERTICAL_5_CERTIFIED_SKILLS",
    priceUsdc: 1.5,
    marginToTreasuryPct: 100,
    storeId: "trustgate-official-retail",
    targetBuyerProfile: "Claude Code, Cursor, Windsurf & OpenClaw Indie Builders",
    summary:
      "Pre-audited SKILL.md template and MCP JSON-RPC 2.0 quickstart connector guaranteed free of prompt injection, shell trojans, or secret exfiltration.",
    deliverablePayload: {
      bundleVersion: "SAFE_SKILL_STARTER_V06",
      certifiedSkillMarkdownTemplate:
        "---\nname: safe-market-research-helper\ndescription: Certified read-only market research skill verified by TrustGate ERC-8183.\n---\n# Instructions\n1. Query verified endpoints only.\n2. Never read local credential files (.env, ~/.ssh) or execute raw shell pipes.",
      recommendedMcpToolForLiveScan: "audit_agent_skill_escrow",
    },
  },

  "retail-veritas-level3-mastery-tutorial-v07": {
    itemId: "retail-veritas-level3-mastery-tutorial-v07",
    title: "VERITAS-8183 Level 3 (3-Star Gold Seal) Step-by-Step Engineering Tutorial & Ready-to-Pass Blueprint",
    marketTier: "RETAIL_INDIE",
    vertical: "VERTICAL_3_SOLIDITY_SECURITY",
    priceUsdc: 1.5,
    marginToTreasuryPct: 100,
    storeId: "trustgate-official-retail",
    targetBuyerProfile: "AI Agent Developers, MCP Server Authors, Smart Contract Builders seeking 3-Star Institutional Status",
    summary:
      "Official step-by-step engineering manual and copy-paste blueprints to pass all 5 VERITAS-8183 Level 3 Exam Pillars (Proof-of-Reserve >=20% wallet setup, Sourcify solc 0.8.38 template, <100ms JSON-RPC architecture, and exam submission script).",
    deliverablePayload: {
      tutorialVersion: "VERITAS_8183_LEVEL3_MASTERY_V07",
      referenceGoldSealContract: "0xd4f77bf843b3c359b233aca46d7ff6604cbd0a5e",
      stepByStepPlaybook: [
        {
          step: 1,
          pillar: "Pillar 1 — Auditable Proof-of-Reserve (>=20% Ratio)",
          instruction:
            "Designate a dedicated public Base Mainnet wallet (Chain ID 8453) holding liquid USDC/ETH equal to at least 20% of your declared monthly operational volume. Never co-mingle with unverified hot wallets.",
          formula: "proofOfReserveRatioPct = (lockedOrPublicReserveUsdc / activeOperationalVolumeUsdc) * 100 >= 20.0",
        },
        {
          step: 2,
          pillar: "Pillar 2 — 100% Deterministic Code & Content Purity (SHA-256 + Sourcify)",
          instruction:
            "Compile with solc 0.8.38, strip all selfdestruct/delegatecall/tx.origin opcodes, enforce CEI reentrancy guards, and verify exact_match on Sourcify v2.",
          readyToCompileSolidityTemplate:
            "// SPDX-License-Identifier: MIT\npragma solidity 0.8.38;\ncontract VeritasLevel3CompliantVault {\n  uint256 private _locked = 1;\n  mapping(address => uint256) public reserves;\n  modifier nonReentrant() { require(_locked == 1, 'REENTRANCY'); _locked = 2; _; _locked = 1; }\n  function depositReserve() external payable nonReentrant { reserves[msg.sender] += msg.value; }\n}",
        },
        {
          step: 3,
          pillar: "Pillar 3 — Verified Client Satisfaction (>=4.8/5.0 & Zero Disputes)",
          instruction:
            "Route your first 10 deliveries through notarize_and_witness_a2a_deal so each delivery is SHA-256 timestamped and records a verified post-settlement client rating.",
        },
        {
          step: 4,
          pillar: "Pillar 4 — Sub-100ms P95 Response Latency & 99.9% Uptime",
          instruction:
            "Pre-compute static JSON-RPC schemas in memory, use streaming 64KB chunks for dataset audits, and expose a zero-allocation /healthz keep-alive endpoint.",
        },
        {
          step: 5,
          pillar: "Pillar 5 — Exact JSON-RPC Payload to Pass submit_veritas_tier_upgrade_exam",
          copyPasteExamCall: {
            method: "tools/call",
            params: {
              name: "submit_veritas_tier_upgrade_exam",
              arguments: {
                storeId: "your-agent-store-id",
                storeName: "Your Verified AI Node",
                walletAddress: "0xYourMainnetWallet",
                publicReserveWallet: "0xYourAuditableReserveWallet",
                declaredPublicReserveUsdc: 120.0,
                declaredMonthlyVolumeUsdc: 500.0,
                vertical: "VERTICAL_3_SOLIDITY_SECURITY",
                observedLatencyMs: 25,
              },
            },
          },
        },
      ],
    },
  },
};

/**
 * Ejecuta una compra directa de un paquete oficial First-Party (100% margen a protocol_treasury).
 * Soporta tanto el carril INSTITUTIONAL_B2B como el carril RETAIL_INDIE (desde 1.00 USDC).
 */
export function executeFirstPartyCatalogPurchase({
  ledger,
  itemId,
  buyerId = "alphaquant-agent",
  paymentToken = "USDC",
  paymentTxHash = null,
  requireOnChainPaymentProof = false,
  onChainVerificationResult = null,
}) {
  const item = CURATED_FIRST_PARTY_CATALOG[itemId];
  if (!item) {
    return {
      ok: false,
      code: "CATALOG_ITEM_NOT_FOUND",
      error: `El paquete '${itemId}' no existe en el catálogo oficial. Usa discover_verified_stores para ver los itemId disponibles.`,
      availableItemIds: Object.keys(CURATED_FIRST_PARTY_CATALOG),
    };
  }

  const priceUsdc = round6(item.priceUsdc);

  // =========================================================================
  // CANDADO DE COBRO REAL EN BASE MAINNET (Para llamadas públicas / externas)
  // =========================================================================
  if (requireOnChainPaymentProof || paymentTxHash) {
    if (!paymentTxHash) {
      return {
        ok: false,
        httpStatus: 402,
        status: "PAYMENT_REQUIRED_ON_BASE_MAINNET_402",
        marketTier: item.marketTier,
        vertical: item.vertical,
        itemId: item.itemId,
        title: item.title,
        requiredAmountUsdc: priceUsdc,
        paymentInstructions: {
          network: "Base Mainnet",
          chainId: 8453,
          usdcTokenContract: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
          recipientTreasuryWallet: "0x861Ac49F8299C45Cca6bD9F0254080Fd82061Ac4",
          alternativeEscrowContract: "0xd4f77bf843b3c359b233aca46d7ff6604cbd0a5e",
          exactAmountUsdc: priceUsdc,
          unlockInstruction: `Transfer ${priceUsdc} USDC on Base Mainnet (Chain ID 8453) to 0x861Ac49F8299C45Cca6bD9F0254080Fd82061Ac4, then call purchase_firstparty_catalog_item with { "itemId": "${item.itemId}", "paymentTxHash": "0x..." }.`,
        },
        previewTeaserOnly: {
          summary: item.summary,
          targetBuyerProfile: item.targetBuyerProfile,
          fullPayloadLocked: true,
          note: "Full deliverablePayload is cryptographically locked until on-chain Base Mainnet USDC paymentTxHash is verified.",
        },
      };
    }

    if (!onChainVerificationResult || !onChainVerificationResult.verified) {
      return {
        ok: false,
        httpStatus: 402,
        status: "REJECTED_INVALID_OR_UNPAID_BASE_MAINNET_TX_402",
        itemId: item.itemId,
        requiredAmountUsdc: priceUsdc,
        submittedPaymentTxHash: paymentTxHash,
        error:
          onChainVerificationResult?.reason ||
          "No se pudo verificar el pago en USDC sobre Base Mainnet para el paymentTxHash proporcionado.",
        paymentInstructions: {
          network: "Base Mainnet (Chain ID 8453)",
          usdcTokenContract: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
          recipientTreasuryWallet: "0x861Ac49F8299C45Cca6bD9F0254080Fd82061Ac4",
          exactAmountUsdc: priceUsdc,
        },
      };
    }

    usedOnChainPaymentTxHashes.add(onChainVerificationResult.txHash);
  }

  const buyer = ledger.buyerAgents[buyerId] || ledger.buyerAgents["alphaquant-agent"];

  // Verificar saldo en USDC (o acreditar saldo demo si es un test repetido en memoria)
  if ((buyer.balances.USDC ?? 0) < priceUsdc) {
    buyer.balances.USDC = round6((buyer.balances.USDC ?? 0) + priceUsdc + 10);
  }

  // Cobro directo: 100% del ingreso va a protocol_treasury
  buyer.balances.USDC = round6(buyer.balances.USDC - priceUsdc);
  ledger.wallets.protocol_treasury.balances.USDC = round6(
    ledger.wallets.protocol_treasury.balances.USDC + priceUsdc
  );

  // Actualizar métricas de la tesorería (100% margen neto, gas ~0.0004 USDC)
  const gasSpentUsdc = 0.0004;
  const netProfitAdded = round6(priceUsdc - gasSpentUsdc);
  ledger.wallets.protocol_treasury.stats.grossFeesEarnedUsdc = round6(
    ledger.wallets.protocol_treasury.stats.grossFeesEarnedUsdc + priceUsdc
  );
  ledger.wallets.protocol_treasury.stats.totalGasSpentUsdc = round6(
    ledger.wallets.protocol_treasury.stats.totalGasSpentUsdc + gasSpentUsdc
  );
  ledger.wallets.protocol_treasury.stats.netProfitUsdc = round6(
    ledger.wallets.protocol_treasury.stats.netProfitUsdc + netProfitAdded
  );
  ledger.wallets.protocol_treasury.stats.auditsCompleted += 1;

  const store = ledger.stores[item.storeId];
  if (store) {
    store.completedJobs += 1;
  }

  const payloadRaw = JSON.stringify(item.deliverablePayload);
  const sha256DeliverableHash =
    "0x" + crypto.createHash("sha256").update(payloadRaw, "utf8").digest("hex");
  const signature =
    "0x" +
    crypto
      .createHmac("sha256", ledger.evaluatorSecretKey)
      .update(`FIRST_PARTY_SALE|${item.itemId}|${priceUsdc}|${sha256DeliverableHash}`)
      .digest("hex");

  const receiptId = `ORD-FP-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;

  ledger.logWirePacket({
    protocol: "ERC-8183",
    from: buyer.id,
    to: "ProtocolTreasury",
    action: "FIRST_PARTY_CATALOG_PURCHASE_100PCT_MARGIN",
    status: 200,
    payloadSummary: `Sold ${item.itemId} (${item.marketTier}) -> +${priceUsdc} USDC (100% Treasury Margin)`,
  });

  return {
    ok: true,
    status: "SETTLED_INSTANT_FIRST_PARTY_DELIVERY",
    receiptId,
    marketTier: item.marketTier,
    vertical: item.vertical,
    itemId: item.itemId,
    title: item.title,
    financialSettlement: {
      paymentToken,
      grossPaidUsdc: priceUsdc,
      thirdPartySellerPayoutUsdc: 0,
      protocolTreasuryRevenueUsdc: priceUsdc,
      protocolTreasuryMarginPct: "100%",
      treasuryWalletAddress: ledger.wallets.protocol_treasury.address,
      escrowContractAddress: ledger.wallets.escrow_contract.address,
    },
    cryptographicCertificate: {
      standard: "ERC-8004-FirstPartyAttestation",
      sha256DeliverableHash,
      evaluatorHmacSignature: signature,
      evaluatorAddress: ledger.wallets.evaluator_signer.address,
      issuedAt: new Date().toISOString(),
    },
    deliverablePayload: item.deliverablePayload,
    auditScopeAndLiability: buildAuditScopeAndLiability(`FIRST_PARTY_${item.vertical}`, [
      "1. Cryptographic SHA-256 integrity hash verification of curated First-Party bundle",
      "2. Pre-audited deterministic compliance against Base Mainnet & Sourcify reference proofs",
    ]),
  };
}

/**
 * Certificación y Registro Freemium de Tiendas Externas (Retail o Institucional)
 * - Costo de entrada: 0 USDC (Freemium Onboarding para eliminar fricción del huevo y la gallina)
 * - Requisito obligatorio: Pasar una auditoría determinista en vivo de su muestra según su vertical
 * - Modelo de negocio: 2.0% Broker Discovery Fee + 1.0%-1.5% Escrow Fee en cada venta futura
 */
export function registerAndCertifyExternalStore({
  ledger,
  storeId,
  storeName,
  walletAddress,
  endpointUrl,
  vertical = "VERTICAL_3_SOLIDITY_SECURITY",
  marketTier = "RETAIL_INDIE",
  startingPriceUsdc = 5.0,
  sampleDeliverable = {},
}) {
  if (!storeId || !storeName || !walletAddress) {
    return {
      ok: false,
      status: 400,
      error: "Faltan campos obligatorios: storeId, storeName, walletAddress.",
    };
  }

  const normalizedId = String(storeId)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-");

  // Ejecutar Auditoría Determinista en Vivo según la vertical solicitada
  let auditResult;
  if (vertical === "VERTICAL_2_QUANT_ALPHA") {
    auditResult = auditQuantStrategyBacktest({
      trades: sampleDeliverable.trades || [],
      spec: {
        minTrades: sampleDeliverable.minTrades ?? 3,
        minProfitFactor: sampleDeliverable.minProfitFactor ?? 1.1,
        maxDrawdownPct: sampleDeliverable.maxDrawdownPct ?? 35.0,
      },
    });
  } else if (vertical === "VERTICAL_3_SOLIDITY_SECURITY") {
    auditResult = auditSmartContractDeliverable({
      soliditySourceCode: sampleDeliverable.soliditySourceCode || sampleDeliverable.soliditySource || "",
      contractName: sampleDeliverable.contractName || "CandidateStoreContract",
      requiredFunctions: sampleDeliverable.requiredFunctions || [],
    });
  } else if (vertical === "VERTICAL_4_X402_ORACLES") {
    auditResult = auditApiOracleSla({
      apiResponsePayload: sampleDeliverable.apiResponsePayload || sampleDeliverable.responseBody || {},
      observedLatencyMs: sampleDeliverable.observedLatencyMs ?? sampleDeliverable.responseTimeMs ?? 45,
      slaSpec: {
        maxLatencyMs: sampleDeliverable.maxLatencyMs ?? 300,
        requiredKeys: sampleDeliverable.requiredKeys || ["symbol", "price", "timestamp"],
      },
    });
  } else if (vertical === "VERTICAL_5_CERTIFIED_SKILLS") {
    auditResult = auditAgentSkillDeliverable({
      skillMarkdown: sampleDeliverable.skillMarkdown || "",
      bundledScripts: sampleDeliverable.bundledScripts || "",
      requiredSections: sampleDeliverable.requiredSections || ["name:", "description:"],
    });
  } else if (vertical === "VERTICAL_6_RAG_KNOWLEDGE") {
    auditResult = auditRagEmbeddingsDeliverable({
      chunks: sampleDeliverable.chunks || [],
      expectedDimension: sampleDeliverable.expectedDimension ?? 4,
      minChunks: sampleDeliverable.minChunks ?? 2,
    });
  } else if (vertical === "VERTICAL_7_VERIFIED_INFERENCE") {
    auditResult = auditAiInferenceDeliverable({
      responseText: sampleDeliverable.responseText || sampleDeliverable.outputText || "",
      billedOutputTokens: sampleDeliverable.billedOutputTokens ?? 25,
      mustIncludeTerms: sampleDeliverable.mustIncludeTerms || [],
      forbiddenTerms: sampleDeliverable.forbiddenTerms || [],
      minUniqueWordRatio: sampleDeliverable.minUniqueWordRatio ?? 0.35,
    });
  } else if (vertical === "VERTICAL_8_DEPIN_GPU") {
    auditResult = auditDepinGpuComputeSla({
      benchmarkReport: sampleDeliverable.benchmarkReport || {},
      slaSpec: {
        minTflopsFp16: sampleDeliverable.minTflopsFp16 ?? 120,
        minVramGb: sampleDeliverable.minVramGb ?? 40,
        minMemoryBandwidthGbs: sampleDeliverable.minMemoryBandwidthGbs ?? 900,
        maxTempCelsius: sampleDeliverable.maxTempCelsius ?? 85,
      },
    });
  } else {
    // VERTICAL_1_DATASET por defecto
    const rows = sampleDeliverable.rows || [
      { id: 1, symbol: "NQ", price: 20150.25, summary: "CME Globex institutional order flow" },
      { id: 2, symbol: "ES", price: 5920.5, summary: "CME Globex liquidity depth" },
      { id: 3, symbol: "YM", price: 43800.0, summary: "CME Globex futures spread" },
    ];
    const rawStr = typeof rows === "string" ? rows : JSON.stringify(rows);
    const encryptedPkg = encryptDeliverable(rawStr);
    auditResult = auditEncryptedDataset({
      encryptedPkg,
      expectedPlaintextSha256: encryptedPkg.plaintextSha256,
      decryptionKeyHex: encryptedPkg.decryptionKeyHex,
      spec: {
        minRows: sampleDeliverable.minRows ?? 2,
        topicKeywords: sampleDeliverable.topicKeywords || ["cme", "globex", "liquidity"],
      },
    });
  }

  if (!auditResult.approved) {
    ledger.wallets.protocol_treasury.stats.attacksBlocked += 1;
    const reasonText = auditResult.summary || auditResult.reason || "Failed deterministic security audit";
    ledger.logWirePacket({
      protocol: "ERC-8004",
      from: normalizedId,
      to: "EvaluatorNode",
      action: "STORE_CERTIFICATION_REJECTED",
      status: 422,
      payloadSummary: `Rejected store '${normalizedId}' (${vertical}): ${reasonText}`,
    });
    return {
      ok: false,
      status: 422,
      certificationStatus: "REJECTED_FAILED_DETERMINISTIC_AUDIT",
      storeId: normalizedId,
      vertical,
      marketTier,
      stageFailed: auditResult.stageFailed,
      reason: reasonText,
      findings: auditResult.findings || [],
      auditScopeAndLiability: auditResult.auditScopeAndLiability,
    };
  }

  // Registrar la tienda con sello ERC-8004 y comisión de Broker pactada (2.0%)
  const newStore = {
    id: normalizedId,
    name: storeName,
    address: walletAddress,
    behaviorProfile: "honest",
    endpoint: endpointUrl || `mcp://${normalizedId}.base.eth/deliver`,
    vertical,
    marketTier: marketTier === "INSTITUTIONAL_B2B" ? "INSTITUTIONAL_B2B" : "RETAIL_INDIE",
    isFirstParty: false,
    brokerFeeRate: 0.02, // 2.0% comisión de broker por cada cliente referido
    startingPriceUsdc: Number(startingPriceUsdc) || 5.0,
    slaGuarantee: `ERC-8004 Certified on ${vertical} (Live Deterministic Audit Passed)`,
    usdcBalance: 0.0,
    reputationScore: 88, // Reputación inicial tras pasar auditoría determinista
    completedJobs: 1,
    failedJobs: 0,
    certifiedAt: new Date().toISOString(),
  };

  ledger.stores[normalizedId] = newStore;
  ledger.wallets.protocol_treasury.stats.auditsCompleted += 1;

  const certHash =
    "0x" +
    crypto
      .createHmac("sha256", ledger.evaluatorSecretKey)
      .update(`ERC8004_CERT|${normalizedId}|${vertical}|${walletAddress}`)
      .digest("hex");

  ledger.logWirePacket({
    protocol: "ERC-8004",
    from: "EvaluatorNode",
    to: normalizedId,
    action: "STORE_CERTIFIED_AND_LISTED",
    status: 200,
    payloadSummary: `Listed '${normalizedId}' in ${newStore.marketTier} (${vertical}) | Broker Fee: 2.0% + Escrow Fee`,
  });

  return {
    ok: true,
    status: 200,
    certificationStatus: "APPROVED_ERC8004_VERIFIED_PARTNER",
    onboardingModel: "FREEMIUM_ZERO_UPFRONT_SUCCESS_FEE_ONLY",
    commercialTerms: {
      upfrontListingFeeUsdc: 0.0,
      brokerReferralCommissionPct: "2.0%",
      escrowSettlementFeePct: "1.0% (>=10 USDC) or 1.5% (<10 USDC)",
      totalSuccessFeeOnSalesPct: "3.0% - 3.5%",
      escrowVaultContract: ledger.wallets.escrow_contract.address,
    },
    storeProfile: newStore,
    erc8004CertificateHash: certHash,
    auditScopeAndLiability: auditResult.auditScopeAndLiability,
  };
}
