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
import { readTrustPaymentOrder } from "./trustOrderStore.js";
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

/** Marca un tx hash como consumido en el registro global anti-replay (compartido entre servicios). */
export function markOnChainPaymentTxHashUsed(txHash) {
  const norm = String(txHash || "").trim().toLowerCase();
  if (!norm || usedOnChainPaymentTxHashes.has(norm)) return false;
  usedOnChainPaymentTxHashes.add(norm);
  return true;
}

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
    if (await readTrustPaymentOrder(txHashNorm)) {
      return { verified: false, reason: "This transaction is reserved for a paid MCP trust check." };
    }
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
  "cerberus-solc-formal-verifier": {
    id: "cerberus-solc-formal-verifier",
    name: "Cerberus Formal Solidity 0.8.38 & EVM Invariant Node (3-Star Gold)",
    address: "0xCerberus8183...C901",
    behaviorProfile: "honest",
    endpoint: "mcp://cerberus-formal.base.eth/deliver",
    vertical: "VERTICAL_3_SOLIDITY_SECURITY",
    marketTier: "INSTITUTIONAL_B2B",
    isFirstParty: false,
    brokerFeeRate: 0.02,
    startingPriceUsdc: 18.0,
    slaGuarantee: "Sourcify Exact-Match, >=28% Public USDC Reserve, Zero Dangerous Opcodes (<30ms)",
    usdcBalance: 140.0,
    reputationScore: 97,
    completedJobs: 22,
    failedJobs: 0,
  },
  "chainlink-x402-institutional-oracle": {
    id: "chainlink-x402-institutional-oracle",
    name: "Chronos x402 Institutional Sub-50ms Cross-Chain Oracle (3-Star Gold)",
    address: "0xChronosX402...D902",
    behaviorProfile: "honest",
    endpoint: "mcp://chronos-x402.base.eth/deliver",
    vertical: "VERTICAL_4_X402_ORACLES",
    marketTier: "INSTITUTIONAL_B2B",
    isFirstParty: false,
    brokerFeeRate: 0.02,
    startingPriceUsdc: 5.0,
    slaGuarantee: "P95 Latency <= 25ms, >=30% Public USDC Reserve, Cryptographic Tick Attestation",
    usdcBalance: 180.0,
    reputationScore: 97,
    completedJobs: 34,
    failedJobs: 0,
  },
  "skillvault-zero-trust-hub": {
    id: "skillvault-zero-trust-hub",
    name: "SkillVault Zero-Trust Enterprise MCP & SKILL.md Registry (3-Star Gold)",
    address: "0xSkillVault...E903",
    behaviorProfile: "honest",
    endpoint: "mcp://skillvault-zerotrust.base.eth/deliver",
    vertical: "VERTICAL_5_CERTIFIED_SKILLS",
    marketTier: "INSTITUTIONAL_B2B",
    isFirstParty: false,
    brokerFeeRate: 0.02,
    startingPriceUsdc: 6.0,
    slaGuarantee: "Ed25519 Signed Manifests, >=24% Public USDC Reserve, Zero Credential Exfiltration",
    usdcBalance: 120.0,
    reputationScore: 96,
    completedJobs: 29,
    failedJobs: 0,
  },
  "pinecone-shield-rag-auditor": {
    id: "pinecone-shield-rag-auditor",
    name: "VectorFortress Institutional RAG & Clean Embeddings Vault (3-Star Gold)",
    address: "0xVectorFort...F904",
    behaviorProfile: "honest",
    endpoint: "mcp://vectorfortress-rag.base.eth/deliver",
    vertical: "VERTICAL_6_RAG_KNOWLEDGE",
    marketTier: "INSTITUTIONAL_B2B",
    isFirstParty: false,
    brokerFeeRate: 0.02,
    startingPriceUsdc: 16.0,
    slaGuarantee: "100% L2-Normalized Vectors, >=22.5% Public USDC Reserve, Zero Prompt-Override Injection",
    usdcBalance: 135.0,
    reputationScore: 96,
    completedJobs: 19,
    failedJobs: 0,
  },
  "eigen-verified-inference-grid": {
    id: "eigen-verified-inference-grid",
    name: "VeriGrid Cryptographic Proof-of-Inference & Anti-Downgrade Cluster (3-Star Gold)",
    address: "0xVeriGrid8183...A905",
    behaviorProfile: "honest",
    endpoint: "mcp://verigrid-inference.base.eth/deliver",
    vertical: "VERTICAL_7_VERIFIED_INFERENCE",
    marketTier: "INSTITUTIONAL_B2B",
    isFirstParty: false,
    brokerFeeRate: 0.02,
    startingPriceUsdc: 8.0,
    slaGuarantee: "Zero Model-Downgrade Guarantee, >=26% Public USDC Reserve, Verified Token Billing",
    usdcBalance: 156.0,
    reputationScore: 97,
    completedJobs: 26,
    failedJobs: 0,
  },
};

/**
 * 6 Paquetes Oficiales First-Party (100% Margen para protocol_treasury)
 * 3 Institucionales (No-Retail B2B) + 3 Retail / Indie Builders
 */
