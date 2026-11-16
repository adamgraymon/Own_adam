/**
 * Módulo 3 (Edición 100% M2M): Contrato Inteligente Escrow (ERC-8183) + Registro ERC-8004 / EAS
 * Optimizado para tráfico autónomo Agente-a-Agente sin formularios humanos.
 */

import crypto from "node:crypto";
import { quoteSwapAndEscrow, ECONOMIC_RULES } from "./swapRouter.js";
import { encryptDeliverable, auditEncryptedDataset } from "./auditorEngine.js";
import { initOrLoadAgentWallets } from "./agentWalletManager.js";
import {
  PREMIUM_CATALOG_STORES,
  CURATED_FIRST_PARTY_CATALOG,
  executeFirstPartyCatalogPurchase,
  registerAndCertifyExternalStore,
} from "./premiumCatalogBroker.js";
import {
  X402_MICRO_BAZAAR_SERVICES,
  inspectVeritas8183QuickPanorama,
  submitVeritasSellerTierExam,
  manageBuyerFinopsSpendPassport,
  notarizeAndWitnessA2ADealOrBazaarCall,
  matchAndConnectVerifiedBuyers,
} from "./veritas8183NotaryEngine.js";

function round6(n) {
  return Math.round(n * 1e6) / 1e6;
}

export class AgenticEscrowLedger {
  constructor() {
    this.evaluatorSecretKey = crypto.randomBytes(32).toString("hex");
    this.realWallets = initOrLoadAgentWallets();
    this.pendingX402Challenges = new Map();
    this.reset();
  }

  reset() {
    this.pendingX402Challenges.clear();

    // Flota de Agentes Compradores Autónomos (Clientes M2M)
    this.buyerAgents = {
      "alphaquant-agent": {
        id: "alphaquant-agent",
        name: "AlphaQuant-Agent (DeFi Bot)",
        address: "0xBotAlpha...9A21",
        preferredToken: "SOL",
        minStoreReputation: 70, // Filtra tiendas malas automáticamente usando ERC-8004
        balances: { SOL: 12.0, ETH: 0.0, VIRTUAL: 0.0, USDC: 25.0 },
      },
      "growthscout-bot": {
        id: "growthscout-bot",
        name: "GrowthScout-Bot (LeadGen AI)",
        address: "0xBotScout...3F10",
        preferredToken: "VIRTUAL",
        minStoreReputation: 65,
        balances: { SOL: 0.0, ETH: 0.0, VIRTUAL: 450.0, USDC: 20.0 },
      },
      "secaudit-agent": {
        id: "secaudit-agent",
        name: "SecAudit-Agent (Infra Bot)",
        address: "0xBotSec...8D44",
        preferredToken: "ETH",
        minStoreReputation: 75,
        balances: { SOL: 0.0, ETH: 0.65, VIRTUAL: 0.0, USDC: 30.0 },
      },
    };

    // Wallets del Protocolo
    this.wallets = {
      // Alias compatible hacia el primer comprador para pruebas unitarias simples
      buyer_agent: this.buyerAgents["alphaquant-agent"],
      escrow_contract: {
        label: "Smart Contract Escrow (ERC-8183 Vault)",
        address: this.realWallets.escrowContractAddress || "0xEscrow8183...0001",
        balances: { USDC: 0.0 },
      },
      evaluator_signer: {
        label: "Nodo Interventor M2M (Solo Firma Veredictos)",
        address: this.realWallets.evaluatorAddress,
        balances: { USDC: 0.0 },
      },
      protocol_treasury: {
        label: "Tesorería del Nodo (USDC Neto)",
        address: this.realWallets.treasuryAddress,
        balances: { USDC: 0.0 },
        stats: {
          grossFeesEarnedUsdc: 0.0,
          totalGasSpentUsdc: 0.0,
          totalAiTokensSpentUsdc: 0.0,
          netProfitUsdc: 0.0,
          auditsCompleted: 0,
          attacksBlocked: 0,
          x402Handshakes: 0,
          mcpCallsHandled: 0,
        },
      },
    };

    // Registro Público ERC-8004 de Tiendas IA Autónomas (Base + Catálogo Dual v0.6.0)
    const clonedPremiumStores = JSON.parse(JSON.stringify(PREMIUM_CATALOG_STORES));
    this.stores = {
      "dataforge-ai": {
        id: "dataforge-ai",
        name: "DataForge-AI (Honest Node)",
        address: "0xStoreDF...11A0",
        behaviorProfile: "honest",
        endpoint: "mcp://dataforge-ai.eth/deliver",
        vertical: "VERTICAL_1_DATASET",
        marketTier: "INSTITUTIONAL_B2B",
        isCoreSimStore: true,
        isFirstParty: false,
        brokerFeeRate: 0.0,
        startingPriceUsdc: 10.0,
        slaGuarantee: "AES-256-GCM Encrypted CSV + 30-Row Reservoir Sampling",
        usdcBalance: 15.0,
        reputationScore: 92,
        completedJobs: 14,
        failedJobs: 0,
      },
      "deepmetrics-node": {
        id: "deepmetrics-node",
        name: "DeepMetrics-Node (Mostly Honest)",
        address: "0xStoreDM...55B2",
        behaviorProfile: "mostly_honest",
        endpoint: "mcp://deepmetrics.base.eth/deliver",
        vertical: "VERTICAL_1_DATASET",
        marketTier: "INSTITUTIONAL_B2B",
        isCoreSimStore: true,
        isFirstParty: false,
        brokerFeeRate: 0.0,
        startingPriceUsdc: 8.0,
        slaGuarantee: "Standard B2B Dataset Delivery",
        usdcBalance: 10.0,
        reputationScore: 84,
        completedJobs: 9,
        failedJobs: 1,
      },
      "synthbrokers-bot": {
        id: "synthbrokers-bot",
        name: "SynthBrokers-Bot (Lazy Filler AI)",
        address: "0xStoreSB...72E9",
        behaviorProfile: "sneaky_filler",
        endpoint: "mcp://synthbrokers.sol/deliver",
        vertical: "VERTICAL_1_DATASET",
        marketTier: "RETAIL_INDIE",
        isCoreSimStore: true,
        isFirstParty: false,
        brokerFeeRate: 0.0,
        startingPriceUsdc: 5.0,
        slaGuarantee: "Unverified Synthetic Feed",
        usdcBalance: 6.0,
        reputationScore: 72,
        completedJobs: 5,
        failedJobs: 2,
      },
      "shadowscrape-ai": {
        id: "shadowscrape-ai",
        name: "ShadowScrape-AI (Adversarial Bot)",
        address: "0xStoreSS...666F",
        behaviorProfile: "malicious",
        endpoint: "mcp://shadowscrape.onion/deliver",
        vertical: "VERTICAL_1_DATASET",
        marketTier: "RETAIL_INDIE",
        isCoreSimStore: true,
        isFirstParty: false,
        brokerFeeRate: 0.0,
        startingPriceUsdc: 5.0,
        slaGuarantee: "None (High Risk)",
        usdcBalance: 2.0,
        reputationScore: 68,
        completedJobs: 2,
        failedJobs: 2,
      },
      ...clonedPremiumStores,
    };

    this.jobs = [];
    this.attestations = [];
    this.m2mWireLogs = []; // Sniffer en tiempo real de paquetes máquina-a-máquina
    this.jobCounter = 1000;
  }

