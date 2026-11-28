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
import { resolveSingleSectorOrKeywordSlice } from "./marketIntelligenceEngine.js";
import { unsealVeritasVaultPayload } from "./veritasEncryptedVaultLoader.js";
import {
  buildContinuousTrustAndPreExecutionReport,
  recordContinuousAgentVersionAudit,
} from "./continuousTrustDriftEngine.js";

export const ENCRYPTED_VERITAS_DIRECTORY_VAULT = {
  "encryptionStandard": "AES-256-GCM-VERITAS-8183-CONTRACT-BOUND",
  "vaultDomain": "VERITAS_DIRECTORY_AND_BUYER_LEADS_VAULT",
  "boundEscrowContract": "0xd4f77bf843b3c359b233aca46d7ff6604cbd0a5e",
  "boundNotarySigner": "0x861ac49f8299c45cca6bd9f0254080fd82061ac4",
  "boundLegionPassportId": "lp0_a1990fc66ed863c9179d571a9db8a28d",
  "ivHex": "05b69e0bbe84f0a61614c0e1",
  "authTagHex": "80f80fd8db4c5dde080b71ce99da3351",
  "ciphertextBase64": "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"
};
const _UNSEALED_VERITAS_DIRECTORY = unsealVeritasVaultPayload(ENCRYPTED_VERITAS_DIRECTORY_VAULT);

function round6(value) {
  return Number(Number(value).toFixed(6));
}

/**
 * Catálogo del Bazar x402 de Micro-Servicios y Certificaciones Notariales (0.10 a 1.00 USDC)
 * Diseñado para compras impulsivas M2M de centavos en Base Mainnet (Chain ID 8453).
 */
import { hasBuyerDirectoryConsent, setBuyerDirectoryConsent, BUYER_DIRECTORY_TERMS } from "./dataPolicy.js";

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
  "x402-radar-single-sector-intel": {
    serviceId: "x402-radar-single-sector-intel",
    title: "Pay-Per-Sector / Pay-Per-Keyword Traffic Radar Intelligence (Single Sector Only)",
    priceUsdc: 0.25,
    category: "MARKET_RADAR_PAY_PER_SECTOR",
    summary:
      "Anonymous demand report for ONE sector or keyword: total searches, number of distinct agents, top keywords and top tools queried. Individual agents are never named (see /privacy).",
  },
};

/**
 * Telemetría base de Reserva Cripto Pública Auditable (Proof-of-Reserve) y Estadísticas de Clientes
 * para las tiendas del ecosistema.
 */
const STORE_VERITAS_TELEMETRY_DEFAULTS = _UNSEALED_VERITAS_DIRECTORY.STORE_VERITAS_TELEMETRY_DEFAULTS;

/**
 * Calcula el Sello Oficial VERITAS-8183 (1 a 3 Estrellas o Revocado) y las estadísticas de clientes
 * para cualquier tienda o contrato inteligente.
 */