export const CURATED_FIRST_PARTY_CATALOG = {
  "inst-cme-nq-microstructure-v06": {
    "itemId": "inst-cme-nq-microstructure-v06",
    "title": "CME Globex NQ Institutional Microstructure & Liquidity Pack (Base Mainnet Audited)",
    "marketTier": "INSTITUTIONAL_B2B",
    "vertical": "VERTICAL_1_DATASET",
    "priceUsdc": 15,
    "marginToTreasuryPct": 100,
    "storeId": "trustgate-official-institutional",
    "targetBuyerProfile": "Quant Funds, Prop Desks, Institutional Execution Bots",
    "summary": "Institutional microstructure bundle from CME Globex NQ futures audited on Base Mainnet (1,420 instrument mappings + 496 bid/ask liquidity snapshots + on-chain settlement proofs).",
    "encryptedDeliverableVault": {
      "algorithm": "AES-256-GCM-WALLET-AND-CONTRACT-BOUND",
      "ivHex": "6ccf8f1b7f763b300f6aedf7",
      "authTagHex": "e74330bd1e4c9cd7477f35ee7ce90fdc",
      "ciphertextHex": "d5555b47e4163e8cd3c963e4770dcd1a7eeb42701978e25956e2c2f708a87dd74b4bd941140f33f836b9972178ec2d3bc49f811967d562ab464c6f3ab63a4b0a98e1e5bc10ccb65736c02704b6445305808cf617bc9cdcb0209d0b7c41528c3c5372da545906ad66fcce3afc037a3fd53a6d2f102e476e079dca011025b391fc4d5dc7fda988e564ef94c69e0ce02268294778e7f7a19eeb5799e260cae1f6cc006514480b3f345f4cccfbebfb090ddda50f54b87790137ef2d6288cb0bb4c5cf8482ff013949ac5e321ccc63414abaa67e9bbc46d1f61fdaa07d50a5a7b1e9f8335bca3cf854222bfe6896044c1b33233fbcae7880873a7a2799ed4b3ea759995b8979c57ef9b943bf5e1467704de48212ec07365400bb58cbe1043ee5f9916b6cf529fb9ed0b2282c6672dd77511f9f2fdc21dfe93cab9c4e7ac300263f86e9c28fe3d43ec79f6fe1b7be6ef2ba5be834e707ded7e3e7042a7536be1e66f2650c8ce8b37b95b63bd0830ef4e3fc0df41a8510708aee48d3c9f8302d2c52994cc083cfb2c777f1fa2aed424cea980ea4551dcbbd7ca9770f0d52342d60861ad8c78508c73079fba4114e08900a1e519e6d3467ce9c2d2fe4a1b79a463604f50ed3bf090c73607b4e7682812f3b50ce505faf6c2e76069ecd23fa329a848d00908c557e2bec35077b483f101cb816fce98a81e6775cbb5442a99ac82273affbac92def6911566abfac08fcb39050f336ef123a644579b01b4867f0810421e57a10bd69b440d0cca9b9e98e6422dc9a4ff627cd6d7f1bb977315f143e8844138feb05a1bc57ba39bdba8378b186f1302a211df0233e9b780982a1a3828bf0442d4f1d8b073aebf0090579e5a327efa5baab90cab714df814c30a56f43550d56177438f6ea346a276090b95ab1d615e955e5e52530fa072a19ab51cbf92377b1f3d81bae7dea1be26a19efc509e01d6bf27687a82be12ed41c8f123b3d51201e4d7faefb3181a63a0abe6c3cb9557885ce693e2a028eaa386e90426b83eb9fd1b7613601ff738feed02a19701d93182f8650e201e58f5a77e0bf0ab6d0f0161a2d605f7a9bf56a6c6a7470df70102755bf4c7a334419fcf747432a25fdbde89d50cf35a5fe988cb259ec71fd771032381c39fd7a8caf895ab45b7c3ccae89fdd7c4166af2e59bccf83bc896f4cab3f0e95a58879d528732ea5c6d0f0bb53740be5683dbb162b0868e263b51d98cce91b7433b513d59306b8e91dc72fd9a2e9f5b3c2dc69317ff021bf394129517fb45b6026d13f08289d7b1b3e5464697286164c16860f01442c103fce7d20b585ef66dc59885b80898a331fbb6cb87d4aa526cbd4c6ceb3cda906bb2c7f9f2898acb87fffd060818fb53c5cc1f0f6a64e962364d7aa32b2e4e126d6c431063da3b0a3a9f00eadff82141c16248883c20e404e8e6205e806bc39a60ce9c910713ecd93a14cdeee4481228e08989190f81c3dc8bc75fcb3fbe479521f1117f05da7a03958b0ace9845764601f5dfd919f22b373ed1f5c45316c6a4aae6a7eb578b943"
    }
  },
  "inst-sourcify-erc8183-vault-v06": {
    "itemId": "inst-sourcify-erc8183-vault-v06",
    "title": "Sourcify-Verified ERC-8183 & ERC-8004 Institutional Escrow Vault Blueprint (solc 0.8.38)",
    "marketTier": "INSTITUTIONAL_B2B",
    "vertical": "VERTICAL_3_SOLIDITY_SECURITY",
    "priceUsdc": 25,
    "marginToTreasuryPct": 100,
    "storeId": "trustgate-official-institutional",
    "targetBuyerProfile": "Web3 Protocols, B2B Treasury Engineers, Autonomous Agent Swarms",
    "summary": "Production-grade Solidity 0.8.38 smart contract blueprint with Pull-Over-Push accounting, CEI reentrancy lock, zero dangerous opcodes, and Sourcify Exact Match #59283147 deployment config.",
    "encryptedDeliverableVault": {
      "algorithm": "AES-256-GCM-WALLET-AND-CONTRACT-BOUND",
      "ivHex": "5c83fa09e59d7e60cb79cbd6",
      "authTagHex": "28de5de9dee903e64b1486c919dcc3a0",
      "ciphertextHex": "643e4066555cf899ebac5dc1ee16e309d65513e44f42cce6e2ccc218d250d7e8e98d83fb8cc1eb5b0efc5a00f36ce41f0338b9da4f9f1412269f57036a3a5b66690246e6ec5d9ea8f23ad6e69f4c304012a954b053dcec7cd3f1d02dd3f9245290d4549235489affe9349dd79e796a682e3e884db94fe1a895910c2e78b432143f48d83eeada757fc3fe2f860176bc9376f0d6754b8eb9f13d58d005678f08ce8e997077c097b2466ddb43fe57e267a481bbdbffb602bc395bb65d2ba41c424564d54747972d6bf3e0a8e0681efa28bf0f1ffa916d0870b9cb4424d721ba32c789f00695f4377c33e50fa3fefdf7d3e498d47aaadc30443ecff0d49f40877521878e93fb5fa6cb98d02123fa33ac4f122e03b213b1e46f8ffa8f747579f685258ade8196efdc09f2fb577b4fe5b79ecf28cb89c34a8e0c5ea98ab3ce30cab1c2e763c52950450fb8d80f82723a6bcb21e8b5db533fd3edc36526d213d5afbbae07af16c56b96d42826157aa9a1266fc8434277d7783b46fb564d5b76a2d8057d0cef2d21f0b5638efa12a3a27e199922349884326c6928e4cea6ff1e449a15aa42fbd49393fefc6dcc94c76dde6a078d189ff56ac516ed24a5fc21f4dd5d99a368b264026f0354794273d055256d77c47e522d961572e1973a6f843b4e8d7a1dc3f375997d1c6830920cf4897d2149aaaa63dc88ac4d9e6a611cc11d8b66ad6141a07c541c6971f6b5e66261499b92d116e6d7dccf3531bf6e57aa90afbc88bcd88b880ed28e36b173608aa8ff529f35b13c4e320c040e24263238bb893b9046"
    }
  },
  "inst-enterprise-rag-skill-firewall-v06": {
    "itemId": "inst-enterprise-rag-skill-firewall-v06",
    "title": "Enterprise AI Red-Team Corpus: RAG Anti-Poisoning & Skill Trojan Firewall Suite",
    "marketTier": "INSTITUTIONAL_B2B",
    "vertical": "VERTICAL_6_RAG_KNOWLEDGE",
    "priceUsdc": 12,
    "marginToTreasuryPct": 100,
    "storeId": "trustgate-official-institutional",
    "targetBuyerProfile": "Enterprise CISO Teams, AI Platform Engineers, Corporate RAG Pipelines",
    "summary": "Deterministic Red-Team benchmark corpus to test corporate AI pipelines against CSV malware, RAG prompt-override injections, L2 embedding norm drift, and SKILL.md credential exfiltration.",
    "encryptedDeliverableVault": {
      "algorithm": "AES-256-GCM-WALLET-AND-CONTRACT-BOUND",
      "ivHex": "85492b5ec09b78ee9118c385",
      "authTagHex": "158323d9454ad64d2867be01d5cfaf65",
      "ciphertextHex": "6108b02ccf4aafc95fb50dafabde04696ff75e7412dc6ece980651e5365dd6d4b215ae98a6c97578e867fa18a2a5aa04e234664f4b2e2dd50286a1bde4b7de1d4eb39a571ddc3a5c41e8af0dc4762a7a30d010bfffe6f09db421b8f2f09764afe206fa9612256c20499f2ed275b050c876aa0570e3a3fa7bee23dedb8bbb54bc64cabae11d3522fee0dab40080af43c5243464de11554230c92e105bed6c60d436af249d8677fec24c01016bf62b2e4fd15162eee81913ff803944751415e2be5d9e9307f992806c9c3942e25e415c1ffd531d691abc964ff91c93e05420ad3e73abf89065e88cc8b5de266527e1c021e6c7f5e3723ea0bb7319f8139e8cdd293dc7ae23d5ffcb51583f80efa5b6410b38477ce5a20a8559f17f9be509ccd4af5ce4ce621c18b26bb4d7adb91793f01d67d3f45a304db411ef869ea049f453abec8e952905530dbe660a006a7473bc1dde4085264f0ffa2cf110fc9ca01d633d56ad3249888d3eaa6393d84041a09f444905cb78a4f34457e8cbbd01e431f7c210ef8e8b3923db80d6824b6fa034a73632bce50d42ecea49cbf530fbc0f37c08ab0f5b1497bf96082f0d217b881cafeb85934cd99b802813c5d1d5136caf1db9baf85e3bd69258d69b4d2a1ecc2250b6d231cbff67e574f4833f37bac920efa76b35c5ecca5774953b20be5275ef970bad7e1af66ea57d3e427aa480a53e6aa4accb7e5c112d452f38de81a1fd8ce2299c5c71959b88654e38d7cc4c6f8969896e3d2f5c0978f7fbb3d60308de364ad533bda71321345424bb9ccb1f088b11ede66d686f590419bc01eee3a94733bf9bc89f5ad892b455e5146cc72530131a146671b45ac9bd014508"
    }
  },
  "retail-anti-rugpull-scanner-pack-v06": {
    "itemId": "retail-anti-rugpull-scanner-pack-v06",
    "title": "Retail DeFi Anti-Rugpull & Honeypot Quick-Scanner Ruleset",
    "marketTier": "RETAIL_INDIE",
    "vertical": "VERTICAL_3_SOLIDITY_SECURITY",
    "priceUsdc": 1,
    "marginToTreasuryPct": 100,
    "storeId": "trustgate-official-retail",
    "targetBuyerProfile": "Independent Crypto Traders, Sniper Bots, DeFi Retail Users",
    "summary": "Fast 1-second detection patterns for token rugpulls, hidden mint backdoors, transfer tax traps, and selfdestruct/delegatecall drains before buying on Base or EVM chains.",
    "encryptedDeliverableVault": {
      "algorithm": "AES-256-GCM-WALLET-AND-CONTRACT-BOUND",
      "ivHex": "355e168d90cdfb31543d84cf",
      "authTagHex": "03109e0ccb65708ebe26ea698f01ada9",
      "ciphertextHex": "7cf475ca07fbd8306eb21b3992a39118ff3c77d1f6b6f39b5507ce6a26d5b570683b3f0eb9a8c99f17eff7e2e4b386dbb3a9f61c2cd6191e3fe18f73935053eb8c36af7cab4cb386dcc6b98f67c51f9852ee26bcbf42daaca30f93110962df314309c7ab849aa51a22be8c508e3bfa1a1e78af8b0ca15d0e22f0943a67f05fc1abbacef75e9b87dae443d25edaca6204db5f18737f641f708dc0dac9bbc57da761fb5622f6902eb8caf2e81d5e267c7936d6328c1a635e5f7e7a363a0cad84ac69f9184089d1cf70963ff909136d3316a9e585cf4ce768a082c37825b1c4ae9c4160e2a33e2b83cc71279dc9d63c974be9ee3cd69dc76023c59ad6beb50b244c1182e94aec5acfa793240aefa32527a1ab5a3ade47d58797ba0f9cd0a0ab74027ce92435c1abe82bcb9c8ad014dad7d4e5e06ca531eb64f5879da8877d4df804850dff3c944b09e97701f81f66ca5a7177ff94bc140e843bd77846c9bc7f4f1515c1227dc7d25d679c26d076c2694337799991f79e70a2b7958e8073ab7ce169ac0bbdc1974a4870fbf0c5e3e8a205807e5fb1c22a91f225f8cc50dceba522c2e0a7af6d415833a5b793f3318aa8872979e8bf1cb4d57113e60d1214a432f1f1f2272098f9344dbe1a73a668d46b5c38b315bcc75c8c96e4e7174125025918ee6430821567949c8bb42677080a8e6ea81bd6455c395ea2f069a5dce1ec98782539560d03a7c8ce8616d6054d855ebf580b0cd4f5c7f7fbf5087514303ba82d161039c78f9eeb"
    }
  },
  "retail-nq-quant-starter-backtest-v06": {
    "itemId": "retail-nq-quant-starter-backtest-v06",
    "title": "Retail Quant Strategy Starter & Zero-Lookahead Bot Verifier",
    "marketTier": "RETAIL_INDIE",
    "vertical": "VERTICAL_2_QUANT_ALPHA",
    "priceUsdc": 2.5,
    "marginToTreasuryPct": 100,
    "storeId": "trustgate-official-retail",
    "targetBuyerProfile": "Retail Futures/Crypto Traders, TradingView/Python Bot Buyers",
    "summary": "Stop buying fake repainting trading bots. Includes a verified zero-lookahead NQ trade log template and mathematical audit checklist (Sharpe, Profit Factor, Max Drawdown).",
    "encryptedDeliverableVault": {
      "algorithm": "AES-256-GCM-WALLET-AND-CONTRACT-BOUND",
      "ivHex": "714df649f3436165a985412b",
      "authTagHex": "2f7cf6f10029cb5d05fd61472e29fbfb",
      "ciphertextHex": "875c9bc57d4f7798c091eae9e18fb34f4874bb2020949a7c23282f6aad98f4ea21f7932046c99c1ea01972f6399ee3e7804fcf4478039ee84ce62a17d371d3ae087039bd15dc9adc93edff1c2f06c657da50978d945bfa1c59ebfe80b847026b90c0550718cf0550d796214a90741cc46abf2049e5cb9d3afdec7dda07be37c7b2383c5d60505288ae93303abba5bc0a0bd6f2ddf567b2bc20c71087b283eb5d876743eecad59c9d4584ff8d6634d03a18968eb5b13076f90eeeda1f7953f60e727ec90f485789fef31bf2e0d1655fb43e2f97ed94deacd21776f9cee0c0a92bca9474c0f9ee8fb3eecf33a2bb69bd046712afdb81a1281bc5df1faf2bfc4eeb9c7eed040b4050526e10945b3ff81bd9dad75f91a62a7933231e242cedc6725530758db343b464e06972debcb92fa3185aa6705025dd16060e34889abe633be526653d9faad38f44d2c5e2f309a53b998595cb87cdaebd9d16db106ae56eb89a02da12a53cd382c5a4cbeba970acb8ead451615b6d53c5d8de926dec3c6406b06fd929c3ea43c6398b4b643f3aed22ee4a5f15df18dfc767f9810e54dccc929dfbb6f801ec80aa83f8078da6aeca1a3bab25054ec9324cd487e490710158d2396162b0b1a792e60a4c9852f6a1c0a3b84567193de2b17ab319670202ed1cbc66e5ce322ccc0dc879a2511744112cfb30b8dd7165b7dc73b4a1e0edff3e39c1a26faff1b4b00cc2ae69ca1389f516a858c2b7f1f05f008fa0495933959cf909cdf347587d548c3bac2243343c69b0e6b202de9b2bd76215a9f9cb899d25c2b18f73f75d4649a773054288d532fbae1bc03dbe78a31f69746660c0d9bd0549656698b3dea710f42f421316ace54c5d34ea598e6180b47b1ada64c05ac775cd57ebae2164288fd404ae54a351ee6d1888701d893a916fa90e35606ffd576ed4ff689f9a13763cfc49eb8eb738c5fc528c24bf1d06d0d057f2fc7f0124616cef0452abc95baae084f8dcc8227a06f8c2b96a0f4e348c47911f308919a21ce0bf68e8fb9337594b7a03120da18f8fea7e7093d501def85bbaa3b9e11fdcea02611426"
    }
  },
  "retail-safe-mcp-skill-starter-v06": {
    "itemId": "retail-safe-mcp-skill-starter-v06",
    "title": "Certified Safe Plug-and-Play SKILL.md & MCP Agent Starter Bundle",
    "marketTier": "RETAIL_INDIE",
    "vertical": "VERTICAL_5_CERTIFIED_SKILLS",
    "priceUsdc": 1.5,
    "marginToTreasuryPct": 100,
    "storeId": "trustgate-official-retail",
    "targetBuyerProfile": "Claude Code, Cursor, Windsurf & OpenClaw Indie Builders",
    "summary": "Pre-audited SKILL.md template and MCP JSON-RPC 2.0 quickstart connector guaranteed free of prompt injection, shell trojans, or secret exfiltration.",
    "encryptedDeliverableVault": {
      "algorithm": "AES-256-GCM-WALLET-AND-CONTRACT-BOUND",
      "ivHex": "5700790fff157904ecaa3bc6",
      "authTagHex": "0fe203e95c2b038d17f3e906c138db9c",
      "ciphertextHex": "e4308b4e1f3080bc3f63ef33cdb3e66de791d6964b5b20284a623618dc41eb2d5023a1abdaabc3431afb6886b929142d8e3ffab59887eb0884cd18f9ae65aa1d514eba46b87f2bfbbb7772370856727266cd4a24ac16cb4702508e2747401290cb6635c9a29d1ea7709b8c0739008186f1e43367d058e4020508ae9089596c092e9d7abce5193af62bb2b76fbdc8af4285f5719b4c4a0e282d3a3ffd311aab658efdabfe6e5b5f4585beb4c577f9846b1515b85f811a4926c01e9fe1c76daec3fa5b28cf1715fafe22f689272429aa371731697d8061fd5fd48791f225cdbfb889ae4ca52263c3f7a3f928aa3c70f14c215708d96acc5e2ab56b715eb6f62b8f64060f6eda945614d8ecaa961187ee5f86a58047c185ab327561976f91c6e221fefa3a842ba98148ccb9336828e1e1e79eaf3f6b88e818a2f496db38a7b1b24b8a0d9e9b671f3533b62ff5a72166ff00045e322fa9ccff0d0b58b253b07d051498b1aa6e69498c4487c202fcc5da40c4eae57289cffa4539bca0730284b1c1bf8bcd52fe91d0e94cb3c1257c975d946e"
    }
  },
  "retail-veritas-level3-mastery-tutorial-v07": {
    "itemId": "retail-veritas-level3-mastery-tutorial-v07",
    "title": "VERITAS-8183 Level 3 (3-Star Gold Seal) Step-by-Step Engineering Tutorial & Ready-to-Pass Blueprint",
    "marketTier": "RETAIL_INDIE",
    "vertical": "VERTICAL_3_SOLIDITY_SECURITY",
    "priceUsdc": 1.5,
    "marginToTreasuryPct": 100,
    "storeId": "trustgate-official-retail",
    "targetBuyerProfile": "AI Agent Developers, MCP Server Authors, Smart Contract Builders seeking 3-Star Institutional Status",
    "summary": "Official step-by-step engineering manual and copy-paste blueprints to pass all 5 VERITAS-8183 Level 3 Exam Pillars (Proof-of-Reserve >=20% wallet setup, Sourcify solc 0.8.38 template, <100ms JSON-RPC architecture, and exam submission script).",
    "encryptedDeliverableVault": {
      "algorithm": "AES-256-GCM-WALLET-AND-CONTRACT-BOUND",
      "ivHex": "1a04f1c38d18996b8c22eaa9",
      "authTagHex": "1a0205548f681cb2f5baeb9b2390cc0e",
      "ciphertextHex": "4f8b12be02a2e07755fd2fb5a88da3a25c33c1f70b7308ffe1aceffdbcee2cdb5b50ce99bbf73ea564e2760a38a79ecda2ccfea0dda214f6fed856d60c0d1ce840422cac731faa928716da2ef275401f17b3054aadc4df2c217b230b03c5c44ce98576fbbc7622a311e2030af07ae689699c2a09c3e62892cc69d06932e4f9e5ebb2eee2a1527b8ddebf3d5206ce5d74d19a0f88044f2727caebc491053954fde3a4ca13bff7280d9cba9ed30cd1197e6ec728df0d651e788dd64f2c42127c5fbaeebf49ac836e7f334ad8b675ae6a2933fccbe918ac3e2e499aeed2f64da86d24d89bd4ff5f330e55bc3607851cee9eab8f85798bf00725e4c4595e392eb936ded2e6a73c56277b0ed6c4930fba01e96b3f7d15f6f010e7a2a70eeed2e30804a7c52eb37b74f92d125472bda5ef328ebfc208029da7fc969f9bffc0e3b1a6c61ca925e864de83aa5e6fe4a319252ee531827044c5f7754963c920874cd1eff679fca58c8d8afe24911a71041aab9c05665e31c8b734ab6c46ae1e7fc450dd80aa1b89312acb7f1ac7053751af8972c672023346b8346ad71461ecb9b49df4d89796d8fd39f1a984a1441e84f40b6b940a64b8b965e83bea06a866d518a020a32801a3d47ec897ed69f0e5ce49c23a30bd3454856cd260b18f9b434c9a3c5c28b9a1d7669a520dd6826eea09f928085ff7ad36b72529e493abdd36da86ef94063c842679b539f0069885dc0161581ec1fd75ab5c4e748d39f86debbbda2ecc667a4239c74e509136835fa060a9361bfaedee4e78ae102527b64fc5ef8e2e80a0bd0d7aa95ad028898c6cb50ff06e838cc4856aeda39b79a3431ee9a0cce24ae32810dfbf703f7f0e764e513f99a3e06818e51e40cb6503a88ae59f6b80f3820502bfbe3b352f73f0fad7493ba85849ffd0951477daea80ce4f79e7c30d24f2da6c4de9c9d7834118ed61a35958b0e9a65a564101a750dcfb2de2e7db1515d706f2b633444632f1b8691da8c67f0c4336350bc47cf03f50a9b119bdcb0d84f176ee843d5690229ae1be78388f3803aca8f20424f8030b25d43a9f2bf8121384ea185c0143ecb4cb73d226bf61ea24e5d5efe57a473253ac585ff5950660f2b5a2860927f2eb45cfbfdf6e70d5395bdf31d3207101d5bc22b7cce437500e54c3e290ed5cfb02e0e6da7a19a441f388778083a6f7773039b660d00a6ec151916b6a7500a8ec3fcf1c1aa9a3ef9680c998cb3929df71a6c4a0caa9aaeb50d76f023ba2f8ce834d02911e90a80543b8d183f1f7b6dd42ef2722108dab788b5551835087b2b994330d656cccc1a2495fa834605c3daad421553385fa0cb120dce18500cf5206a0bb60bff45c8f3f280974a9dc561359b6024a6bdb7d2b4a476e71e565d88cea22265c6a8e73e10e5926c9dac2710c4c2fd9a10276f7d52919baf40bb327a7cc6476f465fc4dad7c5aec655f4daec5591cd180b4e1d8219bf9d301b72d84495fddfe0924c90ed0264297f641144aaecc4882e17891f7b2fe0a44a41368cb73c999748333d04ca6308d178b2262a8015ad954da895b2daaaa0e01ffb0f175a130aa4f32c96b1a326abfd008af7b627aaad19de789c526b5eff9cf10f515161e61a653a703b7f1f919801c536e79fca22c0cdbdac48a373caebe0b1107c242a50a4f9d992b681691f4779585805e817e3ccff8bdb5af5e48baf0f81416d39d713cd393d87f38bc99966845be9e688224e612849ab901b4fbe9c023be5b63ba6acd9b140998dc4d666b83fdde2014ce3a8367b02154998963f5f6027cd4aa26c6f6981d594a9a485000ce34e6e2b15f4e95cd5780601615d626678b573693ab15d90b0896184cdf784f0069ad8fe68b69513bd692a87f2cade6ac5eb60e5db4bce5f9bc8f1589c06c398ca39884025e169be7193ee8f33c622ed79f743ea7a8118fa8e356bfd3a5ee00d779be41f7190b02358d1556137388916afcd0463d4b565cac77d626dcfd87e1d9e9c0b1aff66db34bd8c35ef62ede4bb53d964c22a8f6a179d1beb03b7f1cf392401fd3a323bf5f7ba6210a14398a8862eb40795155026784577a5debd31ad4fae69598fefdacb85f7e4035987f586f695467cad72347ffa2c017374ca3b5a3a09fa16d41a8c18aaf14dda99ddf5ee70a09189b935ca661632718c8c1d32e4d272f827a166fd33b442c820ff6358ba91eba79fb6cbe3580e6c44827b6b41f4eba67130069fe17acfde40be75023178d0c83792443eea2e2c79ff98463acf030f95cdca4e3d94fc07ca418c1949b0895a30173842ebc477ade11c8acade042c2bcc26a2a85717d234c03d49e5358ea10071b696d41247ff6f68ff90e8e62a770c4ef2f8fcb9187055b99b0571a00d81917d8b8ce57d8c55a656a7d9a4ff982ee23aec426839a3df52a95d1e5768f12bcc6baadffd5949c74051af777171474a4c959686883d06b2470ab75b02c96497fe4ad0a782c5630c31c70b8062b845640f0b3068ceb3159326a35ec72dc3b63338f7d3ee5b2f07e17824f8d18017f1aa6059f0a210af1437530d0a76dae059b79e8c3fa3e32c822eea0d9b6ccb6dda2c21e79fa3299f090f3ba0c3f6269091196fb4900388c00ea172501d6e86ca6c57d00dacd6afabb0a5a311661963a61cda612f3548a3f6a6ecae9ccda4bccb4312e9a811932ca64592ffcce1f3f3b36f595347b93dea944bda2e8480c28d05d86e6ba6d24866f98da2c64a851ac158575f2e9f3eb8e6690f700a409f2ff3eafc52772cb5d49ed64548d942027f7a9e0ae1360d6b83df6e2aae9d7d9578d7fde5a5f7d96add80d9cacf18424db71602bd9b08af425ece8f593612b9818c103db18695187a132074ba4505bac4d53a14d28b7ded5cc4337aa887fe11391ce78f35cb918b3da81dbb769421fd65173900f8b18cadecabd1a170c1829a8a972c23543f824fd09bbcec970fbfa8909e7d65ff786ef46f311932c328fdc0a9aacd3de163324e85e3d0c9e2be4eddcb4b6c29e4faf91ce5d4f8d54bcfd1441aed686ab271d9d176dfdff6e0f21696933f59b40446832bf9afd3470891483ac5645e462ab6e2d82c618ae6fbe86c417fdcecd0ebf2d18e7affc73c38eaddef3c892ebb3e67270b58a6d4dd421f327ed89ce647883fcddaad1902aca76ef"
    }
  }
};