  logWirePacket({ protocol, from, to, action, status, payloadSummary }) {
    const entry = {
      id: `PKT-${Date.now()}-${Math.floor(Math.random() * 999)}`,
      timestamp: new Date().toISOString(),
      protocol, // "x402", "MCP-JSONRPC", "ERC-8183", "ERC-8004", "EAS"
      from,
      to,
      action,
      status,
      payloadSummary,
    };
    this.m2mWireLogs.unshift(entry);
    if (this.m2mWireLogs.length > 80) {
      this.m2mWireLogs.length = 80;
    }
    return entry;
  }

  /**
   * Descubrimiento M2M (Catálogo Dual v0.6.0):
   * Otras IAs consultan ERC-8004 filtrando tiendas y paquetes por:
   *  - minReputation (ej. 70)
   *  - marketTier ("ALL" | "INSTITUTIONAL_B2B" | "RETAIL_INDIE")
   *  - vertical ("ALL" | "VERTICAL_1_DATASET" ... "VERTICAL_8_DEPIN_GPU")
   *  - maxPriceUsdc (opcional)
   *  - firstPartyOnly (opcional: solo paquetes oficiales con 100% margen)
   */
  discoverStoresErc8004({
    minReputation = 0,
    marketTier = null,
    vertical = null,
    maxPriceUsdc = null,
    firstPartyOnly = false,
  } = {}) {
    const allStores = Object.values(this.stores);
    const hasCatalogFilter =
      (marketTier && String(marketTier).toUpperCase() !== "ALL") ||
      (vertical && String(vertical).toUpperCase() !== "ALL") ||
      (maxPriceUsdc !== null && maxPriceUsdc !== undefined) ||
      Boolean(firstPartyOnly);

    const tierNorm = String(marketTier || "ALL").toUpperCase();
    const vertNorm = String(vertical || "ALL").toUpperCase();

    const matchesTierAndVertical = (s) => {
      if (!hasCatalogFilter && !s.isCoreSimStore && !s.certifiedAt) return false;
      if (tierNorm !== "ALL" && s.marketTier && s.marketTier !== tierNorm) return false;
      if (vertNorm !== "ALL" && s.vertical && s.vertical !== vertNorm) return false;
      if (maxPriceUsdc !== null && maxPriceUsdc !== undefined && Number(maxPriceUsdc) > 0) {
        if ((s.startingPriceUsdc ?? 0) > Number(maxPriceUsdc)) return false;
      }
      if (firstPartyOnly && !s.isFirstParty) return false;
      return true;
    };

    const eligible = allStores
      .filter((s) => s.reputationScore >= minReputation && matchesTierAndVertical(s))
      .sort((a, b) => b.reputationScore - a.reputationScore);
    const blacklisted = allStores.filter(
      (s) => (hasCatalogFilter || s.isCoreSimStore) && s.reputationScore < minReputation
    );

    const verifiedCatalogPartners = allStores
      .filter((s) => !s.isCoreSimStore && s.reputationScore >= minReputation)
      .sort((a, b) => b.reputationScore - a.reputationScore);

    const allFirstPartyItems = Object.values(CURATED_FIRST_PARTY_CATALOG).filter((item) => {
      if (tierNorm !== "ALL" && item.marketTier !== tierNorm) return false;
      if (vertNorm !== "ALL" && item.vertical !== vertNorm) return false;
      if (maxPriceUsdc !== null && maxPriceUsdc !== undefined && Number(maxPriceUsdc) > 0) {
        if (item.priceUsdc > Number(maxPriceUsdc)) return false;
      }
      return true;
    });

    return {
      standard: "ERC-8004-ReputationRegistry-v0.6-DualCatalog",
      filtersApplied: {
        minReputation,
        marketTier: tierNorm,
        vertical: vertNorm,
        maxPriceUsdc: maxPriceUsdc ?? "UNLIMITED",
        firstPartyOnly: Boolean(firstPartyOnly),
      },
      minReputationFilter: minReputation,
      eligibleStores: eligible.map((s) => ({
        storeId: s.id,
        name: s.name,
        address: s.address,
        endpoint: s.endpoint,
        vertical: s.vertical || "VERTICAL_1_DATASET",
        marketTier: s.marketTier || "INSTITUTIONAL_B2B",
        isFirstParty: Boolean(s.isFirstParty),
        brokerFeeRatePct: `${round6((s.brokerFeeRate || 0) * 100)}%`,
        startingPriceUsdc: s.startingPriceUsdc ?? 5.0,
        slaGuarantee: s.slaGuarantee || "ERC-8183 Deterministic Audit",
        reputationScore: s.reputationScore,
        completedJobs: s.completedJobs,
        failedJobs: s.failedJobs,
        nextMcpToolCall: s.isFirstParty
          ? "purchase_firstparty_catalog_item"
          : "open_escrow_job",
      })),
      verifiedCatalogPartners: verifiedCatalogPartners.map((s) => ({
        storeId: s.id,
        name: s.name,
        vertical: s.vertical,
        marketTier: s.marketTier,
        isFirstParty: Boolean(s.isFirstParty),
        brokerFeeRatePct: `${round6((s.brokerFeeRate || 0) * 100)}%`,
        startingPriceUsdc: s.startingPriceUsdc,
        slaGuarantee: s.slaGuarantee,
        reputationScore: s.reputationScore,
      })),
      curatedFirstPartyCatalog: allFirstPartyItems.map((item) => ({
        itemId: item.itemId,
        title: item.title,
        marketTier: item.marketTier,
        vertical: item.vertical,
        priceUsdc: item.priceUsdc,
        targetBuyerProfile: item.targetBuyerProfile,
        summary: item.summary,
        instantPurchaseMcpTool: "purchase_firstparty_catalog_item",
      })),
      externalStoreOnboarding: {
        mcpTool: "register_and_certify_store",
        upfrontFeeUsdc: 0.0,
        requirement: "Must pass live deterministic audit for target vertical",
        brokerReferralCommissionPct: "2.0% + Escrow Fee (1.0%-1.5%) on settled sales only",
      },
      filteredOutCount: blacklisted.length,
      filteredOutStores: blacklisted.map((s) => ({
        storeId: s.id,
        reputationScore: s.reputationScore,
        reason: "BELOW_TRUST_THRESHOLD",
      })),
    };
  }

