import { createAnonymousCounters } from "./anonymousCounters.js";
import { PUBLIC_REGISTRY_TERMS, PUBLIC_REGISTRY_TERMS_VERSION } from "./dataPolicy.js";

export const STORE_ONBOARDING_SAMPLE_PATH = "/stores/onboarding/sample.json";

const FUNNEL_FIELDS = ["previews", "submissions", "certified", "tests"];

export const ONBOARDING_EXAMPLES_BY_VERTICAL = {
  VERTICAL_1_DATASET: {
    acceptPublicRegistryTerms: true,
    storeId: "example-cme-dataset-store",
    storeName: "Example CME Microstructure Store",
    walletAddress: "0x1111111111111111111111111111111111111111",
    endpointUrl: "https://datasets.example/mcp",
    vertical: "VERTICAL_1_DATASET",
    marketTier: "INSTITUTIONAL_B2B",
    startingPriceUsdc: 15,
    sampleDeliverable: {
      rows: [
        { id: 1, symbol: "NQ", price: 20150.25, summary: "CME Globex institutional order flow" },
        { id: 2, symbol: "ES", price: 5920.5, summary: "CME Globex liquidity depth" },
        { id: 3, symbol: "YM", price: 43800.0, summary: "CME Globex futures spread" },
      ],
      minRows: 2,
      topicKeywords: ["cme", "globex", "liquidity"],
    },
  },
  VERTICAL_2_QUANT_ALPHA: {
    acceptPublicRegistryTerms: true,
    storeId: "example-quant-backtest-store",
    storeName: "Example Quant Strategy Lab",
    walletAddress: "0x2222222222222222222222222222222222222222",
    endpointUrl: "https://quant.example/mcp",
    vertical: "VERTICAL_2_QUANT_ALPHA",
    marketTier: "INSTITUTIONAL_B2B",
    startingPriceUsdc: 25,
    sampleDeliverable: {
      trades: [
        { tradeId: "T1", symbol: "NQ", entryTimestampMs: 1710000000000, exitTimestampMs: 1710003600000, pnlUsd: 350 },
        { tradeId: "T2", symbol: "NQ", entryTimestampMs: 1710007200000, exitTimestampMs: 1710010800000, pnlUsd: -90 },
        { tradeId: "T3", symbol: "NQ", entryTimestampMs: 1710014400000, exitTimestampMs: 1710018000000, pnlUsd: 290 },
      ],
      minTrades: 3,
      minProfitFactor: 1.1,
      maxDrawdownPct: 35.0,
    },
  },
  VERTICAL_3_SOLIDITY_SECURITY: {
    acceptPublicRegistryTerms: true,
    storeId: "example-solidity-vault-store",
    storeName: "Example Solidity Security Lab",
    walletAddress: "0x3333333333333333333333333333333333333333",
    endpointUrl: "https://solidity.example/mcp",
    vertical: "VERTICAL_3_SOLIDITY_SECURITY",
    marketTier: "RETAIL_INDIE",
    startingPriceUsdc: 10,
    sampleDeliverable: {
      contractName: "SafeEscrowVault",
      soliditySourceCode:
        "// SPDX-License-Identifier: MIT\npragma solidity 0.8.38;\ncontract SafeEscrowVault { uint256 public version = 1; function ping() external pure returns (bool) { return true; } }",
      requiredFunctions: ["ping"],
    },
  },
  VERTICAL_4_X402_ORACLES: {
    acceptPublicRegistryTerms: true,
    storeId: "example-x402-oracle-store",
    storeName: "Example x402 Low-Latency Oracle",
    walletAddress: "0x4444444444444444444444444444444444444444",
    endpointUrl: "https://oracle.example/mcp",
    vertical: "VERTICAL_4_X402_ORACLES",
    marketTier: "INSTITUTIONAL_B2B",
    startingPriceUsdc: 5,
    sampleDeliverable: {
      apiResponsePayload: { symbol: "NQ", price: 20150.25, timestamp: 1763550000000 },
      observedLatencyMs: 38,
      maxLatencyMs: 250,
      requiredKeys: ["symbol", "price", "timestamp"],
    },
  },
  VERTICAL_5_CERTIFIED_SKILLS: {
    acceptPublicRegistryTerms: true,
    storeId: "example-certified-skill-store",
    storeName: "Example Verified Skill Publisher",
    walletAddress: "0x5555555555555555555555555555555555555555",
    endpointUrl: "https://skills.example/mcp",
    vertical: "VERTICAL_5_CERTIFIED_SKILLS",
    marketTier: "RETAIL_INDIE",
    startingPriceUsdc: 5,
    sampleDeliverable: {
      skillMarkdown:
        "---\nname: example-read-only-skill\ndescription: Clean read-only agent skill verified by VERITAS-8183.\n---\n# Instructions\nPerform safe read-only analysis without reading secrets or executing shell commands.",
      bundledScripts: "",
      requiredSections: ["name:", "description:"],
    },
  },
  VERTICAL_6_RAG_KNOWLEDGE: {
    acceptPublicRegistryTerms: true,
    storeId: "example-rag-embeddings-store",
    storeName: "Example RAG Knowledge Provider",
    walletAddress: "0x6666666666666666666666666666666666666666",
    endpointUrl: "https://rag.example/mcp",
    vertical: "VERTICAL_6_RAG_KNOWLEDGE",
    marketTier: "INSTITUTIONAL_B2B",
    startingPriceUsdc: 12,
    sampleDeliverable: {
      chunks: [
        { id: "c1", text: "Verified CME Globex NQ institutional liquidity analysis.", embedding: [0.5, 0.5, 0.5, 0.5] },
        { id: "c2", text: "Sourcify exact_match smart contract escrow verification.", embedding: [0.5, -0.5, 0.5, -0.5] },
      ],
      expectedDimension: 4,
      minChunks: 2,
    },
  },
  VERTICAL_7_VERIFIED_INFERENCE: {
    acceptPublicRegistryTerms: true,
    storeId: "example-verified-inference-store",
    storeName: "Example Proof-of-Inference Node",
    walletAddress: "0x7777777777777777777777777777777777777777",
    endpointUrl: "https://inference.example/mcp",
    vertical: "VERTICAL_7_VERIFIED_INFERENCE",
    marketTier: "INSTITUTIONAL_B2B",
    startingPriceUsdc: 8,
    sampleDeliverable: {
      responseText:
        "Verified deterministic reasoning trace evaluating non-custodial ERC-8183 escrow settlement invariants on Base Mainnet.",
      billedOutputTokens: 18,
      mustIncludeTerms: ["ERC-8183", "Base Mainnet"],
      forbiddenTerms: [],
      minUniqueWordRatio: 0.35,
    },
  },
  VERTICAL_8_DEPIN_GPU: {
    acceptPublicRegistryTerms: true,
    storeId: "example-depin-gpu-store",
    storeName: "Example DePIN H100 Compute Provider",
    walletAddress: "0x8888888888888888888888888888888888888888",
    endpointUrl: "https://gpu.example/mcp",
    vertical: "VERTICAL_8_DEPIN_GPU",
    marketTier: "INSTITUTIONAL_B2B",
    startingPriceUsdc: 45,
    sampleDeliverable: {
      benchmarkReport: {
        gpuModel: "NVIDIA-H100-SXM5",
        achievedTflopsFp16: 790,
        vramGb: 80,
        memoryBandwidthGbs: 2400,
        peakTempCelsius: 68,
      },
      minTflopsFp16: 120,
      minVramGb: 40,
      minMemoryBandwidthGbs: 900,
      maxTempCelsius: 85,
    },
  },
};

