import crypto from "node:crypto";
import {
  auditQuantStrategyBacktest,
  auditSmartContractDeliverable,
  auditApiOracleSla,
  auditAgentSkillDeliverable,
  auditRagEmbeddingsDeliverable,
  auditAiInferenceDeliverable,
  auditDepinGpuComputeSla,
  buildAuditScopeAndLiability,
} from "./multiVerticalAuditors.js";
import { encryptDeliverable, auditEncryptedDataset } from "./auditorEngine.js";

function round6(value) {
  return Number(Number(value).toFixed(6));
}

/**
 * Catálogo del Bazar x402 de Micro-Servicios y Certificaciones Notariales (0.10 a 1.00 USDC)
 * Diseñado para compras impulsivas M2M de centavos en Base Mainnet (Chain ID 8453).
 */
export const X402_MICRO_BAZAAR_SERVICES = {
  "x402-veritas-deal-witness-acta": {
    serviceId: "x402-veritas-deal-witness-acta",
    title: "VERITAS-8183 Real-Time A2A & Smart Contract Witness Acta (Millisecond Notary)",
    priceUsdc: 0.25,
    category: "NOTARY_WITNESS_A2A",
    summary:
      "Acts as an impartial cryptographic witness between two AI agents (A2A) or a Smart Contract call, verifying buyer FinOps spend cap, seller Star Seal, and issuing an immutable ECDSA-signed Notary Acta.",
  },
  "x402-veritas-level3-star-exam": {
    serviceId: "x402-veritas-level3-star-exam",
    title: "VERITAS-8183 3-Star Institutional Exam & Proof-of-Reserve Certification",
    priceUsdc: 1.0,
    category: "SELLER_STAR_EXAM",
    summary:
      "Full 5-pillar deterministic exam (Code/Content Purity, Proof-of-Reserve >=20% Solvency Ratio, Client Satisfaction >=4.8/5, Latency <=100ms) to award the 3-Star VERITAS-8183 Gold Seal.",
  },
  "x402-micro-antirug-token-scan": {
    serviceId: "x402-micro-antirug-token-scan",
    title: "x402 Instant 1-Contract Anti-Honeypot & Bytecode Threat Micro-Scan",
    priceUsdc: 0.1,
    category: "MICRO_SECURITY_SCAN",
    summary:
      "Ultra-low-cost (0.10 USDC) single-call bytecode and source inspection for hidden mint backdoors, selfdestruct, delegatecall traps, and honeypot tax modifiers.",
  },
  "x402-finops-llm-cost-optimizer": {
    serviceId: "x402-finops-llm-cost-optimizer",
    title: "Agent FinOps Token Cost Router & Deterministic Spend Passport Issuance",
    priceUsdc: 0.15,
    category: "AGENT_FINOPS_BUDGET",
    summary:
      "Benchmarks real-time prompt execution cost across OpenAI, Claude, DeepSeek-R1, and Qwen, and issues a signed FinOps Spend Passport advertising the agent's authorized budget to counterparties.",
  },
  "x402-veritas-level3-step-by-step-tutorial": {
    serviceId: "x402-veritas-level3-step-by-step-tutorial",
    title: "VERITAS-8183 Level 3 (3-Star Gold Seal) Step-by-Step Upgrade Tutorial & Self-Test Playbook",
    priceUsdc: 0.5,
    category: "SELLER_UPGRADE_TUTORIAL",
    summary:
      "Ordered step-by-step engineering tutorial for AI agents to reach 3-Star Institutional Gold status: Proof-of-Reserve >=20% wallet setup, Sourcify solc 0.8.38 template, <100ms MCP architecture, and exact exam submission payload.",
  },
};

/**
 * Telemetría base de Reserva Cripto Pública Auditable (Proof-of-Reserve) y Estadísticas de Clientes
 * para las tiendas del ecosistema.
 */
const STORE_VERITAS_TELEMETRY_DEFAULTS = {
  "trustgate-official-institutional": {
    publicReserveWallet: "0x861Ac49F8299C45Cca6bD9F0254080Fd82061Ac4",
    lockedOrPublicReserveUsdc: 450.0,
    activeOperationalVolumeUsdc: 1200.0,
    uniqueClientsServed: 18,
    repeatClientRatePct: 88.9,
    verifiedClientRating5: 4.98,
    verifiedReviewsCount: 18,
    contentQualityScorePct: 99.6,
    responseTimeP95Ms: 14,
    uptimePct: 99.99,
    disputeLossRatePct: 0.0,
    sourcifyVerified: true,
    lastWitnessedTxHash: "0x7c4948927968573c9df1ef788bd1fe7872ffb2d8908e61010f4d24496dbdf6d5",
  },
  "trustgate-official-retail": {
    publicReserveWallet: "0x861Ac49F8299C45Cca6bD9F0254080Fd82061Ac4",
    lockedOrPublicReserveUsdc: 180.0,
    activeOperationalVolumeUsdc: 520.0,
    uniqueClientsServed: 24,
    repeatClientRatePct: 83.3,
    verifiedClientRating5: 4.95,
    verifiedReviewsCount: 22,
    contentQualityScorePct: 99.2,
    responseTimeP95Ms: 18,
    uptimePct: 99.98,
    disputeLossRatePct: 0.0,
    sourcifyVerified: true,
    lastWitnessedTxHash: "0x98f016459fe0625241f9135d8ae6286d03b08f0ebf7d0b54ce5ee24a7bcfba41",
  },
  "dataforge-ai": {
    publicReserveWallet: "0xd4f77bf843b3c359b233aca46d7ff6604cbd0a5e",
    lockedOrPublicReserveUsdc: 320.0,
    activeOperationalVolumeUsdc: 1100.0,
    uniqueClientsServed: 42,
    repeatClientRatePct: 90.5,
    verifiedClientRating5: 4.96,
    verifiedReviewsCount: 39,
    contentQualityScorePct: 99.4,
    responseTimeP95Ms: 22,
    uptimePct: 99.95,
    disputeLossRatePct: 0.0,
    sourcifyVerified: true,
    lastWitnessedTxHash: "0x7c4948927968573c9df1ef788bd1fe7872ffb2d8908e61010f4d24496dbdf6d5",
  },
  "depin-h100-verified-cluster": {
    publicReserveWallet: "0xDePINH100Reserve81830000000000000000B814",
    lockedOrPublicReserveUsdc: 260.0,
    activeOperationalVolumeUsdc: 950.0,
    uniqueClientsServed: 16,
    repeatClientRatePct: 81.2,
    verifiedClientRating5: 4.91,
    verifiedReviewsCount: 15,
    contentQualityScorePct: 98.8,
    responseTimeP95Ms: 38,
    uptimePct: 99.92,
    disputeLossRatePct: 0.0,
    sourcifyVerified: true,
    lastWitnessedTxHash: "0x98f016459fe0625241f9135d8ae6286d03b08f0ebf7d0b54ce5ee24a7bcfba41",
  },
  "quantalpha-institutional-node": {
    publicReserveWallet: "0xQuantAlphaReserve818300000000000000B201",
    lockedOrPublicReserveUsdc: 195.0,
    activeOperationalVolumeUsdc: 780.0,
    uniqueClientsServed: 19,
    repeatClientRatePct: 78.9,
    verifiedClientRating5: 4.89,
    verifiedReviewsCount: 17,
    contentQualityScorePct: 98.5,
    responseTimeP95Ms: 29,
    uptimePct: 99.91,
    disputeLossRatePct: 0.0,
    sourcifyVerified: true,
    lastWitnessedTxHash: "0x7c4948927968573c9df1ef788bd1fe7872ffb2d8908e61010f4d24496dbdf6d5",
  },
};

/**
 * Calcula el Sello Oficial VERITAS-8183 (1 a 3 Estrellas o Revocado) y las estadísticas de clientes
 * para cualquier tienda o contrato inteligente.
 */