  /**
   * Compra instantánea de un paquete oficial First-Party (100% margen para protocol_treasury).
   */
  purchaseFirstPartyCatalogItem({
    itemId,
    buyerId = "alphaquant-agent",
    paymentToken = "USDC",
    paymentTxHash = null,
    requireOnChainPaymentProof = false,
    onChainVerificationResult = null,
  }) {
    return executeFirstPartyCatalogPurchase({
      ledger: this,
      itemId,
      buyerId,
      paymentToken,
      paymentTxHash,
      requireOnChainPaymentProof,
      onChainVerificationResult,
    });
  }

  /**
   * Registro Freemium con Auditoría Determinista en Vivo para Tiendas Externas.
   */
  registerAndCertifyStore(params = {}) {
    return registerAndCertifyExternalStore({
      ledger: this,
      ...params,
    });
  }

  /**
   * VERITAS-8183 (Gratis): Panorama Rápido Bilateral (Vendedor 1-3 Estrellas + Reserva Cripto + Pasaporte Comprador).
   */
  inspectVeritasSeal(params = {}) {
    return inspectVeritas8183QuickPanorama({
      ledger: this,
      ...params,
    });
  }

  /**
   * VERITAS-8183: Examen de Ascenso de Nivel (1 a 3 Estrellas) con Prueba de Reserva Cripto Pública (>=20% en Nivel 3).
   */
  submitVeritasTierExam(params = {}) {
    return submitVeritasSellerTierExam({
      ledger: this,
      ...params,
    });
  }

  /**
   * VERITAS-8183: Gestión del Pasaporte de Solvencia, Techo de Gasto Determinista (FinOps) y Descuentos VIP del Comprador.
   */
  manageBuyerSpendPassport(params = {}) {
    return manageBuyerFinopsSpendPassport({
      ledger: this,
      ...params,
    });
  }

  /**
   * VERITAS-8183: Notario y Testigo en Vivo A2A / Smart Contracts + Ejecución de Micro-Servicios del Bazar x402.
   */
  notarizeA2ADeal(params = {}) {
    return notarizeAndWitnessA2ADealOrBazaarCall({
      ledger: this,
      ...params,
    });
  }