export function getStoreOnboardingPreview({ vertical = null } = {}) {
  const selectedVertical =
    typeof vertical === "string" && Object.hasOwn(ONBOARDING_EXAMPLES_BY_VERTICAL, vertical)
      ? vertical
      : null;
  const examplesByVertical = selectedVertical
    ? { [selectedVertical]: ONBOARDING_EXAMPLES_BY_VERTICAL[selectedVertical] }
    : ONBOARDING_EXAMPLES_BY_VERTICAL;

  return {
    ok: true,
    sample: true,
    mode: "ONBOARDING_PREVIEW",
    tool: "register_and_certify_store",
    description:
      "Fictional read-only onboarding preview. No store was registered or modified. To submit your store for deterministic audit and public listing, call register_and_certify_store with storeId, acceptPublicRegistryTerms: true, and a sampleDeliverable for your vertical.",
    feeSchedule: {
      upfrontRegistrationFeeUsdc: 0,
      brokerReferralFeePct: 2.0,
      escrowSettlementFeePctRange: "1.0% - 1.5%",
    },
    publicRegistryTermsVersion: PUBLIC_REGISTRY_TERMS_VERSION,
    publicRegistryTerms: PUBLIC_REGISTRY_TERMS,
    privacyPolicy: "https://own-adam.onrender.com/privacy",
    howToSubmit: {
      requiredFieldsForSubmission: ["storeId", "acceptPublicRegistryTerms"],
      recommendedFields: [
        "storeName",
        "walletAddress",
        "endpointUrl",
        "vertical",
        "marketTier",
        "startingPriceUsdc",
        "sampleDeliverable",
      ],
      consentRequirement:
        "You must pass acceptPublicRegistryTerms: true when submitting a store so that explicit public listing consent is recorded.",
      howToWithdraw:
        "To remove an existing store from the public registry, call register_and_certify_store with { storeId, acceptPublicRegistryTerms: false }.",
    },
    selectedVertical: selectedVertical || "ALL_8_VERTICALS",
    examplesByVertical,
  };
}

export function createStoreOnboardingCounters({ useUpstash = false } = {}) {
  const counters = createAnonymousCounters({
    redisKey: "veritas:store-onboarding-funnel:v1",
    fields: FUNNEL_FIELDS,
    useUpstash,
  });

  return {
    async recordStep(step, { isTest = false } = {}) {
      if (isTest) {
        await counters.record("tests");
        return;
      }
      if (!FUNNEL_FIELDS.includes(step) || step === "tests") return;
      await counters.record(step);
    },

    async snapshot() {
      return counters.snapshot();
    },
  };
}