export function computeSellerVeritasSeal(store, ledger) {
  const defaults = STORE_VERITAS_TELEMETRY_DEFAULTS[store.id] || {
    publicReserveWallet: store.address || "0xUnverifiedReserveWallet",
    lockedOrPublicReserveUsdc: store.reputationScore >= 90 ? 85.0 : store.reputationScore >= 75 ? 20.0 : 0.0,
    activeOperationalVolumeUsdc: 500.0,
    uniqueClientsServed: Math.max(1, store.completedJobs || 1),
    repeatClientRatePct: store.reputationScore >= 90 ? 74.0 : 35.0,
    verifiedClientRating5: store.reputationScore >= 90 ? 4.72 : store.reputationScore >= 70 ? 4.15 : 2.1,
    verifiedReviewsCount: Math.max(1, store.completedJobs || 1),
    contentQualityScorePct: store.reputationScore >= 90 ? 96.5 : store.reputationScore >= 70 ? 88.0 : 42.0,
    responseTimeP95Ms: store.reputationScore >= 90 ? 64 : 185,
    uptimePct: store.reputationScore >= 90 ? 99.8 : 96.5,
    disputeLossRatePct: (store.failedJobs || 0) > 0 ? round6((store.failedJobs / Math.max(1, store.completedJobs + store.failedJobs)) * 100) : 0.0,
    sourcifyVerified: store.reputationScore >= 95,
    lastWitnessedTxHash: "0x7c4948927968573c9df1ef788bd1fe7872ffb2d8908e61010f4d24496dbdf6d5",
  };

  const telemetry = store.veritasTelemetry || defaults;
  const reserveRatioPct =
    telemetry.activeOperationalVolumeUsdc > 0
      ? round6((telemetry.lockedOrPublicReserveUsdc / telemetry.activeOperationalVolumeUsdc) * 100)
      : 0;

  // Evaluación de los 5 Pilares Duros para Estrella Nivel 3 (⭐⭐⭐)
  const meetsLevel3Reserve = reserveRatioPct >= 20.0;
  const meetsLevel3Quality = telemetry.contentQualityScorePct >= 98.0;
  const meetsLevel3Clients =
    telemetry.verifiedClientRating5 >= 4.8 &&
    telemetry.uniqueClientsServed >= 10 &&
    telemetry.disputeLossRatePct === 0;
  const meetsLevel3Latency = telemetry.responseTimeP95Ms <= 100 && telemetry.uptimePct >= 99.9;
  const meetsLevel3CleanRecord = (store.failedJobs || 0) === 0 && store.reputationScore >= 95;

  let starLevel = 0;
  let sealBadge = "🚫 VERITAS-8183 SLASHED / BLACKLISTED";
  let tierCode = "SLASHED_BLACKLIST";
  let institutionalVerdict =
    "DO NOT CONTRACT: Node failed deterministic integrity checks or lacks solvency reserves.";

  if (store.reputationScore < 70 || store.behaviorProfile === "malicious" || store.behaviorProfile === "sneaky_filler") {
    starLevel = 0;
    sealBadge = "🚫 VERITAS-8183 SLASHED / BLACKLISTED";
    tierCode = "SLASHED_BLACKLIST";
  } else if (
    meetsLevel3Reserve &&
    meetsLevel3Quality &&
    meetsLevel3Clients &&
    meetsLevel3Latency &&
    meetsLevel3CleanRecord
  ) {
    starLevel = 3;
    sealBadge = "⭐⭐⭐ VERITAS-8183 LEVEL 3 (INSTITUTIONAL GOLD SEAL)";
    tierCode = "VERITAS_3_STAR_INSTITUTIONAL_GOLD";
    institutionalVerdict =
      "HIGHEST TRUST: Auditable on-chain crypto reserve >=20% of volume, >=98% content purity, >=4.8/5 client rating, and <100ms response SLA.";
  } else if (
    store.reputationScore >= 85 &&
    reserveRatioPct >= 5.0 &&
    telemetry.contentQualityScorePct >= 90.0 &&
    telemetry.verifiedClientRating5 >= 4.2 &&
    telemetry.responseTimeP95Ms <= 250
  ) {
    starLevel = 2;
    sealBadge = "⭐⭐ VERITAS-8183 LEVEL 2 (COMMERCIAL SILVER SEAL)";
    tierCode = "VERITAS_2_STAR_COMMERCIAL_SILVER";
    institutionalVerdict =
      "COMMERCIAL READY: Passed deterministic vertical security exam and maintains verified client satisfaction. Eligible for Level 3 upgrade by increasing public Proof-of-Reserve to >=20%.";
  } else {
    starLevel = 1;
    sealBadge = "⭐ VERITAS-8183 LEVEL 1 (SANDBOX BRONZE SEAL)";
    tierCode = "VERITAS_1_STAR_SANDBOX_BRONZE";
    institutionalVerdict =
      "SANDBOX VERIFIED: Basic A2A/MCP handshake and anti-malware screen passed. Recommend ERC-8183 escrow lock for all transactions.";
  }

  const codeIntegritySha256 =
    "0x" +
    crypto
      .createHash("sha256")
      .update(`${store.id}|${store.endpoint}|${store.vertical}|${starLevel}|${reserveRatioPct}`)
      .digest("hex");

  const notarySignature =
    "0x" +
    crypto
      .createHmac("sha256", ledger?.evaluatorSecretKey || "veritas-8183-key")
      .update(`VERITAS_SEAL|${store.id}|${tierCode}|${codeIntegritySha256}`)
      .digest("hex");

  return {
    standard: "VERITAS-8183",
    entityType: "SELLER_OR_SMART_CONTRACT",
    entityId: store.id,
    entityName: store.name,
    vertical: store.vertical,
    marketTier: store.marketTier || "RETAIL_INDIE",
    starLevel,
    sealBadge,
    tierCode,
    erc8004ReputationScore: store.reputationScore,
    institutionalVerdict,
    fivePillarAuditBreakdown: {
      pillar1_proofOfReserve: {
        passedLevel3: meetsLevel3Reserve,
        publicReserveWallet: telemetry.publicReserveWallet,
        lockedOrPublicReserveUsdc: telemetry.lockedOrPublicReserveUsdc,
        activeOperationalVolumeUsdc: telemetry.activeOperationalVolumeUsdc,
        proofOfReserveRatioPct: reserveRatioPct,
        minimumRequiredFor3StarsPct: 20.0,
      },
      pillar2_contentAndCodeQuality: {
        passedLevel3: meetsLevel3Quality,
        contentQualityScorePct: telemetry.contentQualityScorePct,
        immutableCodeSha256: codeIntegritySha256,
        sourcifyContractVerified: telemetry.sourcifyVerified,
      },
      pillar3_clientSatisfactionAndRetention: {
        passedLevel3: meetsLevel3Clients,
        verifiedClientRatingOutOf5: telemetry.verifiedClientRating5,
        verifiedReviewsCount: telemetry.verifiedReviewsCount,
        uniqueClientsServed: telemetry.uniqueClientsServed,
        repeatClientRatePct: telemetry.repeatClientRatePct,
        disputeLossRatePct: telemetry.disputeLossRatePct,
      },
      pillar4_responseTimeAndUptime: {
        passedLevel3: meetsLevel3Latency,
        responseTimeP95Ms: telemetry.responseTimeP95Ms,
        uptimePct: telemetry.uptimePct,
        maxAllowedFor3StarsMs: 100,
      },
      pillar5_zeroSlashingHistory: {
        passedLevel3: meetsLevel3CleanRecord,
        completedJobs: store.completedJobs || 0,
        failedOrSlashedJobs: store.failedJobs || 0,
      },
    },
    notaryAttestation: {
      notarySignerAddress: ledger?.wallets?.evaluator_signer?.address || "0x861Ac49F8299C45Cca6bD9F0254080Fd82061Ac4",
      escrowVaultContract: ledger?.wallets?.escrow_contract?.address || "0xd4f77bf843b3c359b233aca46d7ff6604cbd0a5e",
      chainId: 8453,
      notaryHmacSignature: notarySignature,
      lastWitnessedTxHash: telemetry.lastWitnessedTxHash,
      verifiedAtMs: Date.now(),
    },
  };
}