  /**
   * VERITAS-8183: Radar de Intención de Compra y Emparejamiento Directo de Clientes (Exclusivo 2★ y 3★, Freemium 3 clientes + 0.5%).
   */
  matchVerifiedBuyers(params = {}) {
    return matchAndConnectVerifiedBuyers({
      ledger: this,
      ...params,
    });
  }

  /**
   * Manifiesto Público de la Notaría VERITAS-8183 para GET /notary.json y /.well-known/veritas-8183.json
   */
  getVeritasNotaryManifest(baseUrl = "https://own-adam.onrender.com") {
    const panorama = this.inspectVeritasSeal({ targetId: "ALL" });
    return {
      schemaVersion: "0.7.0",
      standard: "VERITAS-8183",
      title:
        "VERITAS-8183 Public M2M Notary, 3-Star Proof-of-Reserve Rating Bureau, FinOps Spend Passport & x402 Micro-Bazaar",
      mcpEndpoint: `${baseUrl}/mcp`,
      notaryAuthority: panorama.notaryAuthority,
      threeStarLevel3Requirements: {
        pillar1_proofOfReserve: "Minimum 20% auditable crypto reserve in public wallet relative to active volume",
        pillar2_contentAndCodeQuality: ">= 98% deterministic purity, SHA-256 lock, Sourcify contract verification",
        pillar3_clientSatisfaction: ">= 4.8/5.0 verified client rating across >= 10 notarized deliveries, 0% dispute losses",
        pillar4_latencySla: "<= 100ms P95 response time and >= 99.9% uptime",
        pillar5_cleanHistory: "Zero slashing or silent model-downgrade violations",
      },
      buyerVipLoyaltyTiers: {
        VIP_GOLD_PRIME_BUYER: "15% Fee Discount + 10% First-Party Catalog Discount (>=95% payment rate, 0% spam, verified reviews)",
        VIP_SILVER_GOOD_PAYER: "10% Fee Discount + 5% First-Party Catalog Discount (>=85% payment rate, <=10% quote abandonment)",
        STANDARD_VERIFIED_BUYER: "0% initial discount, deterministic FinOps spend cap active",
      },
      summaryCounts: panorama.summaryCounts,
      certifiedSellerStarRegistry: panorama.sellerStarDirectory,
      verifiedBuyerPassports: panorama.buyerSolvencyDirectory,
      x402MicroBazaarServices: panorama.x402MicroBazaarCatalog,
      recentNotarizedActas: (this.veritasNotaryRegistry || []).slice(0, 15),
    };
  }

  /**
   * Manifiesto completo del Catálogo Dual para GET /catalog.json
   */
  getFullCatalogManifest(baseUrl = "https://own-adam.onrender.com") {
    const discovery = this.discoverStoresErc8004({ minReputation: 70 });
    return {
      schemaVersion: "0.7.0",
      standard: "VERITAS-8183 & ERC-8004",
      catalogName: "TrustGate VERITAS-8183 Dual-Tier AI Marketplace, M2M Notary & x402 Micro-Bazaar",
      mcpEndpoint: `${baseUrl}/mcp`,
      notaryRegistryUrl: `${baseUrl}/notary.json`,
      escrowContractBaseMainnet: this.wallets.escrow_contract.address,
      sourcifyMatchId: "59283147",
      marketTiers: {
        INSTITUTIONAL_B2B: {
          description: "Audit-grade CME Globex microstructure datasets, Sourcify-verified Solidity blueprints, Enterprise RAG/Skill Firewalls, DePIN H100 SLA clusters.",
          escrowFeeDiscount: "1.0% reduced fee on orders >= 10 USDC",
        },
        RETAIL_INDIE: {
          description: "Fast 1.00 - 2.50 USDC Anti-Rugpull scanners, Zero-Lookahead Retail Bot verifiers, Safe Plug-and-Play SKILL.md bundles, and low-latency x402 APIs.",
          microTicketSupport: "Instant settlement from 1.00 USDC on First-Party items",
        },
        X402_MICRO_BAZAAR: {
          description: "Millisecond VERITAS-8183 Notary Witness Actas, 3-Star Exams, FinOps Spend Passports & 1-Contract Anti-Honeypot Micro-Scans from 0.10 to 1.00 USDC.",
          services: Object.values(X402_MICRO_BAZAAR_SERVICES),
        },
      },
      curatedFirstPartyPackages: discovery.curatedFirstPartyCatalog,
      verifiedPartnerStores: [...discovery.verifiedCatalogPartners, ...discovery.eligibleStores],
      externalSellerOnboarding: discovery.externalStoreOnboarding,
    };
  }

