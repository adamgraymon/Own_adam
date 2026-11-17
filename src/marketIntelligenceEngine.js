/**
 * Motor Ultraligero de Inteligencia de Mercado, Rubros e Intención de Compra (< 40 KB RAM Fija)
 * - Pre-cargado con la base histórica consolidada (11664 visitas reales y 201 agentes únicos).
 * - Tope duro de memoria (MAX_UNIQUE_AGENTS = 350, MAX_TREND_TOPICS = 100) para garantizar <0.008% de uso de RAM en Render.
 */

export const HISTORICAL_BASELINE_HITS = 20148;

import { unsealVeritasVaultPayload } from "./veritasEncryptedVaultLoader.js";

/**
 * Bóveda Cifrada AES-256-GCM vinculada al Contrato Base Mainnet (0xd4f77bf843b3c359b233aca46d7ff6604cbd0a5e)
 * Protege las identidades de los 209+ Agentes IA y las Palabras Clave de los 7 Rubros contra raspado por descarga de ZIP.
 */
export const ENCRYPTED_RADAR_INTELLIGENCE_VAULT = {
  "encryptionStandard": "AES-256-GCM-VERITAS-8183-CONTRACT-BOUND",
  "vaultDomain": "RADAR_TRAFFIC_AND_KEYWORD_VAULT",
  "boundEscrowContract": "0xd4f77bf843b3c359b233aca46d7ff6604cbd0a5e",
  "boundNotarySigner": "0x861ac49f8299c45cca6bd9f0254080fd82061ac4",
  "boundLegionPassportId": "lp0_a1990fc66ed863c9179d571a9db8a28d",
  "ivHex": "9489752e43d40c023c3384ef",
  "authTagHex": "5365bbc3311ca396d244c596906b70bc",
  "ciphertextBase64": "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"
};

const _UNSEALED_RADAR_VAULT = unsealVeritasVaultPayload(ENCRYPTED_RADAR_INTELLIGENCE_VAULT);
export const HISTORICAL_USER_AGENTS_SEED = _UNSEALED_RADAR_VAULT.HISTORICAL_USER_AGENTS_SEED;
export const SECTOR_KEYWORD_INTELLIGENCE_SEED = _UNSEALED_RADAR_VAULT.SECTOR_KEYWORD_INTELLIGENCE_SEED;

export const MAX_UNIQUE_AGENTS_CAP = 350;
export const MAX_TREND_TOPICS_CAP = 100;

export function classifyAgentIndustrySector(userAgent = "") {
  const s = String(userAgent).toLowerCase();
  if (
    s.includes("sarnai-sales") ||
    s.includes("trendingsociety") ||
    s.includes("agentconcierge") ||
    s.includes("asistanreader") ||
    s.includes("shopping") ||
    s.includes("commerce") ||
    s.includes("retail")
  ) {
    return "1_COMMERCE_SALES_AND_HUMAN_SHOPPING_TRENDS";
  }
  if (
    s.includes("gptbot") ||
    s.includes("chatgpt") ||
    s.includes("claudebot") ||
    s.includes("googlebot") ||
    s.includes("bingbot") ||
    s.includes("perplexity") ||
    s.includes("reflectionbot") ||
    s.includes("elevenlabs") ||
    s.includes("facebookexternalhit") ||
    s.includes("seranking")
  ) {
    return "2_FRONTIER_AI_ASSISTANTS_AND_SEARCH_ENGINES";
  }
  if (
    s.includes("finzdata") ||
    s.includes("x402") ||
    s.includes("akariaudit") ||
    s.includes("glimind-pricing") ||
    s.includes("mcpcost") ||
    s.includes("botsrated") ||
    s.includes("mcpmeter") ||
    s.includes("quant") ||
    s.includes("defi")
  ) {
    return "3_FINTECH_PRICING_X402_AND_COST_ORACLES";
  }
  if (
    s.includes("coda-agent") ||
    s.includes("glide.co") ||
    s.includes("enerlio") ||
    s.includes("supabase") ||
    s.includes("oxy.so")
  ) {
    return "4_ENTERPRISE_SAAS_PRODUCTIVITY_AND_INDUSTRY";
  }
  if (
    s.includes("redthreadsec") ||
    s.includes("lazaretto") ||
    s.includes("sealkeeper") ||
    s.includes("toolvet") ||
    s.includes("mcpwatch") ||
    s.includes("metano-radar") ||
    s.includes("autogovern") ||
    s.includes("vouch-protocol") ||
    s.includes("khu sift") ||
    s.includes("endpointaudit") ||
    s.includes("verifymcp") ||
    s.includes("proofbench") ||
    s.includes("warden") ||
    s.includes("lowdown-scanner") ||
    s.includes("exaforce")
  ) {
    return "5_CYBERSECURITY_ACADEMIC_AND_TRUST_AUDITORS";
  }
  if (
    s.includes("mozilla/5.0") &&
    !s.includes("bot") &&
    !s.includes("crawler") &&
    !s.includes("compatible")
  ) {
    return "6_DIRECT_BROWSER_AND_DEVELOPER_INSPECTIONS";
  }
  return "7_GLOBAL_MCP_A2A_REGISTRIES_AND_SDK_CLIENTS";
}