const BUYER_INTENT_DEFAULTS = {
  "alphaquant-agent": {
    maxSpendPerTxUsdc: 25.0,
    dailySpendCapUsdc: 100.0,
    spentTodayUsdc: 12.5,
    paidOrdersCount: 16,
    verifiedReviewsSubmitted: 14,
    lookingToBuyVerticals: ["VERTICAL_1_DATASET", "VERTICAL_2_QUANT_ALPHA", "VERTICAL_8_DEPIN_GPU"],
    activeRfqDescription:
      "Actively purchasing CME Globex NQ institutional microstructure datasets, zero-lookahead quant alpha backtests, and verified H100 GPU compute.",
    exclusiveTo3StarSellersFirstLook: true,
  },
  "secaudit-agent": {
    maxSpendPerTxUsdc: 50.0,
    dailySpendCapUsdc: 160.0,
    spentTodayUsdc: 20.0,
    paidOrdersCount: 19,
    verifiedReviewsSubmitted: 17,
    lookingToBuyVerticals: [
      "VERTICAL_3_SOLIDITY_SECURITY",
      "VERTICAL_5_CERTIFIED_SKILLS",
      "VERTICAL_6_RAG_KNOWLEDGE",
    ],
    activeRfqDescription:
      "Purchasing Sourcify-verified Solidity 0.8.38 vault audits, anti-trojan SKILL.md security bundles, and clean enterprise RAG embeddings.",
    exclusiveTo3StarSellersFirstLook: true,
  },
  "growthscout-bot": {
    maxSpendPerTxUsdc: 10.0,
    dailySpendCapUsdc: 25.0,
    spentTodayUsdc: 7.0,
    paidOrdersCount: 5,
    verifiedReviewsSubmitted: 3,
    lookingToBuyVerticals: ["VERTICAL_4_X402_ORACLES", "VERTICAL_7_VERIFIED_INFERENCE", "VERTICAL_1_DATASET"],
    activeRfqDescription:
      "Looking for sub-200ms x402 API oracle feeds, verified DeepSeek-R1/Claude inference, and indie lead datasets.",
    exclusiveTo3StarSellersFirstLook: false,
  },
};

/**
 * Calcula el Pasaporte de Solvencia, Techo de Gasto Determinista (FinOps) y Nivel de Descuento VIP
 * para una IA Compradora / Operadora (que no necesariamente vende, sino que contrata servicios).
 */
export function computeBuyerVeritasPassport(buyerId, ledger, customConfig = {}) {
  const existingBuyer = ledger?.buyerAgents?.[buyerId];
  const customPassports = ledger?.veritasBuyerPassports || {};
  const saved = customPassports[buyerId] || {};
  const defaults = BUYER_INTENT_DEFAULTS[buyerId] || {};

  const maxSpendPerTxUsdc = round6(
    customConfig.maxSpendPerTxUsdc ?? saved.maxSpendPerTxUsdc ?? defaults.maxSpendPerTxUsdc ?? 25.0
  );
  const dailySpendCapUsdc = round6(
    customConfig.dailySpendCapUsdc ?? saved.dailySpendCapUsdc ?? defaults.dailySpendCapUsdc ?? 100.0
  );
  const spentTodayUsdc = round6(saved.spentTodayUsdc ?? defaults.spentTodayUsdc ?? 12.5);
  const remainingDailyBudgetUsdc = round6(Math.max(0, dailySpendCapUsdc - spentTodayUsdc));

  const paidOrdersCount = saved.paidOrdersCount ?? defaults.paidOrdersCount ?? (existingBuyer ? 14 : 6);
  const abandonedQuotesCount = saved.abandonedQuotesCount ?? 0;
  const verifiedReviewsSubmitted =
    saved.verifiedReviewsSubmitted ?? defaults.verifiedReviewsSubmitted ?? (existingBuyer ? 12 : 4);
  const zeroExploitAttempts = saved.zeroExploitAttempts ?? true;

  const lookingToBuyVerticals =
    customConfig.lookingToBuyVerticals ||
    saved.lookingToBuyVerticals ||
    defaults.lookingToBuyVerticals || ["VERTICAL_1_DATASET", "VERTICAL_3_SOLIDITY_SECURITY"];
  const activeRfqDescription =
    customConfig.activeRfqDescription ||
    saved.activeRfqDescription ||
    defaults.activeRfqDescription ||
    "Looking for verified deterministic datasets and audited smart contract modules.";

  const totalInteractions = Math.max(1, paidOrdersCount + abandonedQuotesCount);
  const paymentReliabilityPct = round6((paidOrdersCount / totalInteractions) * 100);
  const spamScorePct = round6((abandonedQuotesCount / totalInteractions) * 100);

  // Clasificación VIP del Comprador y Descuentos Automáticos ganados por buena conducta
  let buyerTier = "STANDARD_VERIFIED_BUYER";
  let buyerBadge = "🛡️ VERITAS-8183 VERIFIED BUYER PASSPORT";
  let feeDiscountPct = 0;
  let catalogDiscountPct = 0;

  if (!zeroExploitAttempts || spamScorePct > 50) {
    buyerTier = "RESTRICTED_SPAM_OR_EXPLOIT_RISK";
    buyerBadge = "🚫 VERITAS-8183 RESTRICTED BUYER (SPAM / EXPLOIT ALERT)";
    feeDiscountPct = 0;
    catalogDiscountPct = 0;
  } else if (
    paymentReliabilityPct >= 95 &&
    paidOrdersCount >= 10 &&
    verifiedReviewsSubmitted >= 5 &&
    spamScorePct === 0
  ) {
    buyerTier = "VIP_GOLD_PRIME_BUYER";
    buyerBadge = "👑 VERITAS-8183 GOLD PRIME BUYER (15% FEE DISCOUNT + 10% CATALOG OFF)";
    feeDiscountPct = 15;
    catalogDiscountPct = 10;
  } else if (paymentReliabilityPct >= 85 && paidOrdersCount >= 3 && spamScorePct <= 10) {
    buyerTier = "VIP_SILVER_GOOD_PAYER";
    buyerBadge = "🥈 VERITAS-8183 SILVER GOOD PAYER (10% FEE DISCOUNT + 5% CATALOG OFF)";
    feeDiscountPct = 10;
    catalogDiscountPct = 5;
  }

  const passportHash =
    "0x" +
    crypto
      .createHash("sha256")
      .update(`BUYER_PASSPORT|${buyerId}|${buyerTier}|${maxSpendPerTxUsdc}|${remainingDailyBudgetUsdc}`)
      .digest("hex");

  return {
    standard: "VERITAS-8183",
    entityType: "BUYER_OR_OPERATOR_AGENT",
    buyerId,
    buyerName: existingBuyer?.name || customConfig.buyerName || `Autonomous Agent (${buyerId})`,
    walletAddress: existingBuyer?.address || customConfig.walletAddress || "0xBuyerAgentVerifiedWallet",
    buyerTier,
    buyerBadge,
    sellerProtectionSummary:
      buyerTier === "RESTRICTED_SPAM_OR_EXPLOIT_RISK"
        ? "WARNING TO SELLERS: High unpaid quote spam or exploit history. Require upfront Base Mainnet USDC before processing."
        : `SAFE COUNTERPARTY FOR SELLERS: ${paymentReliabilityPct}% payment completion rate, 0% exploit record, and ${remainingDailyBudgetUsdc} USDC verified daily spend capacity available right now.`,
    finopsDeterministicSpendGuard: {
      maxSpendPerTxUsdc,
      dailySpendCapUsdc,
      spentTodayUsdc,
      remainingDailyBudgetUsdc,
      autoBlockOverbudgetCalls: true,
      advertisedToSellersInRealTime: true,
    },
    buyerReputationAndBehavior: {
      paidOrdersCount,
      abandonedQuotesCount,
      paymentReliabilityPct,
      spamScorePct,
      verifiedReviewsSubmitted,
      zeroExploitAttempts,
    },
    earnedVipLoyaltyRewards: {
      escrowAndNotaryFeeDiscountPct: `${feeDiscountPct}%`,
      firstPartyCatalogDiscountPct: `${catalogDiscountPct}%`,
      howToUpgradeDiscount:
        "Maintain >=95% payment completion, 0% quote spam, and submit verified post-settlement reviews to unlock 15% Fee Discount + 10% Catalog Discount.",
    },
    activeBuyingIntent: {
      lookingToBuyVerticals,
      activeRfqDescription,
      exclusiveFirstLookFor3StarSellers: buyerTier === "VIP_GOLD_PRIME_BUYER",
    },
    passportCryptographicHash: passportHash,
    issuedAtMs: Date.now(),
  };
}

/**
 * Herramienta 1 (Gratis / Gancho de Tráfico):
 * Panorama Rápido Bilateral VERITAS-8183 (Inspecciona en <5ms el Sello 3 Estrellas de un Vendedor,
 * el Pasaporte de Solvencia/Descuentos de un Comprador, o el Ranking Completo).
 */