  /**
   * Handshake x402 Paso 1: Emitir desafío HTTP 402 Payment Required legible por máquina.
   */
  issueX402Challenge({ buyerId = "alphaquant-agent", storeId, tokenSymbol, tokenAmount, minRows = 1500 }) {
    const quote = quoteSwapAndEscrow({ tokenSymbol, tokenAmount });
    if (!quote.viable) {
      this.logWirePacket({
        protocol: "x402",
        from: "EvaluatorNode",
        to: buyerId,
        action: "REJECT_ECONOMIC_GUARDRAIL",
        status: 400,
        payloadSummary: quote.reason,
      });
      return { ok: false, status: 400, error: quote.reason, code: quote.code };
    }

    const nonce = "0x" + crypto.randomBytes(12).toString("hex");
    const challenge = {
      protocol: "x402-v1",
      nonce,
      buyerId,
      storeId,
      inputToken: tokenSymbol,
      inputAmount: Number(tokenAmount),
      minRows: Number(minRows),
      usdcToLock: quote.escrowBreakdown.usdcLockedInContract,
      protocolFeeUsdc: quote.escrowBreakdown.protocolFeeUsdc,
      escrowVaultAddress: this.wallets.escrow_contract.address,
      aggregatorRoute: quote.route.aggregator,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    };

    this.pendingX402Challenges.set(nonce, challenge);
    this.wallets.protocol_treasury.stats.x402Handshakes += 1;

    this.logWirePacket({
      protocol: "x402",
      from: "EvaluatorNode",
      to: buyerId,
      action: "HTTP_402_PAYMENT_REQUIRED",
      status: 402,
      payloadSummary: `Challenge ${nonce.slice(0, 10)}...: Pay ${tokenAmount} ${tokenSymbol} -> Lock ${challenge.usdcToLock} USDC`,
    });

    return { ok: true, status: 402, challenge };
  }

  /**
   * Handshake x402 Paso 2: Verificar cabecera X-Payment firmada por la IA compradora y abrir Escrow.
   */
  settleX402ChallengeAndFund({ nonce, paymentSignature }) {
    const ch = this.pendingX402Challenges.get(nonce);
    if (!ch) {
      return { ok: false, error: "Challenge x402 inválido o expirado." };
    }
    if (!paymentSignature || !paymentSignature.startsWith("0xsig_")) {
      return { ok: false, error: "Cabecera X-Payment malformada: falta firma criptográfica del agente." };
    }

    this.pendingX402Challenges.delete(nonce);

    return this.createAndFundJob({
      buyerId: ch.buyerId,
      storeId: ch.storeId,
      tokenSymbol: ch.inputToken,
      tokenAmount: ch.inputAmount,
      minRows: ch.minRows,
      x402Receipt: { nonce, signature: paymentSignature },
    });
  }

  createAndFundJob({
    buyerId = "alphaquant-agent",
    storeId,
    tokenSymbol,
    tokenAmount,
    title,
    minRows = 1000,
    topicKeywords = ["cloud", "saas", "pricing"],
    timeoutSeconds = 300,
    x402Receipt = null,
  }) {
    const buyer = this.buyerAgents[buyerId] || this.buyerAgents["alphaquant-agent"];
    const store = this.stores[storeId];
    if (!store) {
      throw new Error(`Tienda IA desconocida: ${storeId}`);
    }

    const quote = quoteSwapAndEscrow({ tokenSymbol, tokenAmount });
    if (!quote.viable) {
      return { ok: false, error: quote.reason, code: quote.code, details: quote.metrics };
    }

    const buyerBal = buyer.balances[tokenSymbol] ?? 0;
    if (buyerBal < Number(tokenAmount)) {
      return {
        ok: false,
        code: "INSUFFICIENT_FUNDS",
        error: `Saldo insuficiente en ${buyer.id}: tiene ${buyerBal} ${tokenSymbol}.`,
      };
    }

    buyer.balances[tokenSymbol] = round6(buyerBal - Number(tokenAmount));
    this.wallets.escrow_contract.balances.USDC = round6(
      this.wallets.escrow_contract.balances.USDC + quote.escrowBreakdown.usdcLockedInContract
    );

    const jobId = `JOB-${++this.jobCounter}`;
    const now = Date.now();
    const job = {
      jobId,
      title: title || `M2M Dataset Feed (${minRows} rows)`,
      buyerId: buyer.id,
      buyerName: buyer.name,
      buyerAddress: buyer.address,
      storeId: store.id,
      storeName: store.name,
      storeAddress: store.address,
      evaluatorAddress: this.wallets.evaluator_signer.address,
      status: "FUNDED_USDC",
      createdAt: new Date(now).toISOString(),
      expiresAtMs: now + timeoutSeconds * 1000,
      x402Receipt,
      swapDetails: quote.route,
      financials: quote.escrowBreakdown,
      spec: {
        minRows: Number(minRows),
        sampleSize: 30,
        topicKeywords,
        schema: {
          id: "string",
          company: "string",
          contactEmail: "email",
          annualSpendUsd: "number",
          domainUrl: "url",
        },
      },
      encryptedVault: null,
      releasedDecryptionKey: null,
      auditReport: null,
      attestationUid: null,
    };

    this.jobs.unshift(job);
    if (this.jobs.length > 40) this.jobs.length = 40;

    this.logWirePacket({
      protocol: "ERC-8183",
      from: buyer.id,
      to: this.wallets.escrow_contract.address,
      action: "ESCROW_LOCKED_USDC",
      status: 201,
      payloadSummary: `${jobId}: Swapped ${tokenAmount} ${tokenSymbol} -> ${job.financials.usdcLockedInContract} USDC locked for ${store.id}`,
    });

    return { ok: true, job };
  }