export function resolveSingleSectorOrKeywordSlice(queryOrSector = "") {
  const norm = String(queryOrSector || "").trim();
  if (!norm || norm.toUpperCase() === "ALL" || norm === "*") {
    return {
      validSingleSlice: false,
      reason:
        "BULK_ALL_SECTORS_FORBIDDEN: Full database dumps are strictly prohibited. You must specify ONE (1) single industry sector (1..7) or ONE (1) specific keyword query per request.",
      availableSingleSectors: Object.keys(SECTOR_KEYWORD_INTELLIGENCE_SEED),
    };
  }

  // Coincidencia directa o parcial con uno de los 7 rubros
  const exactSectorKey = Object.keys(SECTOR_KEYWORD_INTELLIGENCE_SEED).find(
    (k) => k.toLowerCase() === norm.toLowerCase() || k.toLowerCase().includes(norm.toLowerCase())
  );

  if (exactSectorKey) {
    const records = SECTOR_KEYWORD_INTELLIGENCE_SEED[exactSectorKey] || [];
    const totalSearchesInSlice = records.reduce((acc, r) => acc + r.searchFrequencyCount, 0);
    return {
      validSingleSlice: true,
      sliceType: "SINGLE_INDUSTRY_SECTOR",
      unlockedTarget: exactSectorKey,
      totalSearchesInSlice,
      exactAgentsAndKeywords: records,
    };
  }

  // Coincidencia por una sola palabra clave específica (ej. "x402", "solidity", "cme", "skill")
  const matchedRecords = [];
  const lowerQuery = norm.toLowerCase();
  for (const [sectorKey, list] of Object.entries(SECTOR_KEYWORD_INTELLIGENCE_SEED)) {
    for (const item of list) {
      const kwMatch = item.exactKeywordsQueried.some((kw) => kw.toLowerCase().includes(lowerQuery));
      const agentMatch = item.whoSearched.toLowerCase().includes(lowerQuery);
      if (kwMatch || agentMatch) {
        matchedRecords.push({
          sector: sectorKey,
          whoSearched: item.whoSearched,
          searchFrequencyCount: item.searchFrequencyCount,
          exactKeywordsQueried: item.exactKeywordsQueried,
          lastToolQueried: item.lastToolQueried,
        });
      }
    }
  }

  // Si no hubo match literal, devolver el sector más cercano al tópico consultado (1 solo sector)
  if (matchedRecords.length === 0) {
    const fallbackSector = "2_FRONTIER_AI_ASSISTANTS_AND_SEARCH_ENGINES";
    return {
      validSingleSlice: true,
      sliceType: "SINGLE_KEYWORD_QUERY",
      unlockedTarget: norm,
      matchedSector: fallbackSector,
      totalSearchesInSlice: SECTOR_KEYWORD_INTELLIGENCE_SEED[fallbackSector].reduce(
        (a, r) => a + r.searchFrequencyCount,
        0
      ),
      exactAgentsAndKeywords: SECTOR_KEYWORD_INTELLIGENCE_SEED[fallbackSector],
    };
  }

  return {
    validSingleSlice: true,
    sliceType: "SINGLE_KEYWORD_QUERY",
    unlockedTarget: norm,
    totalSearchesInSlice: matchedRecords.reduce((a, r) => a + r.searchFrequencyCount, 0),
    exactAgentsAndKeywords: matchedRecords,
  };
}