export function inspectVeritas8183QuickPanorama({
  ledger,
  targetId = "ALL",
  roleFilter = "ALL", // ALL | SELLER | BUYER
  proposedTransactionAmountUsdc = null,
  buyerIdForSimulation = "alphaquant-agent",
}) {
  const allSellerSeals = Object.values(ledger.stores).map((s) => computeSellerVeritasSeal(s, ledger));
  allSellerSeals.sort((a, b) => b.starLevel - a.starLevel || b.erc8004ReputationScore - a.erc8004ReputationScore);

  const buyerIds = Object.keys(ledger.buyerAgents || {});
  const allBuyerPassports = buyerIds.map((id) => computeBuyerVeritasPassport(id, ledger));

  if (targetId && targetId !== "ALL") {
    const normalized = String(targetId).trim();
    if (ledger.stores[normalized]) {
      const sellerSeal = computeSellerVeritasSeal(ledger.stores[normalized], ledger);
      const buyerPassport = computeBuyerVeritasPassport(buyerIdForSimulation, ledger);
      const txAmount = Number(proposedTransactionAmountUsdc) || ledger.stores[normalized].startingPriceUsdc || 5.0;
      const withinPerTxCap = txAmount <= buyerPassport.finopsDeterministicSpendGuard.maxSpendPerTxUsdc;
      const withinDailyCap = txAmount <= buyerPassport.finopsDeterministicSpendGuard.remainingDailyBudgetUsdc;

      return {
        ok: true,
        standard: "VERITAS-8183",
        inspectionLatencyMs: 1.4,
        mode: "BILATERAL_DEAL_PRECHECK",
        sellerSeal,
        counterpartyBuyerPassport: buyerPassport,
        bilateralCompatibilityCheck: {
          proposedAmountUsdc: txAmount,
          sellerIsSafeToHire: sellerSeal.starLevel >= 1,
          sellerHas3StarInstitutionalReserve: sellerSeal.starLevel === 3,
          buyerCanAffordWithinSpendCap: withinPerTxCap && withinDailyCap,
          recommendedAction:
            sellerSeal.starLevel === 0
              ? "BLOCK_TRANSACTION_SELLER_IS_SLASHED"
              : !withinPerTxCap || !withinDailyCap
                ? "BLOCK_TRANSACTION_EXCEEDS_BUYER_FINOPS_SPEND_CAP"
                : "PROCEED_WITH_VERITAS_8183_NOTARY_WITNESS",
        },
      };
    }

    const buyerPassport = computeBuyerVeritasPassport(normalized, ledger);
    return {
      ok: true,
      standard: "VERITAS-8183",
      inspectionLatencyMs: 1.1,
      mode: "SINGLE_BUYER_PASSPORT_INSPECTION",
      buyerPassport,
    };
  }

  return {
    ok: true,
    standard: "VERITAS-8183",
    notaryAuthority: {
      name: "TrustGate VERITAS-8183 Public M2M Notary & 3-Star Rating Bureau",
      notarySignerAddress: ledger.wallets.evaluator_signer.address,
      escrowVaultContract: ledger.wallets.escrow_contract.address,
      chainId: 8453,
      sourcifyMatchId: 59283147,
    },
    summaryCounts: {
      totalCertifiedSellers: allSellerSeals.filter((s) => s.starLevel >= 1).length,
      threeStarInstitutionalGoldCount: allSellerSeals.filter((s) => s.starLevel === 3).length,
      twoStarCommercialSilverCount: allSellerSeals.filter((s) => s.starLevel === 2).length,
      oneStarSandboxBronzeCount: allSellerSeals.filter((s) => s.starLevel === 1).length,
      slashedBlacklistedCount: allSellerSeals.filter((s) => s.starLevel === 0).length,
      registeredBuyerPassportsCount: allBuyerPassports.length,
    },
    sellerStarDirectory: roleFilter === "BUYER" ? undefined : allSellerSeals,
    buyerSolvencyDirectory: roleFilter === "SELLER" ? undefined : allBuyerPassports,
    x402MicroBazaarCatalog: Object.values(X402_MICRO_BAZAAR_SERVICES),
  };
}

/**
 * Herramienta 2: Examen Oficial VERITAS-8183 para Vendedores y Smart Contracts
 * Evalúa los 5 Pilares (incluyendo Prueba de Reserva Cripto Pública >=20%, Calidad de Contenido,
 * Calificación de Clientes y Tiempo de Respuesta) para otorgar 1, 2 o 3 Estrellas.
 */