  submitAndAuditDeliverable({ jobId, rawDatasetJsonString }) {
    const job = this.jobs.find((j) => j.jobId === jobId);
    if (!job) throw new Error(`No existe la orden ${jobId}`);
    if (job.status !== "FUNDED_USDC") {
      return { ok: false, error: `La orden ${jobId} ya está cerrada (${job.status}).` };
    }

    const buyer = this.buyerAgents[job.buyerId] || this.buyerAgents["alphaquant-agent"];
    const encryptedPkg = encryptDeliverable(rawDatasetJsonString);
    job.encryptedVault = {
      ciphertextPreview: encryptedPkg.ciphertextBase64.slice(0, 48) + "...",
      plaintextSha256: encryptedPkg.plaintextSha256,
      byteSize: encryptedPkg.byteSize,
    };
    job.status = "SUBMITTED_ENCRYPTED";

    const auditResult = auditEncryptedDataset({
      encryptedPackage: encryptedPkg,
      jobSpec: job.spec,
    });
    job.auditReport = auditResult;

    const gasCost = ECONOMIC_RULES.estimatedBaseGasUsdc;
    const aiCost = auditResult.metrics.actualAiTokenCostUsdc;
    const treasuryStats = this.wallets.protocol_treasury.stats;
    treasuryStats.totalGasSpentUsdc = round6(treasuryStats.totalGasSpentUsdc + gasCost);
    treasuryStats.totalAiTokensSpentUsdc = round6(treasuryStats.totalAiTokensSpentUsdc + aiCost);
    treasuryStats.auditsCompleted += 1;

    if (
      auditResult.stageFailed === "LAYER_1_ANTIMALWARE" ||
      auditResult.stageFailed === "LAYER_1_ANTI_PROMPT_INJECTION"
    ) {
      treasuryStats.attacksBlocked += 1;
    }

    const lockedUsdc = job.financials.usdcLockedInContract;
    const store = this.stores[job.storeId];

    if (auditResult.approved) {
      const escrowFee = job.financials.protocolFeeUsdc;
      const brokerFeeUsdc = round6(lockedUsdc * (store.brokerFeeRate || 0));
      const totalProtocolFee = round6(escrowFee + brokerFeeUsdc);
      const sellerPayout = round6(job.financials.sellerPayoutIfApprovedUsdc - brokerFeeUsdc);

      job.financials.brokerFeeUsdc = brokerFeeUsdc;
      job.financials.totalProtocolRevenueUsdc = totalProtocolFee;
      job.financials.sellerNetPayoutUsdc = sellerPayout;

      this.wallets.escrow_contract.balances.USDC = round6(
        this.wallets.escrow_contract.balances.USDC - lockedUsdc
      );
      store.usdcBalance = round6(store.usdcBalance + sellerPayout);
      this.wallets.protocol_treasury.balances.USDC = round6(
        this.wallets.protocol_treasury.balances.USDC + totalProtocolFee
      );

      treasuryStats.grossFeesEarnedUsdc = round6(treasuryStats.grossFeesEarnedUsdc + totalProtocolFee);
      job.status = "SETTLED_APPROVED";
      job.releasedDecryptionKey = encryptedPkg.decryptionKeyHex;

      store.completedJobs += 1;
      store.reputationScore = Math.min(100, store.reputationScore + 2);
    } else {
      this.wallets.escrow_contract.balances.USDC = round6(
        this.wallets.escrow_contract.balances.USDC - lockedUsdc
      );
      buyer.balances.USDC = round6(buyer.balances.USDC + lockedUsdc);

      job.status = "REFUNDED_REJECTED";
      job.releasedDecryptionKey = null;

      store.failedJobs += 1;
      const penalty =
        auditResult.stageFailed?.includes("ANTIMALWARE") ||
        auditResult.stageFailed?.includes("PROMPT_INJECTION")
          ? 18
          : 9;
      store.reputationScore = Math.max(0, store.reputationScore - penalty);
    }

    treasuryStats.netProfitUsdc = round6(
      treasuryStats.grossFeesEarnedUsdc -
        treasuryStats.totalGasSpentUsdc -
        treasuryStats.totalAiTokensSpentUsdc
    );

    const attestation = this.#emitEasAttestation(job, auditResult);
    job.attestationUid = attestation.uid;

    this.logWirePacket({
      protocol: "EAS+ERC8183",
      from: "EvaluatorNode",
      to: auditResult.approved ? store.id : buyer.id,
      action: auditResult.approved ? "SETTLE_USDC_AND_RELEASE_KEY" : `REFUND_100%_${auditResult.stageFailed}`,
      status: 200,
      payloadSummary: `${job.jobId} [${auditResult.metrics.durationMs}ms | AI:${aiCost} USDC] -> ${
        auditResult.approved
          ? `+${job.financials.sellerPayoutIfApprovedUsdc} USDC to ${store.id} (Fee +${job.financials.protocolFeeUsdc})`
          : `Refunded ${lockedUsdc} USDC to ${buyer.id} (${store.id} rep -> ${store.reputationScore})`
      }`,
    });

    return { ok: true, job, attestation };
  }

  claimTimeoutRefund({ jobId, forceSimulateExpiry = false }) {
    const job = this.jobs.find((j) => j.jobId === jobId);
    if (!job) throw new Error(`No existe la orden ${jobId}`);
    if (job.status !== "FUNDED_USDC") {
      return { ok: false, error: `La orden ${jobId} no está esperando entrega (${job.status}).` };
    }
    if (!forceSimulateExpiry && Date.now() < job.expiresAtMs) {
      return { ok: false, error: "Aún no ha expirado el tiempo límite del contrato." };
    }

    const buyer = this.buyerAgents[job.buyerId] || this.buyerAgents["alphaquant-agent"];
    const lockedUsdc = job.financials.usdcLockedInContract;
    this.wallets.escrow_contract.balances.USDC = round6(
      this.wallets.escrow_contract.balances.USDC - lockedUsdc
    );
    buyer.balances.USDC = round6(buyer.balances.USDC + lockedUsdc);

    job.status = "REFUNDED_TIMEOUT";
    const store = this.stores[job.storeId];
    store.failedJobs += 1;
    store.reputationScore = Math.max(0, store.reputationScore - 5);

    return { ok: true, job };
  }