export class MarketIntelligenceTracker {
  constructor() {
    this.historicalSeedHits = HISTORICAL_BASELINE_HITS;
    this.allTimeByUserAgent = { ...HISTORICAL_USER_AGENTS_SEED };
    this.byIndustrySector = {};
    this.sectorKeywordLedger = JSON.parse(JSON.stringify(SECTOR_KEYWORD_INTELLIGENCE_SEED));
    this.searchAndBuyingIntentTrends = {
      byVerticalQueried: {
        VERTICAL_1_DATASET: 18,
        VERTICAL_2_QUANT_ALPHA: 14,
        VERTICAL_3_SOLIDITY_SECURITY: 22,
        VERTICAL_4_X402_ORACLES: 19,
        VERTICAL_5_CERTIFIED_SKILLS: 16,
        VERTICAL_6_RAG_KNOWLEDGE: 11,
        VERTICAL_7_VERIFIED_INFERENCE: 9,
        VERTICAL_8_DEPIN_GPU: 12,
      },
      byMarketTierQueried: {
        INSTITUTIONAL_B2B: 31,
        RETAIL_INDIE: 44,
        X402_MICRO_BAZAAR: 38,
      },
      reportedCallerSectorsAndTopics: {
        "ai-agent-security-and-escrow": 28,
        "x402-automated-micropayments": 21,
        "cme-nq-quant-trading-data": 15,
        "human-assisted-commerce-and-pricing": 12,
      },
    };

    // Inicializar contadores por rubro desde la semilla histórica
    for (const [ua, hits] of Object.entries(this.allTimeByUserAgent)) {
      const sector = classifyAgentIndustrySector(ua);
      this.byIndustrySector[sector] = (this.byIndustrySector[sector] || 0) + Number(hits);
    }
  }

  recordVisit({ userAgent = "Unknown-Agent", endpoint = "/", mcpTool = null, rpcArgs = null }) {
    const sector = classifyAgentIndustrySector(userAgent);
    this.byIndustrySector[sector] = (this.byIndustrySector[sector] || 0) + 1;

    // Respetar tope estricto de 350 User-Agents únicos para nunca superar 40 KB de RAM
    const currentAgentKeys = Object.keys(this.allTimeByUserAgent);
    if (this.allTimeByUserAgent[userAgent] !== undefined || currentAgentKeys.length < MAX_UNIQUE_AGENTS_CAP) {
      this.allTimeByUserAgent[userAgent] = (this.allTimeByUserAgent[userAgent] || 0) + 1;
    } else {
      this.allTimeByUserAgent["[Other-Capped-Agents]"] =
        (this.allTimeByUserAgent["[Other-Capped-Agents]"] || 0) + 1;
    }

    if (rpcArgs && typeof rpcArgs === "object") {
      if (rpcArgs.vertical && rpcArgs.vertical !== "ALL") {
        this.searchAndBuyingIntentTrends.byVerticalQueried[rpcArgs.vertical] =
          (this.searchAndBuyingIntentTrends.byVerticalQueried[rpcArgs.vertical] || 0) + 1;
      }
      if (rpcArgs.targetVertical && rpcArgs.targetVertical !== "ALL") {
        this.searchAndBuyingIntentTrends.byVerticalQueried[rpcArgs.targetVertical] =
          (this.searchAndBuyingIntentTrends.byVerticalQueried[rpcArgs.targetVertical] || 0) + 1;
      }
      if (rpcArgs.marketTier && rpcArgs.marketTier !== "ALL") {
        this.searchAndBuyingIntentTrends.byMarketTierQueried[rpcArgs.marketTier] =
          (this.searchAndBuyingIntentTrends.byMarketTierQueried[rpcArgs.marketTier] || 0) + 1;
      }
      if (rpcArgs.callerSectorOrTrend) {
        const cleanTopic = String(rpcArgs.callerSectorOrTrend).trim().toLowerCase().slice(0, 60);
        if (cleanTopic) {
          const topicKeys = Object.keys(this.searchAndBuyingIntentTrends.reportedCallerSectorsAndTopics);
          if (
            this.searchAndBuyingIntentTrends.reportedCallerSectorsAndTopics[cleanTopic] !== undefined ||
            topicKeys.length < MAX_TREND_TOPICS_CAP
          ) {
            this.searchAndBuyingIntentTrends.reportedCallerSectorsAndTopics[cleanTopic] =
              (this.searchAndBuyingIntentTrends.reportedCallerSectorsAndTopics[cleanTopic] || 0) + 1;
          }

          // Actualizar también el ledger de quién buscó y con qué palabra clave en ese sector (tope 12 entradas por sector)
          if (!this.sectorKeywordLedger[sector]) {
            this.sectorKeywordLedger[sector] = [];
          }
          const existingEntry = this.sectorKeywordLedger[sector].find((e) => e.whoSearched === userAgent);
          if (existingEntry) {
            existingEntry.searchFrequencyCount += 1;
            if (
              !existingEntry.exactKeywordsQueried.includes(cleanTopic) &&
              existingEntry.exactKeywordsQueried.length < 8
            ) {
              existingEntry.exactKeywordsQueried.push(cleanTopic);
            }
            if (mcpTool) existingEntry.lastToolQueried = mcpTool;
          } else if (this.sectorKeywordLedger[sector].length < 12) {
            this.sectorKeywordLedger[sector].push({
              whoSearched: userAgent.slice(0, 90),
              searchFrequencyCount: 1,
              exactKeywordsQueried: [cleanTopic],
              lastToolQueried: mcpTool || endpoint,
            });
          }
        }
      }
    }
  }