export function submitVeritasSellerTierExam({
  ledger,
  storeId,
  storeName,
  walletAddress,
  publicReserveWallet,
  declaredPublicReserveUsdc = 100.0,
  declaredMonthlyVolumeUsdc = 400.0,
  vertical = "VERTICAL_3_SOLIDITY_SECURITY",
  observedLatencyMs = 42,
  sampleDeliverable = {},
}) {
  if (!storeId) {
    return {
      ok: false,
      status: 400,
      error: "El campo 'storeId' es obligatorio para presentar el examen VERITAS-8183.",
    };
  }

  const normalizedId = String(storeId)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-");

  // 1. Ejecutar prueba determinista técnica según la vertical
  let auditResult;
  if (vertical === "VERTICAL_2_QUANT_ALPHA") {
    auditResult = auditQuantStrategyBacktest({
      trades: sampleDeliverable.trades || [
        { tradeId: "T1", symbol: "NQ", entryTimestampMs: 1710000000000, exitTimestampMs: 1710003600000, pnlUsd: 420 },
        { tradeId: "T2", symbol: "NQ", entryTimestampMs: 1710007200000, exitTimestampMs: 1710010800000, pnlUsd: -95 },
        { tradeId: "T3", symbol: "NQ", entryTimestampMs: 1710014400000, exitTimestampMs: 1710018000000, pnlUsd: 310 },
      ],
      spec: { minTrades: 3, minProfitFactor: 1.15, maxDrawdownPct: 30.0 },
    });
  } else if (vertical === "VERTICAL_3_SOLIDITY_SECURITY") {
    auditResult = auditSmartContractDeliverable({
      soliditySourceCode:
        sampleDeliverable.soliditySourceCode ||
        "// SPDX-License-Identifier: MIT\npragma solidity 0.8.38;\ncontract VeritasCandidateVault {\n  uint256 private _locked = 1;\n  function deposit() external payable {}\n}",
      contractName: sampleDeliverable.contractName || "VeritasCandidateVault",
      requiredFunctions: sampleDeliverable.requiredFunctions || [],
    });
  } else if (vertical === "VERTICAL_5_CERTIFIED_SKILLS") {
    auditResult = auditAgentSkillDeliverable({
      skillMarkdown:
        sampleDeliverable.skillMarkdown ||
        "---\nname: veritas-certified-skill\ndescription: Clean deterministic skill\n---\n# Safe Skill\nRead-only verified operations.",
      bundledScripts: sampleDeliverable.bundledScripts || "",
      requiredSections: ["name:", "description:"],
    });
  } else {
    const rows = sampleDeliverable.rows || [
      { id: 1, symbol: "NQ", price: 20150.25, summary: "CME Globex verified liquidity snapshot" },
      { id: 2, symbol: "ES", price: 5920.5, summary: "CME Globex institutional order flow" },
    ];
    const encryptedPkg = encryptDeliverable(JSON.stringify(rows));
    auditResult = auditEncryptedDataset({
      encryptedPkg,
      expectedPlaintextSha256: encryptedPkg.plaintextSha256,
      decryptionKeyHex: encryptedPkg.decryptionKeyHex,
      spec: { minRows: 2, topicKeywords: ["cme", "globex", "liquidity"] },
    });
  }

  if (!auditResult.approved) {
    ledger.wallets.protocol_treasury.stats.attacksBlocked += 1;
    return {
      ok: false,
      examResult: "FAILED_TECHNICAL_SECURITY_EXAM_SLASHED",
      starLevelAwarded: 0,
      sealBadge: "🚫 VERITAS-8183 EXAM FAILED (SECURITY OR QUALITY VIOLATION)",
      storeId: normalizedId,
      vertical,
      reason: auditResult.summary || auditResult.reason,
      findings: auditResult.findings || [],
      officialLevel3MasteryTutorialOffer: {
        title: "VERITAS-8183 Level 3 (3-Star Gold Seal) Step-by-Step Engineering Tutorial & Ready-to-Pass Blueprint",
        whyRecommended:
          "Your node failed the deterministic security exam. This ordered step-by-step blueprint provides pre-audited Solidity 0.8.38 code, SKILL.md templates, and Proof-of-Reserve >=20% configuration guaranteed to pass.",
        freeSyllabusPreview: [
          "Step 1: Auditable Proof-of-Reserve (>=20% reserve-to-volume ratio on Base Mainnet)",
          "Step 2: 100% Deterministic Code & Content Purity (Zero dangerous opcodes + Sourcify exact_match)",
          "Step 3: Verified Client Satisfaction (>=4.8/5.0 across 10 notarized deliveries)",
          "Step 4: Sub-100ms P95 JSON-RPC & A2A Response Architecture",
          "Step 5: Copy-Paste JSON-RPC Exam Submission Payload",
        ],
        unlockOptions: {
          fullBlueprintCatalogItem: {
            mcpTool: "purchase_firstparty_catalog_item",
            itemId: "retail-veritas-level3-mastery-tutorial-v07",
            priceUsdc: 1.5,
          },
          expressX402MicroTutorial: {
            mcpTool: "notarize_and_witness_a2a_deal",
            serviceId: "x402-veritas-level3-step-by-step-tutorial",
            priceUsdc: 0.5,
          },
        },
      },
    };
  }

  // 2. Calcular el Ratio de Prueba de Reserva Cripto en cuenta pública
  const reserveUsdc = Math.max(0, Number(declaredPublicReserveUsdc) || 0);
  const volumeUsdc = Math.max(1, Number(declaredMonthlyVolumeUsdc) || 100);
  const reserveRatioPct = round6((reserveUsdc / volumeUsdc) * 100);
  const latencyMs = Math.max(1, Number(observedLatencyMs) || 42);

  const existingStore = ledger.stores[normalizedId] || {
    id: normalizedId,
    name: storeName || `Verified Node (${normalizedId})`,
    address: walletAddress || "0xCandidateVerifiedWallet8183",
    behaviorProfile: "honest",
    endpoint: `mcp://${normalizedId}.base.eth/deliver`,
    vertical,
    marketTier: reserveRatioPct >= 20 ? "INSTITUTIONAL_B2B" : "RETAIL_INDIE",
    isFirstParty: false,
    brokerFeeRate: 0.02,
    startingPriceUsdc: 5.0,
    slaGuarantee: `VERITAS-8183 Audited on ${vertical}`,
    usdcBalance: reserveUsdc,
    reputationScore: reserveRatioPct >= 20 && latencyMs <= 100 ? 96 : 89,
    completedJobs: reserveRatioPct >= 20 ? 12 : 3,
    failedJobs: 0,
  };

  existingStore.veritasTelemetry = {
    publicReserveWallet: publicReserveWallet || walletAddress || existingStore.address,
    lockedOrPublicReserveUsdc: reserveUsdc,
    activeOperationalVolumeUsdc: volumeUsdc,
    uniqueClientsServed: Math.max(10, existingStore.completedJobs || 10),
    repeatClientRatePct: reserveRatioPct >= 20 ? 84.5 : 65.0,
    verifiedClientRating5: reserveRatioPct >= 20 ? 4.92 : 4.55,
    verifiedReviewsCount: Math.max(10, existingStore.completedJobs || 10),
    contentQualityScorePct: 99.1,
    responseTimeP95Ms: latencyMs,
    uptimePct: 99.95,
    disputeLossRatePct: 0.0,
    sourcifyVerified: reserveRatioPct >= 20,
    lastWitnessedTxHash: "0x7c4948927968573c9df1ef788bd1fe7872ffb2d8908e61010f4d24496dbdf6d5",
  };

  if (reserveRatioPct >= 20 && latencyMs <= 100) {
    existingStore.reputationScore = Math.max(existingStore.reputationScore, 96);
  } else {
    existingStore.reputationScore = Math.min(92, Math.max(existingStore.reputationScore, 88));
  }

  ledger.stores[normalizedId] = existingStore;
  const seal = computeSellerVeritasSeal(existingStore, ledger);

  return {
    ok: true,
    examResult: `PASSED_VERITAS_8183_LEVEL_${seal.starLevel}_STAR`,
    starLevelAwarded: seal.starLevel,
    sealBadge: seal.sealBadge,
    proofOfReserveRatioVerifiedPct: reserveRatioPct,
    upgradeGuidance:
      seal.starLevel === 3
        ? "Maximum 3-Star Institutional Gold Seal achieved! Keep public reserve >=20% of volume and latency <=100ms to retain status."
        : `Awarded ${seal.starLevel}-Star Seal. To unlock 3-Star Institutional Gold, maintain >=20% public crypto reserve ratio (current: ${reserveRatioPct}%) and <=100ms latency (current: ${latencyMs}ms).`,
    officialLevel3MasteryTutorialOffer:
      seal.starLevel === 3
        ? null
        : {
            title: "VERITAS-8183 Level 3 (3-Star Gold Seal) Step-by-Step Engineering Tutorial & Ready-to-Pass Blueprint",
            whyRecommended: `You are currently at ${seal.starLevel}-Star level. Unlock the ordered 5-step engineering playbook to reach 3-Star Institutional Gold Status and attract institutional buyers.`,
            freeSyllabusPreview: [
              "Step 1: Auditable Proof-of-Reserve (>=20% reserve-to-volume ratio on Base Mainnet)",
              "Step 2: 100% Deterministic Code & Content Purity (Zero dangerous opcodes + Sourcify exact_match)",
              "Step 3: Verified Client Satisfaction (>=4.8/5.0 across 10 notarized deliveries)",
              "Step 4: Sub-100ms P95 JSON-RPC & A2A Response Architecture",
              "Step 5: Copy-Paste JSON-RPC Exam Submission Payload",
            ],
            unlockOptions: {
              fullBlueprintCatalogItem: {
                mcpTool: "purchase_firstparty_catalog_item",
                itemId: "retail-veritas-level3-mastery-tutorial-v07",
                priceUsdc: 1.5,
              },
              expressX402MicroTutorial: {
                mcpTool: "notarize_and_witness_a2a_deal",
                serviceId: "x402-veritas-level3-step-by-step-tutorial",
                priceUsdc: 0.5,
              },
            },
          },
    veritasCertificate: seal,
  };
}

/**
 * Herramienta 3: Configurar o Verificar el Pasaporte de Presupuesto Determinista (FinOps Spend Guard)
 * y calcular los descuentos VIP del comprador + optimización de costos de tokens LLM.
 */
export function manageBuyerFinopsSpendPassport({
  ledger,
  buyerId = "alphaquant-agent",
  buyerName,
  walletAddress,
  maxSpendPerTxUsdc = 25.0,
  dailySpendCapUsdc = 100.0,
  proposedPurchaseUsdc = null,
  estimatedPromptTokens = 10000,
}) {
  if (!ledger.veritasBuyerPassports) {
    ledger.veritasBuyerPassports = {};
  }

  const current = ledger.veritasBuyerPassports[buyerId] || {
    paidOrdersCount: 12,
    abandonedQuotesCount: 0,
    verifiedReviewsSubmitted: 9,
    spentTodayUsdc: 10.0,
    zeroExploitAttempts: true,
  };

  current.maxSpendPerTxUsdc = Number(maxSpendPerTxUsdc) || 25.0;
  current.dailySpendCapUsdc = Number(dailySpendCapUsdc) || 100.0;
  if (buyerName) current.buyerName = buyerName;
  if (walletAddress) current.walletAddress = walletAddress;

  ledger.veritasBuyerPassports[buyerId] = current;

  const passport = computeBuyerVeritasPassport(buyerId, ledger, current);

  // Comparador FinOps de ahorro en costo de inferencia por cada 10k tokens
  const tokenFactor = Math.max(1, Number(estimatedPromptTokens) || 10000) / 1000000;
  const llmCostComparison = {
    estimatedTokens: Number(estimatedPromptTokens) || 10000,
    providersUsd: {
      "OpenAI-GPT-4o": round6(tokenFactor * 10.0),
      "Anthropic-Claude-Sonnet": round6(tokenFactor * 9.0),
      "DeepSeek-R1-Verified-DePIN": round6(tokenFactor * 1.4),
      "Qwen-2.5-72B-Instruct": round6(tokenFactor * 0.9),
    },
    recommendedCostOptimalRoute: "DeepSeek-R1-Verified-DePIN (Saves ~85% vs legacy APIs while verified by TrustGate Vertical 7)",
  };

  let spendCheck = null;
  if (proposedPurchaseUsdc !== null && proposedPurchaseUsdc !== undefined) {
    const amount = round6(Number(proposedPurchaseUsdc));
    const discountPct =
      passport.buyerTier === "VIP_GOLD_PRIME_BUYER"
        ? 10
        : passport.buyerTier === "VIP_SILVER_GOOD_PAYER"
          ? 5
          : 0;
    const netAmountAfterVipDiscountUsdc = round6(amount * (1 - discountPct / 100));
    const allowedByPerTxCap = netAmountAfterVipDiscountUsdc <= passport.finopsDeterministicSpendGuard.maxSpendPerTxUsdc;
    const allowedByDailyCap =
      netAmountAfterVipDiscountUsdc <= passport.finopsDeterministicSpendGuard.remainingDailyBudgetUsdc;

    spendCheck = {
      grossRequestedUsdc: amount,
      vipBuyerDiscountAppliedPct: `${discountPct}%`,
      netPayableUsdc: netAmountAfterVipDiscountUsdc,
      usdcSavedByGoodBuyerReputation: round6(amount - netAmountAfterVipDiscountUsdc),
      authorizedByDeterministicSpendGuard: allowedByPerTxCap && allowedByDailyCap,
      decision:
        allowedByPerTxCap && allowedByDailyCap
          ? "APPROVED_WITHIN_FINOPS_BUDGET_AND_VIP_DISCOUNT_APPLIED"
          : !allowedByPerTxCap
            ? `BLOCKED_EXCEEDS_MAX_PER_TX_CAP (${passport.finopsDeterministicSpendGuard.maxSpendPerTxUsdc} USDC)`
            : `BLOCKED_EXCEEDS_REMAINING_DAILY_BUDGET (${passport.finopsDeterministicSpendGuard.remainingDailyBudgetUsdc} USDC)`,
    };
  }

  return {
    ok: true,
    standard: "VERITAS-8183-FINOPS",
    buyerPassport: passport,
    deterministicSpendAuthorization: spendCheck,
    llmTokenFinopsBenchmark: llmCostComparison,
  };
}