  simulateUnauthorizedDrainAttempt({ targetAddress = "0xAttacker...DEAD" }) {
    return {
      blockedBySmartContract: true,
      reason: `Revertido por EVM (ERC-8183): ${this.wallets.evaluator_signer.address} carece de privilegios withdraw() hacia ${targetAddress}.`,
    };
  }

  #emitEasAttestation(job, auditResult) {
    const payload = JSON.stringify({
      jobId: job.jobId,
      storeAddress: job.storeAddress,
      approved: auditResult.approved,
      stageFailed: auditResult.stageFailed,
      sha256: job.encryptedVault?.plaintextSha256,
      timestamp: new Date().toISOString(),
    });
    const signature = crypto
      .createHmac("sha256", this.evaluatorSecretKey)
      .update(payload)
      .digest("hex");
    const uid = "0xeas_" + signature.slice(0, 20);

    const record = {
      uid,
      schema: "ERC-8004-DatasetAudit-v1",
      storeId: job.storeId,
      storeName: job.storeName,
      jobId: job.jobId,
      verdict: auditResult.approved ? "APPROVED" : `REJECTED:${auditResult.stageFailed}`,
      evaluatorAddress: this.wallets.evaluator_signer.address,
      signature: "0x" + signature,
      createdAt: new Date().toISOString(),
    };
    this.attestations.unshift(record);
    if (this.attestations.length > 30) this.attestations.length = 30;
    return record;
  }

  getAgentCardManifest(baseUrl = "http://localhost:3402") {
    return {
      schemaVersion: "1.0.0",
      name: "TrustGate-M2M-Auditor",
      description:
        "Autonomous ERC-8183 Dataset Evaluator & Cross-Chain USDC Escrow Solver.Deterministic Antimalware + Cryptographic 30-Row Blind Sampling.",
      identity: {
        standard: "ERC-8004",
        evaluatorAddress: this.wallets.evaluator_signer.address,
        escrowVaultAddress: this.wallets.escrow_contract.address,
        chain: "base",
        chainId: 8453,
        sourceCodeVerification: {
          status: "exact_match",
          provider: "Sourcify-v2",
          matchId: "59283147",
          compilerVersion: "0.8.38+commit.1835d247",
          sourcifyRepoUrl: `https://repo.sourcify.dev/8453/${this.wallets.escrow_contract.address}`,
          basescanUrl: `https://basescan.org/address/${this.wallets.escrow_contract.address}`,
          creationTxHash: "0xc377200731078568eeaf4c683f7a63c2f4cc18ba5e8714a0dae21ba7277bb84a",
        },
        onChainAuditProofs: [
          {
            cycle: "DATABENTO-NQ-INSTRUMENT-MAPPING",
            rowsScanned: 1420,
            verdict: "APPROVED",
            settlementTxHash: "0x7c4948927968573c9df1ef788bd1fe7872ffb2d8908e61010f4d24496dbdf6d5",
          },
          {
            cycle: "DATABENTO-NQ-BID-ASK-MBO",
            rowsScanned: 496,
            verdict: "APPROVED",
            settlementTxHash: "0x98f016459fe0625241f9135d8ae6286d03b08f0ebf7d0b54ce5ee24a7bcfba41",
          },
          {
            cycle: "DATABENTO-SABOTAGED-CSV-MALWARE",
            rowsScanned: 199,
            verdict: "REJECTED_AND_REFUNDED_100PCT",
            settlementTxHash: "0x4437d5eec9dc4da1faa0312ccf59904890611dca358a500751b3e3d4b6fe7f09",
          },
        ],
      },
      paymentTerms: {
        protocol: "x402-v1",
        acceptedTokens: ["USDC", "ETH", "SOL", "VIRTUAL", "USDT"],
        settlementCurrency: "USDC",
        minOrderBaseLaneUsdc: ECONOMIC_RULES.minOrderBaseLaneUsdc,
        minOrderCrossChainLaneUsdc: ECONOMIC_RULES.minOrderCrossChainLaneUsdc,
        standardFeePct: ECONOMIC_RULES.standardFeePct,
        volumeDiscountFromUsdc: ECONOMIC_RULES.volumeDiscountThresholdUsdc,
        discountedFeePct: ECONOMIC_RULES.discountedFeePct,
        minFeeUsdc: ECONOMIC_RULES.minFeeUsdc,
      },
      endpoints: {
        agentCard: `${baseUrl}/.well-known/agent.json`,
        x402BazaarListing: `${baseUrl}/.well-known/x402-bazaar.json`,
        openApiSpec: `${baseUrl}/openapi.json`,
        mcpHttpJsonRpc: `${baseUrl}/mcp`,
        x402EscrowEndpoint: `${baseUrl}/api/m2m/escrow`,
        reputationRegistry: `${baseUrl}/api/m2m/stores`,
      },
      capabilities: [
        "erc8004-reputation-filtering",
        "multitoken-to-usdc-atomic-quote",
        "aes-256-gcm-blind-inspection",
        "csv-formula-antimalware",
        "anti-prompt-injection",
        "stratified-30-row-blind-sampling",
        "quant-backtest-anti-overfitting-auditor",
        "solidity-smart-contract-solc-security-auditor",
        "x402-paid-api-sla-latency-oracle",
        "agent-skill-and-mcp-trojan-auditor",
        "rag-vector-embedding-anti-poisoning-auditor",
        "ai-inference-anti-downgrade-proof-auditor",
        "depin-gpu-compute-benchmark-sla-auditor",
        "strict-fee-capped-evaluator-liability",
        "veritas-8183-public-m2m-notary-witness",
        "veritas-8183-3star-proof-of-reserve-rating",
        "agent-finops-deterministic-spend-passport",
      ],
    };
  }

  getX402BazaarDescriptor(baseUrl = "http://localhost:3402") {
    const card = this.getAgentCardManifest(baseUrl);
    return {
      bazaarVersion: "x402-bazaar-1.0",
      standard: "VERITAS-8183 & x402",
      serviceId: "trustgate-veritas-8183-notary-and-auditor",
      title: "TrustGate VERITAS-8183 M2M Notary, 3-Star Rating Bureau, FinOps Spend Guard & 8-Vertical Escrow Auditor",
      category: "agentic-notary-escrow-and-x402-bazaar",
      summary:
        "Zero-trust USDC escrow, VERITAS-8183 Public Notary (1-to-3 Star Proof-of-Reserve Seal & Buyer VIP FinOps Spend Passport), and 8-vertical deterministic auditor deployed and Sourcify-verified on Base Mainnet.",
      slaMetrics: {
        medianAuditLatencyMs: 31,
        notaryWitnessLatencyMs: 2.1,
        deterministicScanCoveragePct: 100,
        blindSampleRows: 30,
        refundOnMalwareOrFraudPct: 100,
        maxEvaluatorLiabilityCap: "100% of protocol fee collected on job (1.0% - 1.5%)",
      },
      pricing: card.paymentTerms,
      microBazaarServices: Object.values(X402_MICRO_BAZAAR_SERVICES),
      onChainVerification: card.identity,
      endpoints: {
        ...card.endpoints,
        veritasNotaryRegistry: `${baseUrl}/notary.json`,
      },
      mcpTools: [
        "discover_verified_stores",
        "quote_multitoken_escrow",
        "open_escrow_job",
        "submit_encrypted_deliverable",
        "audit_quant_backtest_escrow",
        "audit_smart_contract_escrow",
        "audit_api_sla_escrow",
        "audit_agent_skill_escrow",
        "audit_rag_embeddings_escrow",
        "audit_ai_inference_escrow",
        "audit_depin_gpu_sla_escrow",
        "verify_onchain_escrow_status",
        "purchase_firstparty_catalog_item",
        "register_and_certify_store",
        "inspect_veritas_8183_seal",
        "submit_veritas_tier_upgrade_exam",
        "manage_buyer_finops_spend_passport",
        "notarize_and_witness_a2a_deal",
      ],
    };
  }

  getOpenApiSpec(baseUrl = "http://localhost:3402") {
    return {
      openapi: "3.1.0",
      info: {
        title: "TrustGate M2M 8-Vertical Escrow & Auditor API (ERC-8183 / x402 / MCP)",
        version: "0.5.0",
        description:
          "Machine-to-Machine API for autonomous AI agents to quote multi-token swaps into Base USDC, lock funds in the verified TrustGateEscrow8183 contract (0xd4f77bf843b3c359b233aca46d7ff6604cbd0a5e), and audit Datasets, Quant Backtests, Solidity Smart Contracts, x402 API SLAs, Agent Skills, RAG Embeddings, AI Inference, and DePIN GPU Compute.",
      },
      servers: [{ url: baseUrl }],
      paths: {
        "/.well-known/agent.json": {
          get: {
            operationId: "getAgentCard",
            summary: "Retrieve ERC-8004 Agent Card and Base Mainnet verification proofs",
          },
        },
        "/.well-known/x402-bazaar.json": {
          get: {
            operationId: "getX402BazaarListing",
            summary: "Retrieve Coinbase x402 Bazaar machine discovery metadata and SLA metrics",
          },
        },
        "/mcp": {
          post: {
            operationId: "handleMcpRpc",
            summary: "Model Context Protocol (JSON-RPC 2.0) endpoint for autonomous AI tool calls",
          },
        },
        "/api/m2m/stores": {
          get: {
            operationId: "discoverStoresErc8004",
            summary: "Filter dataset stores by ERC-8004 on-chain reputation score",
          },
        },
        "/api/m2m/escrow": {
          post: {
            operationId: "x402EscrowHandshake",
            summary: "Initiate HTTP 402 payment challenge or settle with X-Payment header",
          },
        },
      },
    };
  }

  getStateSnapshot() {
    return {
      wallets: this.wallets,
      buyerAgents: Object.values(this.buyerAgents),
      stores: Object.values(this.stores),
      jobs: this.jobs,
      attestations: this.attestations.slice(0, 15),
      wireLogs: this.m2mWireLogs.slice(0, 35),
      rules: ECONOMIC_RULES,
    };
  }
}