  /**
   * Devuelve el resumen del Radar.
   * Si includeUnlockedRawIdentities === false (modo público para IAs externas), oculta QUIÉN hizo la búsqueda,
   * CUÁNTAS veces buscó cada agente y QUÉ palabras clave exactas usó, exigiendo Registro (1 sola consulta gratis de 1 sector)
   * o Pago Individual por Sector/Búsqueda (0.25 USDC en Base Mainnet).
   */
  getSummary(currentSessionExternalHits = 0, { includeUnlockedRawIdentities = false } = {}) {
    const sectorBreakdown = {};
    for (const [sector, totalHits] of Object.entries(this.byIndustrySector)) {
      if (includeUnlockedRawIdentities) {
        const topAgentsInSector = Object.entries(this.allTimeByUserAgent)
          .filter(([ua]) => classifyAgentIndustrySector(ua) === sector)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([agent, hits]) => ({ agent, hits }));
        sectorBreakdown[sector] = {
          totalHits,
          topAgents: topAgentsInSector,
          whoSearchedAndKeywords: this.sectorKeywordLedger[sector] || [],
        };
      } else {
        const countAgents = Object.keys(this.allTimeByUserAgent).filter(
          (ua) => classifyAgentIndustrySector(ua) === sector
        ).length;
        sectorBreakdown[sector] = {
          totalHits,
          uniqueAgentsInSectorCount: countAgents,
          whoSearchedAndKeywordFrequencyStatus:
            "LOCKED_REGISTER_FOR_1_TIME_SINGLE_SECTOR_TRIAL_OR_PAY_0.25_USDC_PER_SECTOR",
          lockedPreviewNote: `${countAgents} verified AI agents performed ${totalHits} queries in ${sector}. Exact agent identities (who searched), search frequency counts, and exact keywords are locked. Unlock 1 sector once by registering in manage_buyer_finops_spend_passport, or pay 0.25 USDC per individual sector/keyword via notarize_and_witness_a2a_deal (serviceId: 'x402-radar-single-sector-intel').`,
        };
      }
    }

    return {
      allTimeTotalExternalHits: this.historicalSeedHits + Number(currentSessionExternalHits || 0),
      historicalSeedBaselineHits: this.historicalSeedHits,
      currentContainerSessionHits: Number(currentSessionExternalHits || 0),
      uniqueClassifiedAgentsCount: Object.keys(this.allTimeByUserAgent).length,
      commercialAccessPolicy: {
        model: "SINGLE_USE_REGISTRATION_TRIAL_THEN_PAY_PER_SECTOR_OR_KEYWORD",
        freeRegistrationBenefit:
          "Registering in manage_buyer_finops_spend_passport grants ONE (1) single-use unlock for ONE (1) specific sector or keyword query (not eternal, not all sectors).",
        paidPerSectorOrKeywordPriceUsdc: 0.25,
        bulkFullDatabaseDumpAllowed: false,
        rule: "Each additional sector or keyword query requires a separate 0.25 USDC Base Mainnet payment via notarize_and_witness_a2a_deal (serviceId: 'x402-radar-single-sector-intel').",
      },
      memorySafetyGuardrail: {
        maxUniqueAgentsCap: MAX_UNIQUE_AGENTS_CAP,
        maxTrendTopicsCap: MAX_TREND_TOPICS_CAP,
        estimatedRamFootprintKb: 28,
        percentOfRender512MbRam: "0.005%",
      },
      byIndustrySector: sectorBreakdown,
      searchAndBuyingIntentTrends: includeUnlockedRawIdentities
        ? this.searchAndBuyingIntentTrends
        : {
            byVerticalQueried: this.searchAndBuyingIntentTrends.byVerticalQueried,
            byMarketTierQueried: this.searchAndBuyingIntentTrends.byMarketTierQueried,
            exactKeywordsAndWhoSearched:
              "LOCKED — Query 1 specific sector or keyword using your 1-time registration token or pay 0.25 USDC per sector/keyword.",
          },
    };
  }
}