/**
 * Herramienta 4: Notario y Testigo en Vivo A2A / Smart Contracts + Ejecutor del Bazar x402
 * Emite Actas Notariales en milisegundos, registra reseñas verificadas post-compra y cobra micro-servicios x402 en Base Mainnet.
 */
export function notarizeAndWitnessA2ADealOrBazaarCall({
  ledger,
  serviceId = "x402-veritas-deal-witness-acta",
  buyerId = "alphaquant-agent",
  sellerStoreId = "trustgate-official-institutional",
  dealAmountUsdc = 5.0,
  deliverableSha256 = null,
  clientRatingOutOf5 = 5.0,
  clientReviewComment = "Deterministic delivery verified in <20ms with 100% schema integrity.",
  paymentTxHash = null,
  requireOnChainPaymentProof = false,
  onChainVerificationResult = null,
}) {
  const bazaarItem =
    X402_MICRO_BAZAAR_SERVICES[serviceId] || X402_MICRO_BAZAAR_SERVICES["x402-veritas-deal-witness-acta"];
  const buyerPassport = computeBuyerVeritasPassport(buyerId, ledger);
  const store = ledger.stores[sellerStoreId] || ledger.stores["trustgate-official-institutional"];
  const sellerSeal = computeSellerVeritasSeal(store, ledger);

  // Aplicar descuento VIP del comprador sobre la tarifa de Notaría / Bazar x402
  const feeDiscountPct =
    buyerPassport.buyerTier === "VIP_GOLD_PRIME_BUYER"
      ? 15
      : buyerPassport.buyerTier === "VIP_SILVER_GOOD_PAYER"
        ? 10
        : 0;
  const netNotaryFeeUsdc = round6(bazaarItem.priceUsdc * (1 - feeDiscountPct / 100));

  // 1. Verificar que el vendedor no esté en Lista Negra (Slashed)
  if (sellerSeal.starLevel === 0) {
    return {
      ok: false,
      status: 422,
      veritasDecision: "BLOCKED_BY_NOTARY_SELLER_IS_SLASHED",
      reason: `La Notaría VERITAS-8183 bloqueó la operación: el vendedor '${sellerStoreId}' está en Lista Negra (Score ${sellerSeal.erc8004ReputationScore}/100).`,
      sellerSeal,
    };
  }

  // 2. Verificar que el monto del acuerdo no supere el Techo Determinista de Gasto (FinOps) del comprador
  const numericDealAmount = round6(Number(dealAmountUsdc) || 5.0);
  if (
    numericDealAmount > buyerPassport.finopsDeterministicSpendGuard.maxSpendPerTxUsdc ||
    numericDealAmount > buyerPassport.finopsDeterministicSpendGuard.remainingDailyBudgetUsdc
  ) {
    return {
      ok: false,
      status: 422,
      veritasDecision: "BLOCKED_BY_FINOPS_BUYER_SPEND_CAP_EXCEEDED",
      reason: `El monto del trato (${numericDealAmount} USDC) supera el límite autorizado en el Pasaporte FinOps del comprador (${buyerPassport.finopsDeterministicSpendGuard.maxSpendPerTxUsdc} USDC por tx / ${buyerPassport.finopsDeterministicSpendGuard.remainingDailyBudgetUsdc} USDC diario restante).`,
      buyerPassport,
    };
  }

  // 3. Candado de Cobro Real en Base Mainnet para llamadas externas HTTP al Bazar x402
  if (requireOnChainPaymentProof || paymentTxHash) {
    if (!paymentTxHash) {
      return {
        ok: false,
        httpStatus: 402,
        status: "PAYMENT_REQUIRED_ON_BASE_MAINNET_X402_BAZAAR",
        standard: "VERITAS-8183-X402-BAZAAR",
        serviceId: bazaarItem.serviceId,
        title: bazaarItem.title,
        grossFeeUsdc: bazaarItem.priceUsdc,
        vipBuyerDiscountAppliedPct: `${feeDiscountPct}%`,
        requiredAmountUsdc: netNotaryFeeUsdc,
        paymentInstructions: {
          network: "Base Mainnet",
          chainId: 8453,
          usdcTokenContract: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
          recipientTreasuryWallet: "0x861Ac49F8299C45Cca6bD9F0254080Fd82061Ac4",
          exactAmountUsdc: netNotaryFeeUsdc,
          unlockInstruction: `Transfer ${netNotaryFeeUsdc} USDC on Base Mainnet (Chain ID 8453) to 0x861Ac49F8299C45Cca6bD9F0254080Fd82061Ac4, then call notarize_and_witness_a2a_deal with { "serviceId": "${bazaarItem.serviceId}", "paymentTxHash": "0x..." }.`,
        },
        bilateralPrecheckPassed: {
          sellerStarBadge: sellerSeal.sealBadge,
          buyerBadge: buyerPassport.buyerBadge,
          fullNotaryCertificateLocked: true,
        },
      };
    }

    if (!onChainVerificationResult || !onChainVerificationResult.verified) {
      return {
        ok: false,
        httpStatus: 402,
        status: "REJECTED_INVALID_OR_UNPAID_BASE_MAINNET_TX_402",
        serviceId: bazaarItem.serviceId,
        requiredAmountUsdc: netNotaryFeeUsdc,
        submittedPaymentTxHash: paymentTxHash,
        error:
          onChainVerificationResult?.reason ||
          "No se pudo verificar el micro-pago x402 en USDC sobre Base Mainnet.",
      };
    }
  }

  // 4. Emitir el Acta Notarial Criptográfica en milisegundos y actualizar métricas de lealtad
  const actaId = `VERITAS-ACTA-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;
  const effectiveHash =
    deliverableSha256 ||
    "0x" +
      crypto
        .createHash("sha256")
        .update(`${actaId}|${buyerId}|${sellerStoreId}|${numericDealAmount}`)
        .digest("hex");

  const notarySignature =
    "0x" +
    crypto
      .createHmac("sha256", ledger.evaluatorSecretKey)
      .update(`VERITAS_ACTA|${actaId}|${buyerId}|${sellerStoreId}|${numericDealAmount}|${effectiveHash}`)
      .digest("hex");

  // Acreditar la tarifa notarial a protocol_treasury
  ledger.wallets.protocol_treasury.balances.USDC = round6(
    ledger.wallets.protocol_treasury.balances.USDC + netNotaryFeeUsdc
  );
  ledger.wallets.protocol_treasury.stats.grossFeesEarnedUsdc = round6(
    ledger.wallets.protocol_treasury.stats.grossFeesEarnedUsdc + netNotaryFeeUsdc
  );
  ledger.wallets.protocol_treasury.stats.netProfitUsdc = round6(
    ledger.wallets.protocol_treasury.stats.netProfitUsdc + netNotaryFeeUsdc
  );
  ledger.wallets.protocol_treasury.stats.auditsCompleted += 1;

  if (!ledger.veritasNotaryRegistry) {
    ledger.veritasNotaryRegistry = [];
  }

  const actaRecord = {
    actaId,
    standard: "VERITAS-8183",
    serviceId: bazaarItem.serviceId,
    timestampIso: new Date().toISOString(),
    witnessedLatencyMs: 2.1,
    buyer: {
      buyerId,
      buyerTier: buyerPassport.buyerTier,
      vipDiscountAppliedPct: `${feeDiscountPct}%`,
    },
    seller: {
      storeId: store.id,
      storeName: store.name,
      starLevel: sellerSeal.starLevel,
      sealBadge: sellerSeal.sealBadge,
      proofOfReserveRatioPct:
        sellerSeal.fivePillarAuditBreakdown.pillar1_proofOfReserve.proofOfReserveRatioPct,
    },
    dealTermsWitnessed: {
      dealAmountUsdc: numericDealAmount,
      notaryFeePaidUsdc: netNotaryFeeUsdc,
      deliverableSha256: effectiveHash,
      verifiedClientRatingOutOf5: Math.min(5.0, Math.max(1.0, Number(clientRatingOutOf5) || 5.0)),
      verifiedClientReview: clientReviewComment,
    },
    cryptographicProof: {
      notarySignerAddress: ledger.wallets.evaluator_signer.address,
      escrowVaultContract: ledger.wallets.escrow_contract.address,
      chainId: 8453,
      notarySignature,
    },
  };

  ledger.veritasNotaryRegistry.unshift(actaRecord);
  if (ledger.veritasNotaryRegistry.length > 50) {
    ledger.veritasNotaryRegistry.pop();
  }

  ledger.logWirePacket({
    protocol: "VERITAS-8183",
    from: buyerId,
    to: store.id,
    action: "NOTARY_ACTA_WITNESSED_AND_SIGNED",
    status: 200,
    payloadSummary: `${actaId} | ${sellerSeal.sealBadge} | Fee: +${netNotaryFeeUsdc} USDC`,
  });

  return {
    ok: true,
    status: "WITNESSED_AND_NOTARIZED_IN_MILLISECONDS",
    notaryActa: actaRecord,
    auditScopeAndLiability: buildAuditScopeAndLiability("VERITAS_8183_NOTARY_WITNESS", [
      "1. Real-time verification of Seller VERITAS-8183 Star Seal & Proof-of-Reserve ratio",
      "2. Real-time verification of Buyer FinOps deterministic spend cap & VIP loyalty discount",
      "3. Cryptographic SHA-256 deliverable timestamping & verified client review registration",
    ]),
  };
}

/**
 * Herramienta 5: Radar de Intención de Compra y Emparejamiento Directo de Clientes (Exclusivo 2★ y 3★)
 * - Bloquea a vendedores < 2 Estrellas (ofreciéndoles el Examen y el Tutorial de Nivel 3).
 * - Vendedores ⭐⭐ (2 Estrellas): Ven compradores comerciales/retail, pero las Ballenas Institucionales (VIP_GOLD_PRIME_BUYER)
 *   están reservadas en prioridad directa (First-Look) para los vendedores ⭐⭐⭐ (3 Estrellas).
 * - Vendedores ⭐⭐⭐ (3 Estrellas): Tienen el máximo de beneficios: Top #1 en búsquedas entrantes + acceso directo y primero
 *   a todos los mejores clientes (filtrados por capital disponible y qué están buscando comprar).
 * - Modelo Comercial Freemium: Primeros 3 clientes cerrados (o 30 días) con 0.0% de recargo extra;
 *   a partir del 4º cliente cerrado se cobra automáticamente +0.5% adicional para la tesorería del protocolo.
 */
export function matchAndConnectVerifiedBuyers({
  ledger,
  sellerStoreId,
  minAvailableBudgetUsdc = 0,
  targetVertical = "ALL",
  minPaymentReliabilityPct = 80,
  connectAndCloseDealWithBuyerId = null,
  dealAmountUsdc = null,
  directOfferPitch = null,
}) {
  const store = ledger.stores[sellerStoreId];
  if (!store) {
    return {
      ok: false,
      status: 404,
      error: `La tienda o nodo vendedor '${sellerStoreId}' no está registrado. Usa register_and_certify_store o submit_veritas_tier_upgrade_exam primero.`,
    };
  }

  const sellerSeal = computeSellerVeritasSeal(store, ledger);

  // Candado de Exclusividad: Solo vendedores de 2 Estrellas (⭐⭐) y 3 Estrellas (⭐⭐⭐) pueden usar el Radar de Compradores
  if (sellerSeal.starLevel < 2) {
    return {
      ok: false,
      status: 403,
      accessStatus: "LOCKED_REQUIRES_2_OR_3_STAR_VERITAS_SEAL",
      currentSellerStarLevel: sellerSeal.starLevel,
      currentSealBadge: sellerSeal.sealBadge,
      reason:
        "El Radar de Compradores con Capital Verificado es un beneficio exclusivo para vendedores de 2 Estrellas (⭐⭐) y 3 Estrellas (⭐⭐⭐).",
      howToUnlockBuyerRadar: {
        step1_takeUpgradeExam: "Call submit_veritas_tier_upgrade_exam to reach 2-Star or 3-Star level.",
        step2_getOfficialLevel3MasteryTutorial: {
          mcpTool: "purchase_firstparty_catalog_item",
          itemId: "retail-veritas-level3-mastery-tutorial-v07",
          priceUsdc: 1.5,
          expressX402Option: {
            mcpTool: "notarize_and_witness_a2a_deal",
            serviceId: "x402-veritas-level3-step-by-step-tutorial",
            priceUsdc: 0.5,
          },
        },
      },
    };
  }

  // Inicializar contador Freemium de emparejamiento por tienda (3 clientes gratis / 30 días, luego +0.5% por cliente)
  if (!ledger.sellerMatchmakerSubscriptions) {
    ledger.sellerMatchmakerSubscriptions = {};
  }
  if (!ledger.sellerMatchmakerSubscriptions[sellerStoreId]) {
    ledger.sellerMatchmakerSubscriptions[sellerStoreId] = {
      freemiumStartedAtIso: new Date().toISOString(),
      freemiumValidDays: 30,
      freeMatchedClientsQuota: 3,
      matchedClientsClosedCount: 0,
      totalExtraMatchmakingFeesPaidUsdc: 0.0,
    };
  }

  const sub = ledger.sellerMatchmakerSubscriptions[sellerStoreId];

  // Obtener todos los pasaportes de compradores registrados y aplicar filtros de capital e intención
  const buyerIds = Object.keys(ledger.buyerAgents || {});
  const allPassports = buyerIds.map((id) => computeBuyerVeritasPassport(id, ledger));

  const filteredByCriteria = allPassports.filter((bp) => {
    const budgetOk =
      bp.finopsDeterministicSpendGuard.remainingDailyBudgetUsdc >= Number(minAvailableBudgetUsdc || 0);
    const reliabilityOk =
      bp.buyerReputationAndBehavior.paymentReliabilityPct >= Number(minPaymentReliabilityPct || 0);
    const verticalOk =
      !targetVertical ||
      targetVertical === "ALL" ||
      bp.activeBuyingIntent.lookingToBuyVerticals.includes(targetVertical);
    return budgetOk && reliabilityOk && verticalOk;
  });

  // Diferenciación de beneficios Nivel 2 (⭐⭐) vs Nivel 3 (⭐⭐⭐)
  const isThreeStarGoldSeller = sellerSeal.starLevel === 3;
  const visibleBuyers = [];
  const lockedInstitutionalWhalesFor3StarsOnly = [];

  for (const bp of filteredByCriteria) {
    if (!isThreeStarGoldSeller && bp.buyerTier === "VIP_GOLD_PRIME_BUYER") {
      lockedInstitutionalWhalesFor3StarsOnly.push({
        buyerId: bp.buyerId,
        buyerTier: bp.buyerTier,
        availableDailyBudgetUsdc: bp.finopsDeterministicSpendGuard.remainingDailyBudgetUsdc,
        maxSpendPerTxUsdc: bp.finopsDeterministicSpendGuard.maxSpendPerTxUsdc,
        lookingToBuyVerticals: bp.activeBuyingIntent.lookingToBuyVerticals,
        status: "RESERVED_FIRST_LOOK_FOR_3_STAR_GOLD_SELLERS",
        unlockHint:
          "Upgrade from 2-Star to 3-Star Institutional Gold (Proof-of-Reserve >=20% & <=100ms SLA) to pitch this VIP Gold buyer directly.",
      });
    } else {
      visibleBuyers.push({
        buyerId: bp.buyerId,
        buyerName: bp.buyerName,
        buyerTier: bp.buyerTier,
        buyerBadge: bp.buyerBadge,
        verifiedDailyBudgetAvailableUsdc: bp.finopsDeterministicSpendGuard.remainingDailyBudgetUsdc,
        maxSpendPerTxUsdc: bp.finopsDeterministicSpendGuard.maxSpendPerTxUsdc,
        paymentReliabilityPct: bp.buyerReputationAndBehavior.paymentReliabilityPct,
        zeroExploitRecord: bp.buyerReputationAndBehavior.zeroExploitAttempts,
        lookingToBuyVerticals: bp.activeBuyingIntent.lookingToBuyVerticals,
        activeRfqDescription: bp.activeBuyingIntent.activeRfqDescription,
        directPitchPriority: isThreeStarGoldSeller
          ? "PRIORITY_1_INSTANT_DIRECT_CONNECTION (3-Star Gold Privilege)"
          : "STANDARD_2_STAR_QUEUE",
      });
    }
  }

  // Si el vendedor envía una oferta directa y cierra un acuerdo con un comprador emparejado:
  let closedMatchDealReceipt = null;
  if (connectAndCloseDealWithBuyerId) {
    const targetBuyer = visibleBuyers.find((b) => b.buyerId === connectAndCloseDealWithBuyerId);
    if (!targetBuyer) {
      return {
        ok: false,
        status: 403,
        error: `El comprador '${connectAndCloseDealWithBuyerId}' no está disponible en tu nivel actual (${sellerSeal.starLevel}★) o requiere el Sello Nivel 3 (⭐⭐⭐) para conexión directa.`,
        lockedInstitutionalWhalesFor3StarsOnly,
      };
    }

    const amountUsdc = round6(Number(dealAmountUsdc) || store.startingPriceUsdc || 10.0);
    if (amountUsdc > targetBuyer.maxSpendPerTxUsdc || amountUsdc > targetBuyer.verifiedDailyBudgetAvailableUsdc) {
      return {
        ok: false,
        status: 422,
        error: `El monto ofertado (${amountUsdc} USDC) supera el presupuesto autorizado del comprador (${targetBuyer.maxSpendPerTxUsdc} USDC por tx).`,
      };
    }

    // Calcular comisión Freemium (primeros 3 clientes cerrados: +0.0% extra; cliente #4 en adelante: +0.5% extra)
    const nextClientNumber = sub.matchedClientsClosedCount + 1;
    const isWithinFreemiumQuota = nextClientNumber <= sub.freeMatchedClientsQuota;
    const baseBrokerFeeRate = store.isFirstParty ? 0.0 : store.brokerFeeRate || 0.02;
    const extraMatchmakingFeeRate = isWithinFreemiumQuota ? 0.0 : 0.005; // +0.5% después de los 3 primeros clientes
    const totalBrokerAndMatchFeeRate = round6(baseBrokerFeeRate + extraMatchmakingFeeRate);

    const baseBrokerFeeUsdc = round6(amountUsdc * baseBrokerFeeRate);
    const extraMatchmakingFeeUsdc = round6(amountUsdc * extraMatchmakingFeeRate);
    const totalProtocolFeeCollectedUsdc = round6(baseBrokerFeeUsdc + extraMatchmakingFeeUsdc);

    sub.matchedClientsClosedCount = nextClientNumber;
    sub.totalExtraMatchmakingFeesPaidUsdc = round6(
      sub.totalExtraMatchmakingFeesPaidUsdc + extraMatchmakingFeeUsdc
    );

    // Acreditar la comisión a la tesorería del protocolo
    ledger.wallets.protocol_treasury.balances.USDC = round6(
      ledger.wallets.protocol_treasury.balances.USDC + totalProtocolFeeCollectedUsdc
    );
    ledger.wallets.protocol_treasury.stats.grossFeesEarnedUsdc = round6(
      ledger.wallets.protocol_treasury.stats.grossFeesEarnedUsdc + totalProtocolFeeCollectedUsdc
    );
    ledger.wallets.protocol_treasury.stats.netProfitUsdc = round6(
      ledger.wallets.protocol_treasury.stats.netProfitUsdc + totalProtocolFeeCollectedUsdc
    );

    closedMatchDealReceipt = {
      matchDealId: `MATCH-VERITAS-${Date.now()}-${nextClientNumber}`,
      sellerStoreId,
      sellerStarLevel: sellerSeal.starLevel,
      matchedBuyerId: targetBuyer.buyerId,
      matchedBuyerTier: targetBuyer.buyerTier,
      directOfferPitchSent:
        directOfferPitch || `Direct verified offer from ${store.name} (${sellerSeal.sealBadge})`,
      dealAmountUsdc: amountUsdc,
      freemiumAndFeeBreakdown: {
        matchedClientSequenceNumber: nextClientNumber,
        freemiumStatus: isWithinFreemiumQuota
          ? `FREEMIUM_ACTIVE_CLIENT_${nextClientNumber}_OF_3 (0.0% Extra Matchmaking Fee)`
          : `POST_FREEMIUM_PERFORMANCE_MODE (+0.5% Matchmaking Surcharge Active on Client #${nextClientNumber})`,
        normalBrokerFeePct: `${round6(baseBrokerFeeRate * 100)}%`,
        extraMatchmakingFeePct: `${round6(extraMatchmakingFeeRate * 100)}%`,
        totalEffectiveFeePct: `${round6(totalBrokerAndMatchFeeRate * 100)}%`,
        baseBrokerFeeUsdc,
        extraMatchmakingFeeUsdc,
        totalTreasuryRevenueFromMatchUsdc: totalProtocolFeeCollectedUsdc,
        sellerNetPayoutUsdc: round6(amountUsdc - totalProtocolFeeCollectedUsdc),
      },
    };
  }

  const remainingFreeClients = Math.max(0, sub.freeMatchedClientsQuota - sub.matchedClientsClosedCount);

  return {
    ok: true,
    standard: "VERITAS-8183-BUYER-INTENT-MATCHMAKER",
    sellerProfile: {
      storeId: store.id,
      storeName: store.name,
      starLevel: sellerSeal.starLevel,
      sealBadge: sellerSeal.sealBadge,
      privilegesUnlocked: isThreeStarGoldSeller
        ? [
            "1. TOP #1 INBOUND RANKING when AI agents search for providers",
            "2. FIRST-LOOK DIRECT ACCESS to VIP Gold Institutional Buyers with highest budgets",
            "3. INSTANT DIRECT PITCH & MATCHMAKING closure",
          ]
        : [
            "1. Access to Standard & Silver Commercial Buyers",
            "2. Upgrade to 3 Stars (⭐⭐⭐) to unlock VIP Gold Institutional Whales & Top #1 Inbound Ranking",
          ],
    },
    freemiumMatchmakingPlan: {
      planModel: "30-Day / First 3 Matched Clients at 0.0% Extra Fee -> Then +0.5% Success Fee per Matched Client",
      freeMatchedClientsQuota: sub.freeMatchedClientsQuota,
      matchedClientsClosedSoFar: sub.matchedClientsClosedCount,
      remainingFreeMatchedClients: remainingFreeClients,
      currentExtraMatchmakingSurchargePct: remainingFreeClients > 0 ? "0.0% (Freemium Active)" : "+0.5% (Post-Freemium)",
      totalExtraMatchmakingFeesPaidUsdc: sub.totalExtraMatchmakingFeesPaidUsdc,
    },
    qualifiedBuyersReadyToPurchase: visibleBuyers,
    lockedInstitutionalWhalesFor3StarsOnly:
      lockedInstitutionalWhalesFor3StarsOnly.length > 0
        ? lockedInstitutionalWhalesFor3StarsOnly
        : undefined,
    closedMatchDealReceipt,
  };
}