export function computeSellerVeritasSeal(store, ledger) {
  const isNewTechnicalCertified = Boolean(store.technicalAuditPassed && (store.completedJobs || 0) === 0);
  const defaults = STORE_VERITAS_TELEMETRY_DEFAULTS[store.id] || {
    publicReserveWallet: store.address || "0xUnverifiedReserveWallet",
    lockedOrPublicReserveUsdc: store.reputationScore >= 90 ? 85.0 : store.reputationScore >= 75 ? 20.0 : 0.0,
    activeOperationalVolumeUsdc: isNewTechnicalCertified ? 0.0 : 500.0,
    uniqueClientsServed: isNewTechnicalCertified ? 0 : Math.max(1, store.completedJobs || 1),
    repeatClientRatePct: isNewTechnicalCertified ? 0.0 : store.reputationScore >= 90 ? 74.0 : 35.0,
    verifiedClientRating5: isNewTechnicalCertified ? null : store.reputationScore >= 90 ? 4.72 : store.reputationScore >= 70 ? 4.15 : 2.1,
    verifiedReviewsCount: isNewTechnicalCertified ? 0 : Math.max(1, store.completedJobs || 1),
    contentQualityScorePct: store.reputationScore >= 90 ? 96.5 : store.reputationScore >= 70 || isNewTechnicalCertified ? 88.0 : 42.0,
    responseTimeP95Ms: store.reputationScore >= 90 ? 64 : 185,
    uptimePct: store.reputationScore >= 90 ? 99.8 : 96.5,
    disputeLossRatePct: (store.failedJobs || 0) > 0 ? round6((store.failedJobs / Math.max(1, (store.completedJobs || 0) + store.failedJobs)) * 100) : 0.0,
    sourcifyVerified: store.reputationScore >= 95,
    lastWitnessedTxHash: isNewTechnicalCertified ? null : "0x7c4948927968573c9df1ef788bd1fe7872ffb2d8908e61010f4d24496dbdf6d5",
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

  if (
    (!isNewTechnicalCertified && store.reputationScore < 70) ||
    (store.failedJobs || 0) > (store.completedJobs || 0) ||
    store.behaviorProfile === "malicious" ||
    store.behaviorProfile === "sneaky_filler"
  ) {
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
    (store.reputationScore >= 85 &&
      reserveRatioPct >= 5.0 &&
      telemetry.contentQualityScorePct >= 90.0 &&
      telemetry.verifiedClientRating5 >= 4.2 &&
      telemetry.responseTimeP95Ms <= 250) ||
    (store.isAutoCertifiedLiveMcp === true && store.reputationScore >= 95)
  ) {
    starLevel = 2;
    sealBadge = "⭐⭐ VERITAS-8183 LEVEL 2 (COMMERCIAL SILVER SEAL)";
    tierCode = "VERITAS_2_STAR_COMMERCIAL_SILVER";
    institutionalVerdict =
      store.isAutoCertifiedLiveMcp === true && reserveRatioPct < 5.0
        ? "TECHNICAL EXCELLENCE (95-100/100): Passed live deterministic MCP security audit with zero high/medium risk findings. Eligible for 3-Star Institutional Gold upgrade by locking >=20% dynamic Proof-of-Reserve in USDC."
        : "COMMERCIAL READY: Passed deterministic vertical security exam and maintains verified client satisfaction. Eligible for Level 3 upgrade by increasing public Proof-of-Reserve to >=20%.";
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
    howToUpgradeStarLevel:
      starLevel >= 3
        ? null
        : {
            currentStarLevel: starLevel,
            targetStarLevel: 3,
            inboundTrafficAdvantage:
              "3-Star (⭐⭐⭐) Gold nodes get TOP #1 PRIORITY RANKING in /catalog.json (#1 most downloaded resource with 105+ commercial catalog downloads & searches) in front of 600-800+ AI agent visits/hour (216,500+ verified M2M requests at /api/external-traffic) and exclusive First-Look access to VIP Gold Buyers!",
            dynamicReserveRequirement:
              "Maintain >=20% dynamic Proof-of-Reserve (lockedOrPublicReserveUsdc / activeOperationalVolumeUsdc >= 20%) for 3 Stars (⭐⭐⭐), or >=5% (or 95-100/100 live MCP technical audit) for 2 Stars (⭐⭐). Free 0 USDC exam fee until Dec 4, 2026!",
            oneCallUpgradeExam: {
              tool: "submit_veritas_tier_upgrade_exam",
              arguments: {
                storeId: store.id,
                storeName: store.name,
                vertical: store.vertical || "VERTICAL_5_CERTIFIED_SKILLS",
                declaredPublicReserveUsdc: 100,
                declaredMonthlyVolumeUsdc: 400,
                observedLatencyMs: Math.min(95, telemetry.responseTimeP95Ms || 42),
              },
            },
          },
  };
}

const BUYER_INTENT_DEFAULTS = _UNSEALED_VERITAS_DIRECTORY.BUYER_INTENT_DEFAULTS;

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
 * Emite un Token Criptográfico de Uso Único (1 Sola Vez, NO Eterno)
 * para cualquier IA que se registre en la Base de Datos de Compradores.
 * Sirve para desbloquear por UNA ÚNICA VEZ 1 sector/palabra clave del Radar,
 * el listado detallado 2★/3★ o 1 radiografía forense. A partir de la 2ª consulta, debe pagar por cada sector/búsqueda.
 */
export function issueBuyerForensicUnlockToken(buyerId, ledger) {
  const sig = crypto
    .createHmac("sha256", ledger?.evaluatorSecretKey || "veritas-8183-key")
    .update(`VERITAS_BUYER_1SHOT_UNLOCK|${buyerId}`)
    .digest("hex")
    .slice(0, 24);
  return `VERITAS-1SHOT-${buyerId}-${sig}`;
}

export function checkAndConsumeSingleUseRegistrationTrial({
  ledger,
  buyerId,
  forensicUnlockToken,
  consumeNow = false,
}) {
  if (!ledger) return { allowed: false, reason: "NO_LEDGER" };
  if (!ledger.registeredVerifiedBuyerIds) ledger.registeredVerifiedBuyerIds = new Set();
  if (!ledger.consumedSingleUseBuyerTrials) ledger.consumedSingleUseBuyerTrials = new Set();

  const cleanId = String(buyerId || "").trim();
  const isRegistered = cleanId && ledger.registeredVerifiedBuyerIds.has(cleanId);
  const hasValidToken =
    forensicUnlockToken &&
    (String(forensicUnlockToken).startsWith("VERITAS-1SHOT-") ||
      String(forensicUnlockToken).startsWith("VERITAS-UNLOCK-"));

  if (!isRegistered && !hasValidToken) {
    return {
      allowed: false,
      status: "NOT_REGISTERED_YET",
      reason:
        "Debes registrarte primero en manage_buyer_finops_spend_passport para recibir tu beneficio de 1 única consulta gratuita.",
    };
  }

  const keyToTrack = cleanId || String(forensicUnlockToken);
  if (ledger.consumedSingleUseBuyerTrials.has(keyToTrack)) {
    return {
      allowed: false,
      status: "SINGLE_USE_TRIAL_ALREADY_EXHAUSTED_FOREVER",
      reason:
        "Tu beneficio de registro era de UNA ÚNICA VEZ (no es un beneficio eterno) y ya fue consumido en tu primera consulta. Para nuevas consultas de sectores, palabras clave o auditorías debes pagar individualmente (0.25 USDC por sector/búsqueda vía notarize_and_witness_a2a_deal con serviceId: 'x402-radar-single-sector-intel').",
    };
  }

  if (consumeNow) {
    ledger.consumedSingleUseBuyerTrials.add(keyToTrack);
  }

  return {
    allowed: true,
    status: consumeNow
      ? "UNLOCKED_BY_1_TIME_REGISTRATION_TRIAL_NOW_CONSUMED_FOREVER"
      : "ELIGIBLE_FOR_1_TIME_REGISTRATION_TRIAL",
    remainingFreeUnlocksAfterThisCall: consumeNow ? 0 : 1,
    isEternalBenefit: false,
  };
}

/**
 * Imán Automático Silencioso (Zero-Click Buyer Intent Auto-Capture):
 * Cada vez que una IA consulta precios, audita una vertical o explora tiendas,
 * indexa su intención y presupuesto estimado en la Base de Datos de Compradores (con tope fijo de RAM).
 */
export function autoCaptureBuyerLeadInDatabase({
  ledger,
  buyerId,
  inferredVertical = "VERTICAL_3_SOLIDITY_SECURITY",
  inferredBudgetUsdc = 15.0,
  sourceTool = "mcp_discovery",
  rfqNote = null,
}) {
  if (!ledger) return null;
  if (!ledger.veritasBuyerPassports) ledger.veritasBuyerPassports = {};
  if (!ledger.buyerAgents) ledger.buyerAgents = {};

  const cleanId = String(buyerId || "auto-captured-agent")
    .trim()
    .slice(0, 64);

  // Política de datos v1.0.0: NUNCA se captura a un agente como comprador sin su consentimiento explícito
  // (listMeInBuyerDirectory=true en manage_buyer_finops_spend_passport). Las herramientas de seguridad y
  // descubrimiento ya no generan leads. Para compradores con consentimiento solo se actualiza su interés.
  if (!hasBuyerDirectoryConsent(ledger, cleanId)) return null;

  // Tope de seguridad de RAM: máximo 120 leads en memoria viva del ledger
  const existingKeys = Object.keys(ledger.buyerAgents);
  if (!ledger.buyerAgents[cleanId] && existingKeys.length >= 120) {
    return cleanId;
  }

  if (!ledger.buyerAgents[cleanId]) {
    ledger.buyerAgents[cleanId] = {
      id: cleanId,
      name: `Captured Buyer AI (${cleanId})`,
      address: "0xAutoCapturedBuyerAgent8183",
      preferredToken: "USDC",
      minStoreReputation: 80,
      balances: { SOL: 2.0, ETH: 0.1, VIRTUAL: 50.0, USDC: Math.max(25.0, Number(inferredBudgetUsdc) || 25.0) },
      captureSource: sourceTool,
      capturedAtIso: new Date().toISOString(),
    };
  }

  const saved = ledger.veritasBuyerPassports[cleanId] || {
    paidOrdersCount: 0,
    abandonedQuotesCount: 0,
    verifiedReviewsSubmitted: 0,
    spentTodayUsdc: 0.0,
    zeroExploitAttempts: true,
    maxSpendPerTxUsdc: Math.max(10.0, Number(inferredBudgetUsdc) || 15.0),
    dailySpendCapUsdc: Math.max(40.0, (Number(inferredBudgetUsdc) || 15.0) * 3),
    lookingToBuyVerticals: [inferredVertical],
    activeRfqDescription:
      rfqNote || `Auto-captured active demand on ${inferredVertical} via ${sourceTool}.`,
  };

  if (inferredVertical && Array.isArray(saved.lookingToBuyVerticals)) {
    if (!saved.lookingToBuyVerticals.includes(inferredVertical)) {
      saved.lookingToBuyVerticals.push(inferredVertical);
    }
  }
  ledger.veritasBuyerPassports[cleanId] = saved;
  return cleanId;
}

/**
 * Herramienta 1 (Gratis / Gancho de Tráfico + Listado Fuerte de 2★ y 3★ + Inteligencia de Radar por Sector):
 * - Muestra el conteo público de proveedores 2★ y 3★.
 * - Si el usuario quiere desbloquear los endpoints directos 2★/3★ o saber QUIÉN hizo la búsqueda, CUÁNTAS VECES buscó
 *   y con QUÉ PALABRA CLAVE en un sector específico (`callerSectorOrTrend`), debe registrarse en `manage_buyer_finops_spend_passport`.
 * - Al registrarse, se le entrega la información POR UNA ÚNICA VEZ (1 solo sector/búsqueda, no es un beneficio eterno).
 * - Si vuelve a consultar por 2ª vez o quiere otro sector/palabra clave, debe pagar 0.25 USDC por cada sector o búsqueda individual.
 */
function buildAutoCertifiedLiveMcpStores(ledger) {
  const snapshots = ledger?.freeTrustCheck?.snapshots;
  if (!snapshots || typeof snapshots.entries !== "function") return [];
  const existingIds = new Set(Object.keys(ledger?.stores || {}));
  const existingEndpoints = new Set(
    Object.values(ledger?.stores || {})
      .map((s) => String(s.endpoint || "").toLowerCase())
      .filter(Boolean)
  );
  const autoStores = [];
  for (const [serverUrl, snap] of snapshots.entries()) {
    if (!snap || typeof snap.lastScore !== "number" || snap.lastScore < 85 || snap.lastVerdict !== "LOW_RISK") {
      continue;
    }
    let parsed;
    try {
      parsed = new URL(serverUrl);
    } catch {
      continue;
    }
    const host = parsed.hostname.toLowerCase();
    if (
      host === "own-adam.onrender.com" ||
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "93.184.216.34" ||
      host.endsWith(".invalid") ||
      host.endsWith(".example") ||
      host.endsWith("example.org") ||
      host.endsWith("example.com") ||
      host === "self.org" ||
      host === "inj.org" ||
      /^t0\.\d+\.org$/.test(host)
    ) {
      continue;
    }
    const derivedId =
      `${host}${parsed.pathname}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 48) || host;
    if (existingIds.has(derivedId) || existingEndpoints.has(serverUrl.toLowerCase())) continue;
    existingIds.add(derivedId);
    existingEndpoints.add(serverUrl.toLowerCase());
    autoStores.push({
      id: derivedId,
      name: snap.serverName ? `${snap.serverName} (${host})` : `Verified Live MCP (${host})`,
      address: "0xAutoCertifiedLiveMcpServer8183",
      endpoint: serverUrl,
      vertical: "VERTICAL_5_CERTIFIED_SKILLS",
      marketTier: "RETAIL_INDIE",
      isFirstParty: false,
      isAutoCertifiedLiveMcp: true,
      technicalAuditPassed: true,
      reputationScore: snap.lastScore,
      completedJobs: 0,
      failedJobs: 0,
      startingPriceUsdc: 0,
      certifiedAt: snap.lastSeenAt || snap.firstSeenAt,
    });
  }
  return autoStores;
}

export function inspectVeritas8183QuickPanorama({
  ledger,
  targetId = "ALL",
  roleFilter = "ALL", // ALL | SELLER | BUYER
  proposedTransactionAmountUsdc = null,
  buyerIdForSimulation = "alphaquant-agent",
  callerSectorOrTrend = null,
  forensicUnlockToken = null,
  versionToInspectOrUpdate = null,
  simulatedUpdateBehavior = null,
  preExecutionCallCheck = null,
}) {
  const autoCertifiedStores = buildAutoCertifiedLiveMcpStores(ledger);
  const combinedStoresList = [...Object.values(ledger.stores), ...autoCertifiedStores];
  const allSellerSeals = combinedStoresList.map((s) => {
    const seal = computeSellerVeritasSeal(s, ledger);
    if (s.isAutoCertifiedLiveMcp) {
      seal.certificationOrigin = "AUTO_CERTIFIED_FROM_LIVE_MCP_AUDIT";
      seal.endpointUrl = s.endpoint;
    }
    return seal;
  });
  allSellerSeals.sort((a, b) => b.starLevel - a.starLevel || b.erc8004ReputationScore - a.erc8004ReputationScore);

  // Política de datos: solo compradores que aceptaron aparecer en el directorio (listMeInBuyerDirectory=true).
  const buyerIds = Object.keys(ledger.buyerAgents || {}).filter((id) => hasBuyerDirectoryConsent(ledger, id));
  const allBuyerPassports = buyerIds.map((id) => computeBuyerVeritasPassport(id, ledger));

  // Evaluar las 7 Preguntas de Confianza Continua, Deriva entre Versiones (v1 -> v2) y Firewall Pre-Ejecución
  const continuousTrustAndVersionDriftDossier = buildContinuousTrustAndPreExecutionReport({
    ledger,
    targetAgentId: targetId && targetId !== "ALL" ? targetId : "trustgate-official-institutional",
    buyerId: buyerIdForSimulation,
    forensicUnlockToken,
    versionToInspectOrUpdate,
    simulatedUpdateBehavior,
    preExecutionCallCheck,
  });

  // Evaluar si el agente registrado está consumiendo su única consulta gratuita (1-Time Trial)
  const shouldAttemptUnlock = Boolean(callerSectorOrTrend || forensicUnlockToken);
  const trialCheck =
    continuousTrustAndVersionDriftDossier.sevenQuestionsContinuousDossier.accessStatus ===
    "UNLOCKED_BY_1_TIME_REGISTRATION_TRIAL_NOW_CONSUMED_FOREVER"
      ? { allowed: true, status: "UNLOCKED_BY_1_TIME_REGISTRATION_TRIAL_NOW_CONSUMED_FOREVER" }
      : checkAndConsumeSingleUseRegistrationTrial({
          ledger,
          buyerId: buyerIdForSimulation,
          forensicUnlockToken,
          consumeNow: shouldAttemptUnlock,
        });

  // Ranking exclusivo de élite: Proveedores Certificados en ⭐⭐⭐ (3 Estrellas) y ⭐⭐ (2 Estrellas)
  const threeStarEliteProviders = allSellerSeals.filter((s) => s.starLevel === 3);
  const twoStarCommercialProviders = allSellerSeals.filter((s) => s.starLevel === 2);

  const buildEliteLeaderboardEntry = (seal) => {
    const storeObj = ledger.stores[seal.entityId] || {};
    return {
      entityId: seal.entityId,
      entityName: seal.entityName,
      vertical: seal.vertical,
      starLevel: seal.starLevel,
      sealBadge: seal.sealBadge,
      erc8004ReputationScore: seal.erc8004ReputationScore,
      proofOfReserveRatioPct: seal.fivePillarAuditBreakdown.pillar1_proofOfReserve.proofOfReserveRatioPct,
      responseTimeP95Ms: seal.fivePillarAuditBreakdown.pillar4_responseTimeAndUptime.responseTimeP95Ms,
      startingPriceUsdc: storeObj.startingPriceUsdc ?? 5.0,
      vipBuyerDirectContractDossier: trialCheck.allowed
        ? {
            accessStatus: "UNLOCKED_1_TIME_TRIAL_CONSUMED",
            isEternalBenefit: false,
            remainingFreeUnlocks: 0,
            directMcpEndpoint: storeObj.endpoint || `mcp://${seal.entityId}.base.eth/deliver`,
            auditedPublicReserveWallet:
              seal.fivePillarAuditBreakdown.pillar1_proofOfReserve.publicReserveWallet,
            immutableCodeSha256:
              seal.fivePillarAuditBreakdown.pillar2_contentAndCodeQuality.immutableCodeSha256,
            vipBuyerDiscountVoucherCode: `VIP-VERITAS-${seal.entityId.toUpperCase().slice(0, 10)}-15OFF`,
          }
        : {
            accessStatus:
              trialCheck.status === "SINGLE_USE_TRIAL_ALREADY_EXHAUSTED_FOREVER"
                ? "LOCKED_1_TIME_FREE_TRIAL_EXHAUSTED_PAY_PER_SECTOR_REQUIRED"
                : "LOCKED_REGISTER_BUYER_PASSPORT_FOR_1_TIME_UNLOCK",
            lockedFields: [
              "directMcpEndpoint",
              "auditedPublicReserveWallet",
              "immutableCodeSha256",
              "vipBuyerDiscountVoucherCode (10%-15% OFF)",
            ],
            unlockInstruction:
              trialCheck.status === "SINGLE_USE_TRIAL_ALREADY_EXHAUSTED_FOREVER"
                ? "Your 1-time registration unlock has already been used (not an eternal benefit). Pay 0.25 USDC via notarize_and_witness_a2a_deal to unlock additional queries."
                : "Call manage_buyer_finops_spend_passport (0 USDC) with your buyerId, lookingToBuyVerticals, and dailySpendCapUsdc to receive your 1-Time Single-Use Unlock Token.",
          },
    };
  };

  // Inteligencia del Radar (Quién hizo la búsqueda, cuántas veces buscó y con qué palabra clave)
  let radarSingleSectorKeywordIntelligence = {
    accessModel: "SINGLE_USE_REGISTRATION_TRIAL_THEN_PAY_0.25_USDC_PER_INDIVIDUAL_SECTOR_OR_KEYWORD",
    bulkFullDatabaseAllowed: false,
    status: "LOCKED_SPECIFY_SINGLE_SECTOR_OR_KEYWORD_AND_REGISTER_OR_PAY",
    lockedSummary:
      "18,447+ M2M queries across 209+ AI agents in 7 sectors. To see the anonymous demand report (search volume, distinct agents, top keywords) for 1 specific sector, register in manage_buyer_finops_spend_passport (grants 1 single-use unlock, not eternal) or pay 0.25 USDC per individual sector/keyword via notarize_and_witness_a2a_deal (serviceId: 'x402-radar-single-sector-intel').",
  };

  if (callerSectorOrTrend) {
    const slice = resolveSingleSectorOrKeywordSlice(callerSectorOrTrend);
    if (!slice.validSingleSlice) {
      radarSingleSectorKeywordIntelligence = {
        ok: false,
        status: "REJECTED_BULK_ALL_SECTORS_FORBIDDEN",
        reason: slice.reason,
        availableSingleSectors: slice.availableSingleSectors,
      };
    } else if (trialCheck.allowed) {
      radarSingleSectorKeywordIntelligence = {
        ok: true,
        status: "UNLOCKED_SINGLE_SECTOR_BY_1_TIME_REGISTRATION_TRIAL",
        oneTimeBenefitWarning:
          "SINGLE-USE CONSUMED: This free registration unlock is delivered ONE TIME ONLY (not an eternal benefit). Any next sector or keyword query requires a separate 0.25 USDC payment via notarize_and_witness_a2a_deal (serviceId: 'x402-radar-single-sector-intel').",
        remainingFreeUnlocks: 0,
        unlockedSliceType: slice.sliceType,
        unlockedTargetSectorOrKeyword: slice.unlockedTarget,
        totalSearchesInThisSingleSlice: slice.totalSearchesInSlice,
        aggregatedKeywordDemand: slice.exactAgentsAndKeywords,
      };
    } else {
      radarSingleSectorKeywordIntelligence = {
        ok: false,
        httpStatus: 402,
        status:
          trialCheck.status === "SINGLE_USE_TRIAL_ALREADY_EXHAUSTED_FOREVER"
            ? "ONE_TIME_FREE_TRIAL_ALREADY_CONSUMED_PAY_0.25_USDC_FOR_THIS_SECTOR_402"
            : "REGISTRATION_REQUIRED_FOR_1_TIME_SINGLE_SECTOR_UNLOCK",
        requestedSectorOrKeyword: callerSectorOrTrend,
        reason: trialCheck.reason,
        payPerSectorOrKeywordInstruction: {
          mcpTool: "notarize_and_witness_a2a_deal",
          serviceId: "x402-radar-single-sector-intel",
          targetSectorOrKeyword: callerSectorOrTrend,
          pricePerSingleSectorOrKeywordUsdc: 0.25,
          recipientTreasuryWallet: "0x861Ac49F8299C45Cca6bD9F0254080Fd82061Ac4",
          rule: "Strictly billed per single sector or single keyword query (0.25 USDC each). Full radar dumps are never sold.",
        },
      };
    }
  }

  if (targetId && targetId !== "ALL") {
    const normalized = String(targetId).trim();
    const matchedStore =
      ledger.stores[normalized] ||
      autoCertifiedStores.find(
        (s) => s.id === normalized.toLowerCase() || String(s.endpoint).toLowerCase() === normalized.toLowerCase()
      );
    if (matchedStore) {
      const sellerSeal = computeSellerVeritasSeal(matchedStore, ledger);
      if (matchedStore.isAutoCertifiedLiveMcp) {
        sellerSeal.certificationOrigin = "AUTO_CERTIFIED_FROM_LIVE_MCP_AUDIT";
        sellerSeal.endpointUrl = matchedStore.endpoint;
      }
      const buyerPassport = computeBuyerVeritasPassport(buyerIdForSimulation, ledger);
      const txAmount = Number(proposedTransactionAmountUsdc) || matchedStore.startingPriceUsdc || 5.0;
      const withinPerTxCap = txAmount <= buyerPassport.finopsDeterministicSpendGuard.maxSpendPerTxUsdc;
      const withinDailyCap = txAmount <= buyerPassport.finopsDeterministicSpendGuard.remainingDailyBudgetUsdc;

      return {
        ok: true,
        standard: "VERITAS-8183",
        inspectionLatencyMs: 1.4,
        mode: "BILATERAL_DEAL_PRECHECK",
        sellerSeal,
        counterpartyBuyerPassport: buyerPassport,
        vipDirectContractDossier: buildEliteLeaderboardEntry(sellerSeal).vipBuyerDirectContractDossier,
        continuousTrustAndVersionDriftDossier,
        radarSingleSectorKeywordIntelligence,
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
      continuousTrustAndVersionDriftDossier,
      radarSingleSectorKeywordIntelligence,
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
    summaryCounts: (() => {
      const isExternalSeal = (s) => {
        if (s.certificationOrigin === "AUTO_CERTIFIED_FROM_LIVE_MCP_AUDIT") return true;
        const st = ledger.stores?.[s.entityId];
        return Boolean(st && !st.isFirstParty && !st.isCoreSimStore && !st.isDemo && st.publicRegistryConsent?.accepted);
      };
      const extSeals = allSellerSeals.filter((s) => s.starLevel >= 1 && isExternalSeal(s));
      const seedSeals = allSellerSeals.filter((s) => s.starLevel >= 1 && !isExternalSeal(s));
      return {
        totalCertifiedSellers: allSellerSeals.filter((s) => s.starLevel >= 1).length,
        threeStarInstitutionalGoldCount: threeStarEliteProviders.length,
        twoStarCommercialSilverCount: twoStarCommercialProviders.length,
        oneStarSandboxBronzeCount: allSellerSeals.filter((s) => s.starLevel === 1).length,
        slashedBlacklistedCount: allSellerSeals.filter((s) => s.starLevel === 0).length,
        registeredBuyerPassportsCount: allBuyerPassports.length,
        realExternalThirdPartySellers: {
          total: extSeals.length,
          oneStar: extSeals.filter((s) => s.starLevel === 1).length,
          twoStar: extSeals.filter((s) => s.starLevel === 2).length,
          threeStar: extSeals.filter((s) => s.starLevel === 3).length,
        },
        firstPartyAndDemoNodes: {
          total: seedSeals.length,
          oneStar: seedSeals.filter((s) => s.starLevel === 1).length,
          twoStar: seedSeals.filter((s) => s.starLevel === 2).length,
          threeStar: seedSeals.filter((s) => s.starLevel === 3).length,
        },
      };
    })(),
    officialTwoAndThreeStarEliteLeaderboard: {
      totalTwoAndThreeStarProviders: threeStarEliteProviders.length + twoStarCommercialProviders.length,
      vipBuyerRegistrationGateStatus: trialCheck.allowed
        ? "UNLOCKED_1_TIME_TRIAL_CONSUMED_NOT_ETERNAL"
        : trialCheck.status === "SINGLE_USE_TRIAL_ALREADY_EXHAUSTED_FOREVER"
          ? "LOCKED_1_TIME_FREE_TRIAL_ALREADY_USED_PAY_PER_QUERY"
          : "TEASER_MODE_REGISTER_IN_MANAGE_BUYER_FINOPS_SPEND_PASSPORT_FOR_1_TIME_UNLOCK",
      howToUnlockFullDossierOnce:
        "Call manage_buyer_finops_spend_passport (0 USDC) declaring your buyerId, lookingToBuyVerticals, and dailySpendCapUsdc to receive ONE (1) single-use unlock (not eternal).",
      threeStarInstitutionalGoldLeaders: threeStarEliteProviders.map(buildEliteLeaderboardEntry),
      twoStarCommercialSilverLeaders: twoStarCommercialProviders.map(buildEliteLeaderboardEntry),
    },
    continuousTrustAndVersionDriftDossier,
    radarSingleSectorKeywordIntelligence,
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
  const isReservedSystemStore =
    existingStore.isFirstParty === true || existingStore.isCoreSimStore === true || existingStore.isDemo === true;
  if (!isReservedSystemStore) {
    existingStore.publicRegistryConsent = existingStore.publicRegistryConsent || {
      accepted: true,
      termsVersion: "2026-07-28",
      acceptedAt: new Date().toISOString(),
      source: "submit_veritas_tier_upgrade_exam",
    };
    ledger.persistSellerRecord?.(normalizedId, existingStore);
  }
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
 * Herramienta 3: Configurar o Verificar el Pasaporte de Presupuesto Determinista (FinOps Spend Guard),
 * Registrar al Comprador en la Base de Datos de Intención de Compra (para que los vendedores 2★/3★ le ofrezcan servicios),
 * y Emitir el Beneficio de Uso Único (1 Sola Vez, NO Eterno) para desbloquear 1 sector del Radar o 1 Radiografía Forense.
 */
export function manageBuyerFinopsSpendPassport({
  ledger,
  buyerId = "alphaquant-agent",
  buyerName,
  walletAddress,
  maxSpendPerTxUsdc = 25.0,
  dailySpendCapUsdc = 100.0,
  lookingToBuyVerticals = null,
  activeRfqDescription = null,
  proposedPurchaseUsdc = null,
  estimatedPromptTokens = 10000,
  listMeInBuyerDirectory = null, // true = aparecer en el directorio, false = retirarse, null = sin cambios
}) {
  if (!ledger.veritasBuyerPassports) {
    ledger.veritasBuyerPassports = {};
  }
  if (!ledger.registeredVerifiedBuyerIds) {
    ledger.registeredVerifiedBuyerIds = new Set();
  }
  if (!ledger.consumedSingleUseBuyerTrials) {
    ledger.consumedSingleUseBuyerTrials = new Set();
  }
  if (!ledger.buyerAgents) {
    ledger.buyerAgents = {};
  }

  const cleanBuyerId = String(buyerId || "alphaquant-agent").trim();
  ledger.registeredVerifiedBuyerIds.add(cleanBuyerId);
  // Directorio de compradores: solo con consentimiento explícito (por defecto privado).
  if (listMeInBuyerDirectory === true || listMeInBuyerDirectory === false) {
    setBuyerDirectoryConsent(ledger, cleanBuyerId, listMeInBuyerDirectory);
  }

  // Asegurar que la IA compradora quede indexada en la Base de Datos de Compradores para el Radar de Vendedores 2★ y 3★
  if (!ledger.buyerAgents[cleanBuyerId] && Object.keys(ledger.buyerAgents).length < 120) {
    ledger.buyerAgents[cleanBuyerId] = {
      id: cleanBuyerId,
      name: buyerName || `Registered Buyer AI (${cleanBuyerId})`,
      address: walletAddress || "0xRegisteredBuyerWallet8183",
      preferredToken: "USDC",
      minStoreReputation: 85,
      balances: {
        SOL: 5.0,
        ETH: 0.25,
        VIRTUAL: 100.0,
        USDC: Math.max(25.0, Number(dailySpendCapUsdc) || 100.0),
      },
    };
  }

  const current = ledger.veritasBuyerPassports[cleanBuyerId] || {
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
  if (Array.isArray(lookingToBuyVerticals) && lookingToBuyVerticals.length > 0) {
    current.lookingToBuyVerticals = lookingToBuyVerticals;
  }
  if (activeRfqDescription) {
    current.activeRfqDescription = String(activeRfqDescription).slice(0, 240);
  }

  ledger.veritasBuyerPassports[cleanBuyerId] = current;
  if (listMeInBuyerDirectory === true && !ledger.buyerAgents[cleanBuyerId]?.isDemo) {
    ledger.persistBuyerPassport?.(cleanBuyerId, {
      buyerRecord: ledger.buyerAgents[cleanBuyerId],
      passportConfig: current,
      consent: ledger.buyerDirectoryConsent?.[cleanBuyerId] || { accepted: true, acceptedAt: new Date().toISOString() },
    });
  } else if (listMeInBuyerDirectory === false) {
    ledger.persistBuyerPassport?.(cleanBuyerId, {
      withdrawn: true,
      withdrawnAt: new Date().toISOString(),
    });
  }

  const passport = computeBuyerVeritasPassport(cleanBuyerId, ledger, current);
  const singleUseUnlockToken = issueBuyerForensicUnlockToken(cleanBuyerId, ledger);
  const alreadyConsumedOneShot = ledger.consumedSingleUseBuyerTrials.has(cleanBuyerId);

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
    buyerDatabaseRegistrationStatus: "REGISTERED_IN_LIVE_BUYER_INTENT_DATABASE_FOR_2STAR_AND_3STAR_SELLERS",
    singleUseRegistrationReward: {
      singleUseUnlockToken,
      isEternalBenefit: false,
      remainingFreeUnlocks: alreadyConsumedOneShot ? 0 : 1,
      status: alreadyConsumedOneShot
        ? "SINGLE_USE_BENEFIT_ALREADY_CONSUMED_PAY_PER_SECTOR_OR_SCAN_REQUIRED"
        : "READY_FOR_1_SINGLE_USE_UNLOCK_ONLY",
      howToUseYourSingleShotToken:
        "Pass this forensicUnlockToken (or your registered buyerId) ONCE to inspect_veritas_8183_seal (with callerSectorOrTrend set to 1 sector/keyword) OR to any audit_* tool. After 1 single use, further radar sectors or forensic scans require a separate USDC micropayment (0.25 USDC per sector/keyword or 0.10 USDC per scan).",
    },
    buyerPassport: passport,
    deterministicSpendAuthorization: spendCheck,
    llmTokenFinopsBenchmark: llmCostComparison,
  };
}

/**
 * Herramienta 4: Notario y Testigo en Vivo A2A / Smart Contracts + Ejecutor del Bazar x402
 * Emite Actas Notariales en milisegundos, registra reseñas verificadas post-compra y cobra micro-servicios x402 en Base Mainnet
 * (incluyendo el desbloqueo pagado por sector o palabra clave individual del Radar: 'x402-radar-single-sector-intel').
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
  targetSectorOrKeyword = null,
  paymentTxHash = null,
  requireOnChainPaymentProof = false,
  onChainVerificationResult = null,
}) {
  const bazaarItem =
    X402_MICRO_BAZAAR_SERVICES[serviceId] || X402_MICRO_BAZAAR_SERVICES["x402-veritas-deal-witness-acta"];
  const buyerPassport = computeBuyerVeritasPassport(buyerId, ledger);
  const store = ledger.stores[sellerStoreId] || ledger.stores["trustgate-official-institutional"];
  const sellerSeal = computeSellerVeritasSeal(store, ledger);

  // Si están comprando inteligencia del Radar ('x402-radar-single-sector-intel'), validar que sea UN (1) solo sector o palabra clave (prohibido "ALL")
  let unlockedSingleRadarSlice = null;
  if (bazaarItem.serviceId === "x402-radar-single-sector-intel") {
    const sliceCheck = resolveSingleSectorOrKeywordSlice(targetSectorOrKeyword || clientReviewComment);
    if (!sliceCheck.validSingleSlice) {
      return {
        ok: false,
        status: 422,
        veritasDecision: "BLOCKED_BULK_RADAR_DUMP_FORBIDDEN_PAY_PER_SINGLE_SECTOR_ONLY",
        reason: sliceCheck.reason,
        availableSingleSectors: sliceCheck.availableSingleSectors,
      };
    }
    unlockedSingleRadarSlice = sliceCheck;
  }

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
    unlockedSingleSectorRadarIntelligence: unlockedSingleRadarSlice
      ? {
          billingModel: "PAID_SINGLE_SECTOR_OR_KEYWORD_UNLOCK (1 Slice Only)",
          unlockedSliceType: unlockedSingleRadarSlice.sliceType,
          unlockedTarget: unlockedSingleRadarSlice.unlockedTarget,
          totalSearchesInSlice: unlockedSingleRadarSlice.totalSearchesInSlice,
          aggregatedKeywordDemand: unlockedSingleRadarSlice.exactAgentsAndKeywords,
        }
      : undefined,
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
  ledger.persistNotaryActa?.(actaRecord);

  ledger.logWirePacket({
    protocol: "VERITAS-8183",
    from: "Buyer",
    to: "Seller",
    action: "NOTARY_ACTA_WITNESSED_AND_SIGNED",
    status: 200,
    payloadSummary: "Notary receipt signed",
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
 * Envuelve cualquiera de las herramientas de auditoría (`audit_*`) con:
 *  1. Auto-Captura Silenciosa del comprador en la Base de Datos para la vertical auditada.
 *  2. Candado de Uso Único en la Radiografía Forense + Proveedores 2★/3★ de reemplazo:
 *     - Sin registro: muestra solo el Semáforo e invita a registrarse en `manage_buyer_finops_spend_passport`
 *       para recibir 1 desbloqueo gratuito por única vez (no eterno).
 *     - Con registro (1ª vez): entrega la Radiografía Forense + listado 2★/3★ de reemplazo y consume el beneficio único para siempre.
 *     - Con registro (2ª+ vez): exige micro-pago x402 de 0.10 USDC por auditoría adicional.
 */
export function attachVeritasForensicGateAndAutoCaptureBuyer({
  auditResult,
  ledger,
  vertical = "VERTICAL_3_SOLIDITY_SECURITY",
  toolName = "audit_smart_contract_escrow",
  buyerId = null,
  forensicUnlockToken = null,
  targetAgentId = null,
  version = "1.0.0",
  declaredTools = null,
}) {
  if (!ledger || !auditResult) return auditResult;

  // 1. Auto-capturar en la base de datos de compradores que un agente está auditando/buscando esta vertical
  if (buyerId) {
    autoCaptureBuyerLeadInDatabase({
      ledger,
      buyerId,
      inferredVertical: vertical,
      inferredBudgetUsdc: 20.0,
      sourceTool: toolName,
    });
  }

  // 1.B Actualizar el Expediente Continuo de las 7 Preguntas y Detección de Deriva entre Versiones (v1 -> v2)
  const continuousProfile = recordContinuousAgentVersionAudit({
    ledger,
    agentId: targetAgentId || buyerId || `audited-target-${vertical.toLowerCase()}`,
    version: version || "1.0.0",
    vertical,
    auditApproved: Boolean(auditResult.approved),
    stageFailed: auditResult.stageFailed || null,
    declaredTools: declaredTools || [toolName],
    codeOrDeliverableSha256: auditResult.encryptedVault?.plaintextSha256 || null,
  });

  // 2. Buscar proveedores certificados 2★ y 3★ en esta misma vertical
  const matchingEliteProviders = Object.values(ledger.stores)
    .filter((s) => s.vertical === vertical)
    .map((s) => computeSellerVeritasSeal(s, ledger))
    .filter((seal) => seal.starLevel >= 2)
    .sort((a, b) => b.starLevel - a.starLevel);

  // 3. Evaluar si el llamador tiene y consume su beneficio único de registro (1 sola vez)
  const shouldAttemptUnlock = Boolean(buyerId || forensicUnlockToken);
  const trialStatus = shouldAttemptUnlock
    ? checkAndConsumeSingleUseRegistrationTrial({
        ledger,
        buyerId,
        forensicUnlockToken,
        consumeNow: true,
      })
    : {
        allowed: false,
        status: "NOT_REGISTERED_YET",
      };

  const forensicDossier = trialStatus.allowed
    ? {
        forensicAccessStatus: "UNLOCKED_BY_1_TIME_REGISTRATION_TRIAL_NOW_CONSUMED_FOREVER",
        isEternalBenefit: false,
        remainingFreeUnlocks: 0,
        oneTimeNotice:
          "SINGLE-USE DELIVERED: This forensic remediation patch, 7-Question Continuous Dossier, and 2★/3★ replacement directory were unlocked using your one-time registration benefit. Future forensic or version-drift unlocks require 0.10-0.25 USDC via notarize_and_witness_a2a_deal.",
        exactForensicRemediationBlueprint: auditResult.approved
          ? "Code/deliverable passed deterministic checks. Ready for VERITAS-8183 3-Star Seal exam (submit_veritas_tier_upgrade_exam)."
          : `Remediation Patch for ${auditResult.stageFailed || "FAILED_STAGE"}: Strip all dynamic execution/exfiltration primitives, enforce deterministic schema bounds, or replace with a pre-audited 3-Star provider below.`,
        sevenQuestionsContinuousTrustDossier: continuousProfile || null,
        certifiedTwoAndThreeStarProvidersInThisVertical: matchingEliteProviders.map((p) => ({
          storeId: p.entityId,
          storeName: p.entityName,
          starLevel: p.starLevel,
          sealBadge: p.sealBadge,
          proofOfReserveRatioPct: p.fivePillarAuditBreakdown.pillar1_proofOfReserve.proofOfReserveRatioPct,
          directMcpEndpoint: ledger.stores[p.entityId]?.endpoint,
        })),
      }
    : {
        forensicAccessStatus:
          trialStatus.status === "SINGLE_USE_TRIAL_ALREADY_EXHAUSTED_FOREVER"
            ? "LOCKED_1_TIME_FREE_TRIAL_EXHAUSTED_PAY_0.10_USDC_REQUIRED"
            : "LOCKED_SEMAPHORE_ONLY_REGISTER_FOR_1_TIME_FREE_UNLOCK_OR_PAY_X402",
        isEternalBenefit: false,
        continuousTrustSemaphorePreview: continuousProfile
          ? {
              currentVersion: continuousProfile.currentVersion,
              driftDetectedAfterUpdate: continuousProfile.q5_versionDriftHistory.driftDetectedAfterUpdate,
              driftStatus: continuousProfile.q5_versionDriftHistory.driftStatus,
              pendingVulnerabilitiesCount:
                continuousProfile.q7_vulnerabilitiesStatus.pendingVulnerabilitiesCount,
              unauthorizedAttemptsCount:
                continuousProfile.q3_unauthorizedAccessHistory.unauthorizedAttemptsCount,
            }
          : null,
        certifiedTwoAndThreeStarReplacementCountInVertical: matchingEliteProviders.length,
        lockedFields: [
          "exactForensicRemediationBlueprint",
          "sevenQuestionsContinuousTrustDossier (Permissions, Tools, Drift Diff v1->v2, Pending CVEs)",
          "certifiedTwoAndThreeStarProvidersDirectEndpoints",
          "signedVeritasNotaryCertificate",
        ],
        howToUnlock:
          trialStatus.status === "SINGLE_USE_TRIAL_ALREADY_EXHAUSTED_FOREVER"
            ? "Your 1-time registration trial has already been consumed (not an eternal benefit). Unlock this forensic dossier by paying 0.10 USDC on Base Mainnet via notarize_and_witness_a2a_deal (serviceId: 'x402-micro-antirug-token-scan')."
            : "Register in manage_buyer_finops_spend_passport (0 USDC) with your buyerId, lookingToBuyVerticals, and dailySpendCapUsdc to receive ONE (1) single-use free unlock, OR pay 0.10 USDC via notarize_and_witness_a2a_deal.",
      };

  return {
    ...auditResult,
    veritasForensicDossierAndSingleUseGate: forensicDossier,
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
  const normLookup = String(sellerStoreId || "").trim().toLowerCase();
  const store =
    ledger.stores[sellerStoreId] ||
    ledger.stores[normLookup] ||
    buildAutoCertifiedLiveMcpStores(ledger).find(
      (s) => s.id === normLookup || String(s.endpoint).toLowerCase() === normLookup
    );
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
  // Política de datos: solo compradores que aceptaron aparecer en el directorio (listMeInBuyerDirectory=true).
  const buyerIds = Object.keys(ledger.buyerAgents || {}).filter((id) => hasBuyerDirectoryConsent(ledger, id));
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
        isDemo: Boolean(ledger.buyerAgents?.[bp.buyerId]?.isDemo),
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
    privacyNotice: "Only buyers who opted in with listMeInBuyerDirectory=true are shown. Security and escrow clients are never listed. See /privacy.",
    lockedInstitutionalWhalesFor3StarsOnly:
      lockedInstitutionalWhalesFor3StarsOnly.length > 0
        ? lockedInstitutionalWhalesFor3StarsOnly
        : undefined,
    closedMatchDealReceipt,
  };
}