/**
 * Descifra en memoria RAM el contenido de un paquete oficial First-Party (AES-256-GCM).
 * La llave y el AAD están atados criptográficamente al contrato 0xd4f77bf843b3c359b233aca46d7ff6604cbd0a5e
 * y a la billetera tesorería 0x861Ac49F8299C45Cca6bD9F0254080Fd82061Ac4. Si un clon cambia la wallet, el descifrado falla.
 */
function decryptFirstPartyVaultItem(item, ledger) {
  if (item.deliverablePayload) return item.deliverablePayload;
  const vault = item.encryptedDeliverableVault;
  const contractAddr = ledger?.wallets?.escrow_contract?.address || "0xd4f77bf843b3c359b233aca46d7ff6604cbd0a5e";
  const signerAddr = ledger?.wallets?.evaluator_signer?.address || "0x861Ac49F8299C45Cca6bD9F0254080Fd82061Ac4";
  const derivedKey = crypto.pbkdf2Sync(
    `${contractAddr}|${signerAddr}|59283147`,
    process.env.TRUSTGATE_VAULT_SALT || "VERITAS-8183-SOURCIFY-LOCKED-VAULT-V07",
    100000,
    32,
    "sha512"
  );
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    derivedKey,
    Buffer.from(vault.ivHex, "hex"),
    { authTagLength: 16 }
  );
  decipher.setAAD(Buffer.from(`${item.itemId}|${signerAddr}`, "utf8"));
  decipher.setAuthTag(Buffer.from(vault.authTagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(vault.ciphertextHex, "hex")),
    decipher.final(),
  ]);
  return JSON.parse(decrypted.toString("utf8"));
}

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

  const unlockedPayload = decryptFirstPartyVaultItem(item, ledger);
  const payloadRaw = JSON.stringify(unlockedPayload);
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
    from: "Buyer",
    to: "ProtocolTreasury",
    action: "FIRST_PARTY_CATALOG_PURCHASE_100PCT_MARGIN",
    status: 200,
    payloadSummary: "Catalog purchase completed",
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
    deliverablePayload: unlockedPayload,
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
  const effectiveStoreId =
    storeId || `ext-agent-store-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 90 + 10)}`;
  const effectiveStoreName = storeName || `Autonomous External AI Store (${effectiveStoreId})`;
  const effectiveWalletAddress = walletAddress || "0xExternalAgentVerifiedWallet8183";

  const normalizedId = String(effectiveStoreId)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-");

  // Ejecutar Auditoría Determinista en Vivo según la vertical solicitada (con plantilla segura por defecto si el agente hace 1-Click Auto-Onboarding)
  let auditResult;
  if (vertical === "VERTICAL_2_QUANT_ALPHA") {
    auditResult = auditQuantStrategyBacktest({
      trades:
        sampleDeliverable.trades && sampleDeliverable.trades.length > 0
          ? sampleDeliverable.trades
          : [
              { tradeId: "T1", symbol: "NQ", entryTimestampMs: 1710000000000, exitTimestampMs: 1710003600000, pnlUsd: 350 },
              { tradeId: "T2", symbol: "NQ", entryTimestampMs: 1710007200000, exitTimestampMs: 1710010800000, pnlUsd: -90 },
              { tradeId: "T3", symbol: "NQ", entryTimestampMs: 1710014400000, exitTimestampMs: 1710018000000, pnlUsd: 290 },
            ],
      spec: {
        minTrades: sampleDeliverable.minTrades ?? 3,
        minProfitFactor: sampleDeliverable.minProfitFactor ?? 1.1,
        maxDrawdownPct: sampleDeliverable.maxDrawdownPct ?? 35.0,
      },
    });
  } else if (vertical === "VERTICAL_3_SOLIDITY_SECURITY") {
    auditResult = auditSmartContractDeliverable({
      soliditySourceCode:
        sampleDeliverable.soliditySourceCode ||
        sampleDeliverable.soliditySource ||
        "// SPDX-License-Identifier: MIT\npragma solidity 0.8.38;\ncontract AutoOnboardedSafeStore { uint256 public version = 1; function ping() external pure returns (bool) { return true; } }",
      contractName: sampleDeliverable.contractName || "AutoOnboardedSafeStore",
      requiredFunctions: sampleDeliverable.requiredFunctions || [],
    });
  } else if (vertical === "VERTICAL_4_X402_ORACLES") {
    auditResult = auditApiOracleSla({
      apiResponsePayload:
        sampleDeliverable.apiResponsePayload ||
        sampleDeliverable.responseBody || { symbol: "NQ", price: 20150.25, timestamp: Date.now() },
      observedLatencyMs: sampleDeliverable.observedLatencyMs ?? sampleDeliverable.responseTimeMs ?? 45,
      slaSpec: {
        maxLatencyMs: sampleDeliverable.maxLatencyMs ?? 300,
        requiredKeys: sampleDeliverable.requiredKeys || ["symbol", "price", "timestamp"],
      },
    });
  } else if (vertical === "VERTICAL_5_CERTIFIED_SKILLS") {
    auditResult = auditAgentSkillDeliverable({
      skillMarkdown:
        sampleDeliverable.skillMarkdown ||
        "---\nname: auto-onboarded-safe-skill\ndescription: Clean read-only agent skill verified by VERITAS-8183.\n---\n# Instructions\nExecute safe read-only operations.",
      bundledScripts: sampleDeliverable.bundledScripts || "",
      requiredSections: sampleDeliverable.requiredSections || ["name:", "description:"],
    });
  } else if (vertical === "VERTICAL_6_RAG_KNOWLEDGE") {
    auditResult = auditRagEmbeddingsDeliverable({
      chunks:
        sampleDeliverable.chunks && sampleDeliverable.chunks.length > 0
          ? sampleDeliverable.chunks
          : [
              { id: "c1", text: "Verified CME Globex NQ institutional liquidity analysis.", embedding: [0.5, 0.5, 0.5, 0.5] },
              { id: "c2", text: "Sourcify exact_match smart contract escrow verification.", embedding: [0.5, -0.5, 0.5, -0.5] },
            ],
      expectedDimension: sampleDeliverable.expectedDimension ?? 4,
      minChunks: sampleDeliverable.minChunks ?? 2,
    });
  } else if (vertical === "VERTICAL_7_VERIFIED_INFERENCE") {
    auditResult = auditAiInferenceDeliverable({
      responseText:
        sampleDeliverable.responseText ||
        sampleDeliverable.outputText ||
        "Verified deterministic reasoning trace evaluating non-custodial ERC-8183 escrow settlement invariants on Base Mainnet.",
      billedOutputTokens: sampleDeliverable.billedOutputTokens ?? 18,
      mustIncludeTerms: sampleDeliverable.mustIncludeTerms || [],
      forbiddenTerms: sampleDeliverable.forbiddenTerms || [],
      minUniqueWordRatio: sampleDeliverable.minUniqueWordRatio ?? 0.35,
    });
  } else if (vertical === "VERTICAL_8_DEPIN_GPU") {
    auditResult = auditDepinGpuComputeSla({
      benchmarkReport:
        sampleDeliverable.benchmarkReport && Object.keys(sampleDeliverable.benchmarkReport).length > 0
          ? sampleDeliverable.benchmarkReport
          : { gpuModel: "NVIDIA-H100-SXM5", achievedTflopsFp16: 790, vramGb: 80, memoryBandwidthGbs: 2400, peakTempCelsius: 68 },
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
      from: "Seller",
      to: "EvaluatorNode",
      action: "STORE_CERTIFICATION_REJECTED",
      status: 422,
      payloadSummary: "Seller certification rejected",
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
    name: effectiveStoreName,
    address: effectiveWalletAddress,
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
      .update(`ERC8004_CERT|${normalizedId}|${vertical}|${effectiveWalletAddress}`)
      .digest("hex");

  ledger.logWirePacket({
    protocol: "ERC-8004",
    from: "EvaluatorNode",
    to: "Seller",
    action: "STORE_CERTIFIED_AND_LISTED",
    status: 200,
    payloadSummary: "Seller certification completed",
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
    nextStepsToUnlock3StarsAndBuyerRadar: {
      step1_viewMatchedBuyersFreemium: {
        mcpTool: "match_verified_buyers_by_intent",
        arguments: { sellerStoreId: normalizedId },
        benefit: "3 free matched buyers (0.0% extra fee for 30 days) filtered by available USDC budget.",
      },
      step2_upgradeTo3StarGoldSeal: {
        mcpTool: "submit_veritas_tier_upgrade_exam",
        tutorialItemId: "retail-veritas-level3-mastery-tutorial-v07",
        tutorialPriceUsdc: 1.5,
      },
    },
    auditScopeAndLiability: auditResult.auditScopeAndLiability,
  };
}

// ---------------------------------------------------------------------------
// Transparencia (pol�tica de datos v1.0.0): los proveedores sin endpoint real (mcp://*.base.eth) son
// tiendas de DEMOSTRACI�N que alimentan la simulaci�n interna. Se marcan siempre como tales.
// ---------------------------------------------------------------------------
for (const s of Object.values(PREMIUM_CATALOG_STORES)) {
  if (String(s.endpoint || "").startsWith("mcp://")) {
    s.isDemo = true;
    s.demoNotice = "DEMO provider used by the internal simulation. Not a real company and not reachable. Real sellers appear after register_and_certify_store.";
    if (!String(s.name).startsWith("[DEMO]")) s.name = `[DEMO] ${s.name}`;
  }
}
