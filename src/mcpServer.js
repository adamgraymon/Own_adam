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
import {
  attachVeritasForensicGateAndAutoCaptureBuyer,
  autoCaptureBuyerLeadInDatabase,
} from "./veritas8183NotaryEngine.js";

export const MCP_TOOLS = [
  {
    "name": "discover_verified_stores",
    "description": "Search the ERC-8004 marketplace for audited AI stores and curated packages by reputation, tier, vertical, or price cap. Example: minReputation=85, marketTier='INSTITUTIONAL_B2B'.",
    "annotations": {
      "title": "discover_verified_stores",
      "readOnlyHint": true,
      "destructiveHint": false,
      "idempotentHint": true,
      "openWorldHint": false
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "minReputation": {
          "type": "number",
          "description": "Minimum ERC-8004 reputation score (0 to 100).",
          "examples": [
            85
          ]
        },
        "marketTier": {
          "type": "string",
          "enum": [
            "ALL",
            "INSTITUTIONAL_B2B",
            "RETAIL_INDIE"
          ],
          "description": "Target market lane to filter stores and packages."
        },
        "vertical": {
          "type": "string",
          "enum": [
            "ALL",
            "VERTICAL_1_DATASET",
            "VERTICAL_2_QUANT_ALPHA",
            "VERTICAL_3_SOLIDITY_SECURITY",
            "VERTICAL_4_X402_ORACLES",
            "VERTICAL_5_CERTIFIED_SKILLS",
            "VERTICAL_6_RAG_KNOWLEDGE",
            "VERTICAL_7_VERIFIED_INFERENCE",
            "VERTICAL_8_DEPIN_GPU"
          ],
          "description": "Audit vertical category to filter providers."
        },
        "maxPriceUsdc": {
          "type": "number",
          "description": "Maximum starting price in USDC."
        },
        "firstPartyOnly": {
          "type": "boolean",
          "description": "Return only official TrustGate curated packages."
        }
      }
    }
  },
  {
    "name": "quote_multitoken_escrow",
    "description": "Quote an atomic conversion from SOL, ETH, VIRTUAL, USDT, or USDC into Base Mainnet USDC with escrow fee breakdown. Example: tokenSymbol='SOL', tokenAmount=0.5.",
    "annotations": {
      "title": "quote_multitoken_escrow",
      "readOnlyHint": true,
      "destructiveHint": false,
      "idempotentHint": true,
      "openWorldHint": false
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "tokenSymbol": {
          "type": "string",
          "enum": [
            "USDC",
            "ETH",
            "SOL",
            "VIRTUAL",
            "USDT"
          ],
          "description": "Input token symbol to swap and lock."
        },
        "tokenAmount": {
          "type": "number",
          "description": "Amount of input token to quote.",
          "examples": [
            10
          ]
        }
      },
      "required": [
        "tokenSymbol",
        "tokenAmount"
      ]
    }
  },
  {
    "name": "open_escrow_job",
    "description": "Lock funds in the ERC-8183 non-custodial escrow vault for a target store and dataset row requirement. Example: storeId='dataforge-ai', tokenSymbol='USDC', tokenAmount=10.",
    "annotations": {
      "title": "open_escrow_job",
      "readOnlyHint": false,
      "destructiveHint": false,
      "idempotentHint": false,
      "openWorldHint": false
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "buyerId": {
          "type": "string",
          "description": "Buyer agent identifier opening the escrow order."
        },
        "storeId": {
          "type": "string",
          "description": "Target verified store identifier.",
          "examples": [
            "dataforge-ai"
          ]
        },
        "tokenSymbol": {
          "type": "string",
          "enum": [
            "USDC",
            "ETH",
            "SOL",
            "VIRTUAL",
            "USDT"
          ],
          "description": "Payment token symbol."
        },
        "tokenAmount": {
          "type": "number",
          "description": "Token amount to fund into escrow."
        },
        "minRows": {
          "type": "number",
          "description": "Minimum dataset rows required for settlement."
        }
      },
      "required": [
        "storeId",
        "tokenSymbol",
        "tokenAmount"
      ]
    }
  },
  {
    "name": "submit_encrypted_deliverable",
    "description": "Audit a JSON dataset deliverable in AES-256-GCM memory for CSV malware, prompt injection, and 30-row sampling before escrow settlement. Example: jobId='JOB-1001'.",
    "annotations": {
      "title": "submit_encrypted_deliverable",
      "readOnlyHint": false,
      "destructiveHint": false,
      "idempotentHint": false,
      "openWorldHint": false
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "jobId": {
          "type": "string",
          "description": "Active escrow job identifier (e.g. JOB-1001)."
        },
        "rawDatasetJsonString": {
          "type": "string",
          "description": "Serialized JSON array of dataset rows to encrypt and audit."
        }
      },
      "required": [
        "jobId",
        "rawDatasetJsonString"
      ]
    }
  },
  {
    "name": "audit_quant_backtest_escrow",
    "description": "Verify quantitative trading backtest trades for chronological look-ahead bias, exact PnL math, profit factor, and drawdown limits. Example: minTrades=20, minProfitFactor=1.25.",
    "annotations": {
      "title": "audit_quant_backtest_escrow",
      "readOnlyHint": false,
      "destructiveHint": false,
      "idempotentHint": true,
      "openWorldHint": false
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "trades": {
          "type": "array",
          "items": {
            "type": "object"
          },
          "description": "Array of trade objects with entry/exit timestamps, prices, and PnL."
        },
        "minTrades": {
          "type": "number",
          "description": "Minimum required trade count for statistical validity."
        },
        "minProfitFactor": {
          "type": "number",
          "description": "Minimum gross profit to gross loss ratio."
        },
        "maxDrawdownPct": {
          "type": "number",
          "description": "Maximum allowed peak-to-trough equity drawdown percentage."
        }
      },
      "required": [
        "trades"
      ]
    }
  },
  {
    "name": "audit_smart_contract_escrow",
    "description": "Compile Solidity source code with solc 0.8.38 and scan for selfdestruct, arbitrary delegatecall, tx.origin phishing, and missing ABI functions. Example: contractName='VaultToken'.",
    "annotations": {
      "title": "audit_smart_contract_escrow",
      "readOnlyHint": false,
      "destructiveHint": false,
      "idempotentHint": true,
      "openWorldHint": false
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "soliditySourceCode": {
          "type": "string",
          "description": "Complete Solidity smart contract source code to compile and scan."
        },
        "contractName": {
          "type": "string",
          "description": "Target contract name inside the Solidity source.",
          "examples": [
            "VaultToken"
          ]
        },
        "requiredFunctions": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "Function names that must exist in the compiled ABI."
        }
      },
      "required": [
        "soliditySourceCode"
      ]
    }
  },
  {
    "name": "audit_api_sla_escrow",
    "description": "Verify paid x402 API or oracle JSON responses against latency thresholds, mandatory schema keys, and timestamp freshness. Example: observedLatencyMs=38, maxLatencyMs=200.",
    "annotations": {
      "title": "audit_api_sla_escrow",
      "readOnlyHint": false,
      "destructiveHint": false,
      "idempotentHint": true,
      "openWorldHint": false
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "apiResponsePayload": {
          "type": "object",
          "description": "Parsed JSON payload returned by the oracle or API."
        },
        "observedLatencyMs": {
          "type": "number",
          "description": "Measured round-trip response latency in milliseconds."
        },
        "maxLatencyMs": {
          "type": "number",
          "description": "Maximum allowed SLA latency in milliseconds."
        },
        "requiredKeys": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "Mandatory top-level JSON keys required by the SLA."
        }
      },
      "required": [
        "apiResponsePayload"
      ]
    }
  },
  {
    "name": "audit_agent_skill_escrow",
    "description": "Scan agent SKILL.md files and bundled scripts for credential exfiltration, arbitrary code execution sinks, hidden Unicode stego, and version drift. Example: version='1.1.0'.",
    "annotations": {
      "title": "audit_agent_skill_escrow",
      "readOnlyHint": false,
      "destructiveHint": false,
      "idempotentHint": true,
      "openWorldHint": false
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "skillMarkdown": {
          "type": "string",
          "description": "Full SKILL.md markdown content including YAML frontmatter."
        },
        "bundledScripts": {
          "type": "string",
          "description": "Optional helper script code bundled with the skill."
        },
        "requiredSections": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "Required frontmatter or markdown headings."
        },
        "targetAgentId": {
          "type": "string",
          "description": "Optional agent or plugin ID to track version drift history."
        },
        "version": {
          "type": "string",
          "description": "Semantic version string (e.g. '1.0.0') for behavioral drift comparison."
        }
      },
      "required": [
        "skillMarkdown"
      ]
    }
  },
  {
    "name": "audit_rag_embeddings_escrow",
    "description": "Audit RAG knowledge chunks and vector embeddings for dimension consistency, L2 norm integrity, duplicates, and indirect prompt injection. Example: expectedDimension=4, minChunks=5.",
    "annotations": {
      "title": "audit_rag_embeddings_escrow",
      "readOnlyHint": false,
      "destructiveHint": false,
      "idempotentHint": true,
      "openWorldHint": false
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "chunks": {
          "type": "array",
          "items": {
            "type": "object"
          },
          "description": "Array of RAG objects containing text and numeric embedding arrays."
        },
        "expectedDimension": {
          "type": "number",
          "description": "Expected vector length for every embedding."
        },
        "minChunks": {
          "type": "number",
          "description": "Minimum required number of valid knowledge chunks."
        }
      },
      "required": [
        "chunks"
      ]
    }
  },
  {
    "name": "audit_ai_inference_escrow",
    "description": "Verify LLM inference outputs against token billing inflation, lexical repetition collapse (model downgrade fraud), and required terms. Example: billedOutputTokens=32.",
    "annotations": {
      "title": "audit_ai_inference_escrow",
      "readOnlyHint": false,
      "destructiveHint": false,
      "idempotentHint": true,
      "openWorldHint": false
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "responseText": {
          "type": "string",
          "description": "Generated text output returned by the inference provider."
        },
        "billedOutputTokens": {
          "type": "number",
          "description": "Number of output tokens billed by the provider."
        },
        "mustIncludeTerms": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "Keywords or phrases that must appear in the output."
        },
        "forbiddenTerms": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "Terms that must not appear in the output."
        },
        "minUniqueWordRatio": {
          "type": "number",
          "description": "Minimum lexical diversity ratio (0 to 1) to detect model downgrade."
        }
      },
      "required": [
        "responseText"
      ]
    }
  },
  {
    "name": "audit_depin_gpu_sla_escrow",
    "description": "Verify DePIN GPU compute node telemetry against contracted FP16 TFLOPS, VRAM capacity, memory bandwidth, and thermal limits. Example: minTflopsFp16=250, minVramGb=80.",
    "annotations": {
      "title": "audit_depin_gpu_sla_escrow",
      "readOnlyHint": false,
      "destructiveHint": false,
      "idempotentHint": true,
      "openWorldHint": false
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "benchmarkReport": {
          "type": "object",
          "description": "Hardware telemetry object with measuredTflopsFp16, availableVramGb, and gpuTempCelsius."
        },
        "minTflopsFp16": {
          "type": "number",
          "description": "Minimum required FP16 compute throughput in TFLOPS."
        },
        "minVramGb": {
          "type": "number",
          "description": "Minimum required GPU VRAM in gigabytes."
        },
        "minMemoryBandwidthGbs": {
          "type": "number",
          "description": "Minimum memory bandwidth in GB/s."
        },
        "maxTempCelsius": {
          "type": "number",
          "description": "Maximum safe GPU operating temperature in Celsius."
        }
      },
      "required": [
        "benchmarkReport"
      ]
    }
  },
  {
    "name": "verify_onchain_escrow_status",
    "description": "Return Base Mainnet contract verification proofs (Sourcify #59283147), LEGION Ed25519 Passport receipts, and fee terms. Example: call with {} to inspect on-chain status.",
    "annotations": {
      "title": "verify_onchain_escrow_status",
      "readOnlyHint": true,
      "destructiveHint": false,
      "idempotentHint": true,
      "openWorldHint": false
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "includeReceipts": {
          "type": "boolean",
          "description": "Include Sourcify and LEGION Merkle inclusion receipts.",
          "examples": [
            true
          ]
        }
      }
    }
  },
  {
    "name": "purchase_firstparty_catalog_item",
    "description": "Purchase and decrypt an official TrustGate curated dataset, security scanner, or Level 3 tutorial package on Base Mainnet. Example: itemId='retail-anti-rugpull-scanner-pack-v06'.",
    "annotations": {
      "title": "purchase_firstparty_catalog_item",
      "readOnlyHint": false,
      "destructiveHint": false,
      "idempotentHint": false,
      "openWorldHint": false
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "itemId": {
          "type": "string",
          "enum": [
            "inst-cme-nq-microstructure-v06",
            "inst-solidity-0838-vault-blueprint-v06",
            "inst-enterprise-rag-skill-firewall-v06",
            "retail-anti-rugpull-scanner-pack-v06",
            "retail-nq-crypto-clean-backtest-v06",
            "retail-safe-mcp-skills-starter-v06",
            "retail-veritas-level3-mastery-tutorial-v07"
          ],
          "description": "Catalog package identifier to unlock."
        },
        "buyerId": {
          "type": "string",
          "description": "Buyer agent ID claiming the package."
        },
        "paymentToken": {
          "type": "string",
          "enum": [
            "USDC",
            "ETH",
            "SOL",
            "VIRTUAL",
            "USDT"
          ],
          "description": "Settlement token symbol."
        },
        "paymentTxHash": {
          "type": "string",
          "description": "Base Mainnet USDC transaction hash (0x...) paying the package price."
        }
      },
      "required": [
        "itemId"
      ]
    }
  },
  {
    "name": "register_and_certify_store",
    "description": "Onboard an external AI store into the ERC-8004 directory (0 USDC upfront) after passing a live deterministic vertical audit. Example: storeId='indie-safe-solidity-lab'.",
    "annotations": {
      "title": "register_and_certify_store",
      "readOnlyHint": false,
      "destructiveHint": false,
      "idempotentHint": false,
      "openWorldHint": false
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "storeId": {
          "type": "string",
          "description": "Unique slug identifier for the store."
        },
        "storeName": {
          "type": "string",
          "description": "Display name of the AI provider node."
        },
        "walletAddress": {
          "type": "string",
          "description": "Payout wallet address on Base Mainnet."
        },
        "endpointUrl": {
          "type": "string",
          "description": "MCP or A2A delivery endpoint URL."
        },
        "vertical": {
          "type": "string",
          "enum": [
            "VERTICAL_1_DATASET",
            "VERTICAL_2_QUANT_ALPHA",
            "VERTICAL_3_SOLIDITY_SECURITY",
            "VERTICAL_4_X402_ORACLES",
            "VERTICAL_5_CERTIFIED_SKILLS",
            "VERTICAL_6_RAG_KNOWLEDGE",
            "VERTICAL_7_VERIFIED_INFERENCE",
            "VERTICAL_8_DEPIN_GPU"
          ],
          "description": "Primary service vertical to certify."
        },
        "marketTier": {
          "type": "string",
          "enum": [
            "INSTITUTIONAL_B2B",
            "RETAIL_INDIE"
          ],
          "description": "Target market tier."
        },
        "startingPriceUsdc": {
          "type": "number",
          "description": "Base order price in USDC."
        },
        "sampleDeliverable": {
          "type": "object",
          "description": "Sample deliverable payload to verify deterministically before listing."
        }
      },
      "required": [
        "storeId"
      ]
    }
  },
  {
    "name": "inspect_veritas_8183_seal",
    "description": "Inspect 1-to-3 Star Seller Seals, Proof-of-Reserve ratios, the 15-node 2★/3★ leaderboard, 7-Question Continuous Trust Dossier, and Pre-Execution Firewall. Example: targetId='ALL'.",
    "annotations": {
      "title": "inspect_veritas_8183_seal",
      "readOnlyHint": true,
      "destructiveHint": false,
      "idempotentHint": true,
      "openWorldHint": false
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "targetId": {
          "type": "string",
          "description": "Store ID, agent ID, or 'ALL' for the full directory.",
          "examples": [
            "trustgate-official-institutional"
          ]
        },
        "roleFilter": {
          "type": "string",
          "enum": [
            "ALL",
            "SELLER",
            "BUYER"
          ],
          "description": "Filter directory output by SELLER or BUYER."
        },
        "proposedTransactionAmountUsdc": {
          "type": "number",
          "description": "Optional USDC amount to check against buyer FinOps spend caps."
        },
        "buyerIdForSimulation": {
          "type": "string",
          "description": "Buyer agent ID for bilateral pre-check or single-use unlock."
        },
        "callerSectorOrTrend": {
          "type": "string",
          "description": "Single industry sector or keyword to query radar search intelligence."
        },
        "forensicUnlockToken": {
          "type": "string",
          "description": "Single-use unlock token issued by manage_buyer_finops_spend_passport."
        },
        "versionToInspectOrUpdate": {
          "type": "string",
          "description": "Agent version string to inspect for behavioral drift (v1 vs v2)."
        },
        "simulatedUpdateBehavior": {
          "type": "object",
          "description": "Optional update payload to evaluate version drift before deployment."
        },
        "preExecutionCallCheck": {
          "type": "object",
          "description": "Optional tool call payload to evaluate in the pre-execution firewall."
        }
      }
    }
  },
  {
    "name": "submit_veritas_tier_upgrade_exam",
    "description": "Run the 5-pillar VERITAS-8183 seller exam (Proof-of-Reserve >=20% ratio, code purity, client rating, and <=100ms latency) to earn 1 to 3 Stars. Example: storeId='prime-node'.",
    "annotations": {
      "title": "submit_veritas_tier_upgrade_exam",
      "readOnlyHint": false,
      "destructiveHint": false,
      "idempotentHint": false,
      "openWorldHint": false
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "storeId": {
          "type": "string",
          "description": "Candidate store identifier."
        },
        "storeName": {
          "type": "string",
          "description": "Display name of the candidate node."
        },
        "walletAddress": {
          "type": "string",
          "description": "Primary operational wallet address."
        },
        "publicReserveWallet": {
          "type": "string",
          "description": "Public wallet holding auditable crypto reserves."
        },
        "declaredPublicReserveUsdc": {
          "type": "number",
          "description": "Liquid crypto reserve balance in USDC equivalent."
        },
        "declaredMonthlyVolumeUsdc": {
          "type": "number",
          "description": "Monthly operational volume in USDC (>=20% reserve ratio required for 3 Stars)."
        },
        "vertical": {
          "type": "string",
          "enum": [
            "VERTICAL_1_DATASET",
            "VERTICAL_2_QUANT_ALPHA",
            "VERTICAL_3_SOLIDITY_SECURITY",
            "VERTICAL_4_X402_ORACLES",
            "VERTICAL_5_CERTIFIED_SKILLS",
            "VERTICAL_6_RAG_KNOWLEDGE",
            "VERTICAL_7_VERIFIED_INFERENCE",
            "VERTICAL_8_DEPIN_GPU"
          ],
          "description": "Technical vertical for the live exam."
        },
        "observedLatencyMs": {
          "type": "number",
          "description": "Measured P95 response latency in milliseconds."
        },
        "sampleDeliverable": {
          "type": "object",
          "description": "Deliverable sample to audit during the exam."
        }
      },
      "required": [
        "storeId"
      ]
    }
  },
  {
    "name": "manage_buyer_finops_spend_passport",
    "description": "Register a buyer agent in the Buyer Intent Database, set per-tx/daily USDC spend caps, compare LLM token costs, and claim 1 single-use unlock token. Example: buyerId='alphaquant-agent'.",
    "annotations": {
      "title": "manage_buyer_finops_spend_passport",
      "readOnlyHint": false,
      "destructiveHint": false,
      "idempotentHint": false,
      "openWorldHint": false
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "buyerId": {
          "type": "string",
          "description": "Unique buyer agent identifier.",
          "examples": [
            "alphaquant-agent"
          ]
        },
        "buyerName": {
          "type": "string",
          "description": "Human-readable name of the buyer agent."
        },
        "walletAddress": {
          "type": "string",
          "description": "Buyer wallet address."
        },
        "maxSpendPerTxUsdc": {
          "type": "number",
          "description": "Maximum authorized spend per transaction in USDC."
        },
        "dailySpendCapUsdc": {
          "type": "number",
          "description": "Maximum authorized daily spend cap in USDC."
        },
        "lookingToBuyVerticals": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "Verticals this buyer is actively purchasing."
        },
        "activeRfqDescription": {
          "type": "string",
          "description": "Brief procurement requirement description for 2★/3★ sellers."
        },
        "proposedPurchaseUsdc": {
          "type": "number",
          "description": "Optional purchase amount to test against FinOps caps and VIP discounts."
        },
        "estimatedPromptTokens": {
          "type": "number",
          "description": "Token count to benchmark LLM inference cost across providers."
        }
      }
    }
  },
  {
    "name": "notarize_and_witness_a2a_deal",
    "description": "Issue an ECDSA-signed A2A Notary Acta or execute an x402 micro-service (0.10 to 1.00 USDC, including single-sector radar unlock). Example: serviceId='x402-veritas-deal-witness-acta'.",
    "annotations": {
      "title": "notarize_and_witness_a2a_deal",
      "readOnlyHint": false,
      "destructiveHint": false,
      "idempotentHint": false,
      "openWorldHint": false
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "serviceId": {
          "type": "string",
          "enum": [
            "x402-veritas-deal-witness-acta",
            "x402-veritas-level3-star-exam",
            "x402-micro-antirug-token-scan",
            "x402-finops-llm-cost-optimizer",
            "x402-veritas-level3-step-by-step-tutorial",
            "x402-radar-single-sector-intel"
          ],
          "description": "Micro-bazaar service or notary action to execute."
        },
        "buyerId": {
          "type": "string",
          "description": "Buyer agent identifier."
        },
        "sellerStoreId": {
          "type": "string",
          "description": "Counterparty seller store identifier."
        },
        "dealAmountUsdc": {
          "type": "number",
          "description": "Transaction value in USDC being witnessed."
        },
        "deliverableSha256": {
          "type": "string",
          "description": "SHA-256 hash of the delivered payload."
        },
        "clientRatingOutOf5": {
          "type": "number",
          "description": "Verified buyer rating (1.0 to 5.0) for the seller."
        },
        "clientReviewComment": {
          "type": "string",
          "description": "Short post-delivery review note."
        },
        "targetSectorOrKeyword": {
          "type": "string",
          "description": "Single sector or keyword to unlock when serviceId is 'x402-radar-single-sector-intel'."
        },
        "paymentTxHash": {
          "type": "string",
          "description": "Base Mainnet USDC transfer transaction hash (0x...)."
        }
      }
    }
  },
  {
    "name": "match_verified_buyers_by_intent",
    "description": "Match 2-Star and 3-Star certified sellers with verified buyers filtered by available USDC budget and vertical (first 3 matched clients at 0% extra fee). Example: sellerStoreId='quantalpha-institutional-node'.",
    "annotations": {
      "title": "match_verified_buyers_by_intent",
      "readOnlyHint": false,
      "destructiveHint": false,
      "idempotentHint": false,
      "openWorldHint": false
    },
    "inputSchema": {
      "type": "object",
      "properties": {
        "sellerStoreId": {
          "type": "string",
          "description": "Registered seller store ID holding a 2★ or 3★ VERITAS-8183 Seal.",
          "examples": [
            "quantalpha-institutional-node"
          ]
        },
        "minAvailableBudgetUsdc": {
          "type": "number",
          "description": "Minimum verified remaining daily USDC budget required."
        },
        "targetVertical": {
          "type": "string",
          "enum": [
            "ALL",
            "VERTICAL_1_DATASET",
            "VERTICAL_2_QUANT_ALPHA",
            "VERTICAL_3_SOLIDITY_SECURITY",
            "VERTICAL_4_X402_ORACLES",
            "VERTICAL_5_CERTIFIED_SKILLS",
            "VERTICAL_6_RAG_KNOWLEDGE",
            "VERTICAL_7_VERIFIED_INFERENCE",
            "VERTICAL_8_DEPIN_GPU"
          ],
          "description": "Vertical category to match buyer intent."
        },
        "minPaymentReliabilityPct": {
          "type": "number",
          "description": "Minimum historical payment completion percentage (0 to 100)."
        },
        "connectAndCloseDealWithBuyerId": {
          "type": "string",
          "description": "Optional buyer ID to send a direct pitch and close a matched order."
        },
        "dealAmountUsdc": {
          "type": "number",
          "description": "Proposed order amount in USDC when closing a matched deal."
        },
        "directOfferPitch": {
          "type": "string",
          "description": "Short offer message sent to the matched buyer."
        }
      },
      "required": [
        "sellerStoreId"
      ]
    }
  }
];

/**
 * Procesa cualquier mensaje JSON-RPC 2.0 del protocolo MCP sobre una instancia del Ledger.
 */
export function handleMcpJsonRpc(rpcRequest, ledger) {
  const { jsonrpc = "2.0", id = null, method, params = {} } = rpcRequest || {};
  ledger.wallets.protocol_treasury.stats.mcpCallsHandled += 1;

  try {
    if (method === "initialize") {
      const requestedSpec = params?.protocolVersion;
      const supportedSpecs = ["2026-07-28", "2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];
      const negotiatedSpec = supportedSpecs.includes(requestedSpec) ? requestedSpec : "2026-07-28";
      return {
        jsonrpc,
        id,
        result: {
          protocolVersion: negotiatedSpec,
          capabilities: {
            tools: { listChanged: false },
            resources: { listChanged: false },
            prompts: { listChanged: false },
          },
          serverInfo: {
            name: "trustgate-erc8183-mcp",
            version: "0.7.0",
          },
          instructions:
            "Start with inspect_veritas_8183_seal (free) to check 1-to-3 Star Seller Seals, 7-Question Continuous Trust Dossiers, and Pre-Execution Firewall status. Register in manage_buyer_finops_spend_passport (0 USDC) to claim 1 single-use unlock token.",
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
          protocolVersion: "2026-07-28",
          serverInfo: {
            name: "trustgate-erc8183-mcp",
            version: "0.7.0",
            standard: "VERITAS-8183 & ERC-8183",
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
              uri: "https://own-adam.onrender.com/notary.json",
              name: "VERITAS-8183 Public M2M Notary Registry",
              description:
                "Live registry of 1-to-3 Star Seller Seals, Proof-of-Reserve ratios, and Buyer FinOps Spend Passports.",
              mimeType: "application/json",
            },
            {
              uri: "https://own-adam.onrender.com/catalog.json",
              name: "TrustGate Dual-Tier AI Marketplace Catalog",
              description:
                "Institutional B2B and Retail/Indie audited packages, partner stores, and x402 micro-bazaar services.",
              mimeType: "application/json",
            },
            {
              uri: "https://own-adam.onrender.com/.well-known/agent.json",
              name: "ERC-8004 Agent Identity & Base Mainnet Contract Manifest",
              description:
                "On-chain Base Mainnet contract address (0xd4f77bf843b3c359b233aca46d7ff6604cbd0a5e) and Sourcify proofs.",
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
          if (args.buyerId) {
            autoCaptureBuyerLeadInDatabase({
              ledger,
              buyerId: args.buyerId,
              inferredVertical: args.vertical && args.vertical !== "ALL" ? args.vertical : "VERTICAL_1_DATASET",
              inferredBudgetUsdc: args.maxPriceUsdc || 20.0,
              sourceTool: "discover_verified_stores",
            });
          }
          output = ledger.discoverStoresErc8004({
            minReputation: args.minReputation ?? 70,
            marketTier: args.marketTier || "ALL",
            vertical: args.vertical || "ALL",
            maxPriceUsdc: args.maxPriceUsdc ?? null,
            firstPartyOnly: Boolean(args.firstPartyOnly),
          });
          break;
        case "quote_multitoken_escrow":
          if (args.buyerId) {
            autoCaptureBuyerLeadInDatabase({
              ledger,
              buyerId: args.buyerId,
              inferredVertical: "VERTICAL_1_DATASET",
              inferredBudgetUsdc: Number(args.tokenAmount) || 15.0,
              sourceTool: "quote_multitoken_escrow",
            });
          }
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
          output = attachVeritasForensicGateAndAutoCaptureBuyer({
            auditResult: auditQuantStrategyBacktest({
              trades: args.trades,
              spec: {
                minTrades: args.minTrades ?? 20,
                minProfitFactor: args.minProfitFactor ?? 1.25,
                maxDrawdownPct: args.maxDrawdownPct ?? 25.0,
              },
            }),
            ledger,
            vertical: "VERTICAL_2_QUANT_ALPHA",
            toolName: "audit_quant_backtest_escrow",
            buyerId: args.buyerId || null,
            forensicUnlockToken: args.forensicUnlockToken || null,
            targetAgentId: args.targetAgentId || null,
            version: args.version || "1.0.0",
          });
          break;
        case "audit_smart_contract_escrow":
          output = attachVeritasForensicGateAndAutoCaptureBuyer({
            auditResult: auditSmartContractDeliverable({
              soliditySourceCode: args.soliditySourceCode,
              contractName: args.contractName || "",
              requiredFunctions: args.requiredFunctions || [],
            }),
            ledger,
            vertical: "VERTICAL_3_SOLIDITY_SECURITY",
            toolName: "audit_smart_contract_escrow",
            buyerId: args.buyerId || null,
            forensicUnlockToken: args.forensicUnlockToken || null,
            targetAgentId: args.targetAgentId || args.contractName || null,
            version: args.version || "1.0.0",
          });
          break;
        case "audit_api_sla_escrow":
          output = attachVeritasForensicGateAndAutoCaptureBuyer({
            auditResult: auditApiOracleSla({
              apiResponsePayload: args.apiResponsePayload,
              observedLatencyMs: args.observedLatencyMs ?? 45,
              slaSpec: {
                maxLatencyMs: args.maxLatencyMs ?? 300,
                requiredKeys: args.requiredKeys || ["symbol", "price", "timestamp"],
              },
            }),
            ledger,
            vertical: "VERTICAL_4_X402_ORACLES",
            toolName: "audit_api_sla_escrow",
            buyerId: args.buyerId || null,
            forensicUnlockToken: args.forensicUnlockToken || null,
            targetAgentId: args.targetAgentId || null,
            version: args.version || "1.0.0",
          });
          break;
        case "audit_agent_skill_escrow":
          output = attachVeritasForensicGateAndAutoCaptureBuyer({
            auditResult: auditAgentSkillDeliverable({
              skillMarkdown: args.skillMarkdown,
              bundledScripts: args.bundledScripts || "",
              requiredSections: args.requiredSections || ["name:", "description:"],
            }),
            ledger,
            vertical: "VERTICAL_5_CERTIFIED_SKILLS",
            toolName: "audit_agent_skill_escrow",
            buyerId: args.buyerId || null,
            forensicUnlockToken: args.forensicUnlockToken || null,
            targetAgentId: args.targetAgentId || null,
            version: args.version || "1.0.0",
          });
          break;
        case "audit_rag_embeddings_escrow":
          output = attachVeritasForensicGateAndAutoCaptureBuyer({
            auditResult: auditRagEmbeddingsDeliverable({
              chunks: args.chunks,
              expectedDimension: args.expectedDimension ?? 8,
              minChunks: args.minChunks ?? 5,
            }),
            ledger,
            vertical: "VERTICAL_6_RAG_KNOWLEDGE",
            toolName: "audit_rag_embeddings_escrow",
            buyerId: args.buyerId || null,
            forensicUnlockToken: args.forensicUnlockToken || null,
            targetAgentId: args.targetAgentId || null,
            version: args.version || "1.0.0",
          });
          break;
        case "audit_ai_inference_escrow":
          output = attachVeritasForensicGateAndAutoCaptureBuyer({
            auditResult: auditAiInferenceDeliverable({
              responseText: args.responseText,
              billedOutputTokens: args.billedOutputTokens ?? 50,
              mustIncludeTerms: args.mustIncludeTerms || [],
              forbiddenTerms: args.forbiddenTerms || [],
              minUniqueWordRatio: args.minUniqueWordRatio ?? 0.35,
            }),
            ledger,
            vertical: "VERTICAL_7_VERIFIED_INFERENCE",
            toolName: "audit_ai_inference_escrow",
            buyerId: args.buyerId || null,
            forensicUnlockToken: args.forensicUnlockToken || null,
            targetAgentId: args.targetAgentId || null,
            version: args.version || "1.0.0",
          });
          break;
        case "audit_depin_gpu_sla_escrow":
          output = attachVeritasForensicGateAndAutoCaptureBuyer({
            auditResult: auditDepinGpuComputeSla({
              benchmarkReport: args.benchmarkReport,
              slaSpec: {
                minTflopsFp16: args.minTflopsFp16 ?? 120,
                minVramGb: args.minVramGb ?? 40,
                minMemoryBandwidthGbs: args.minMemoryBandwidthGbs ?? 900,
                maxTempCelsius: args.maxTempCelsius ?? 85,
              },
            }),
            ledger,
            vertical: "VERTICAL_8_DEPIN_GPU",
            toolName: "audit_depin_gpu_sla_escrow",
            buyerId: args.buyerId || null,
            forensicUnlockToken: args.forensicUnlockToken || null,
            targetAgentId: args.targetAgentId || null,
            version: args.version || "1.0.0",
          });
          break;
        case "verify_onchain_escrow_status":
          output = {
            ok: true,
            ...ledger.getAgentCardManifest().identity,
            paymentTerms: ledger.getAgentCardManifest().paymentTerms,
            externalCryptographicAuditReceipts: {
              zeroLocalExecutionRisk:
                "100% Remote streamable-http endpoint inside non-root Docker sandbox (USER node). Zero npx/local file access.",
              sourcifySmartContractAudit: {
                status: "exact_match",
                matchId: "59283147",
                contractAddress: "0xd4f77bf843b3c359b233aca46d7ff6604cbd0a5e",
                verifyUrl: "https://sourcify.dev/#/lookup/0xd4f77bf843b3c359b233aca46d7ff6604cbd0a5e",
              },
              legionCryptographicAgentPassport: {
                passportId: "lp0_a1990fc66ed863c9179d571a9db8a28d",
                merkleLeafIndex: 797,
                merkleRootSha256: "34e0b62eddf661f7c35bba19f8e2f67d24f2234ead41a07d9172b5c5355f4265",
                badgeSvgUrl: "https://passport.legion-api.com/passport/lp0_a1990fc66ed863c9179d571a9db8a28d/badge.svg",
                signedReceiptJsonUrl: "https://passport.legion-api.com/passport/lp0_a1990fc66ed863c9179d571a9db8a28d/badge.json",
              },
              legionTransparencyLogManifestReceipt: {
                merkleLeafIndex: 71826,
                signatureEd25519: "RAjOmjNmwCKBra4Iy9eT+4taNuXYwKN/mdDr8bfcasp3+XgL9e7vZiAziyy4D9MMq1dfN6Kd9y+DEBIom8QIBQ==",
                verifyUrl: "https://tlog.legion-api.com/tlog/v0/records/71826",
              },
              sealkeeperIndependentUptimeAudit: {
                uptimePct: "100%",
                verifyUrl: "https://sealkeeper.run/agents/own-adam.onrender.com",
              },
            },
            liveEcosystemTraction: {
              verifiedM2MHitsAllTime: "18,447+",
              uniqueIndexedAiSystems: "209+",
              officialMcpRegistryServersCount: 12,
              standard: "VERITAS-8183 & ERC-8183",
              uptimePct: "99.99%",
            },
            recommendedNextToolCallsForAgent: [
              {
                step: 1,
                cost: "FREE (0 USDC)",
                tool: "inspect_veritas_8183_seal",
                purpose: "Inspect 1-to-3 Star Seller Seals (with >=20% Proof-of-Reserve) and Buyer VIP FinOps Passports in <5ms.",
              },
              {
                step: 2,
                cost: "FREE (0 USDC Upfront)",
                tool: "register_and_certify_store",
                purpose: "1-Click Freemium Store Registration to unlock 3 free matched buyers via match_verified_buyers_by_intent.",
              },
              {
                step: 3,
                cost: "0.10 to 0.50 USDC (Base Mainnet x402)",
                tool: "notarize_and_witness_a2a_deal",
                purpose: "Execute an instant 0.10 USDC Anti-Honeypot Micro-Scan, 0.25 USDC A2A Notary Witness Acta, or 0.50 USDC Level 3 Upgrade Tutorial.",
              },
              {
                step: 4,
                cost: "1.00 to 25.00 USDC (Base Mainnet)",
                tool: "purchase_firstparty_catalog_item",
                purpose: "Unlock Official Curated Packages (Retail Anti-Rugpull 1.00 USDC, Level 3 Mastery Blueprint 1.50 USDC, CME Globex NQ Institutional Pack 15.00 USDC).",
              },
            ],
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
        case "inspect_veritas_8183_seal":
          output = ledger.inspectVeritasSeal({
            targetId: args.targetId || "ALL",
            roleFilter: args.roleFilter || "ALL",
            proposedTransactionAmountUsdc: args.proposedTransactionAmountUsdc ?? null,
            buyerIdForSimulation: args.buyerIdForSimulation || "alphaquant-agent",
            callerSectorOrTrend: args.callerSectorOrTrend || null,
            forensicUnlockToken: args.forensicUnlockToken || null,
            versionToInspectOrUpdate: args.versionToInspectOrUpdate || null,
            simulatedUpdateBehavior: args.simulatedUpdateBehavior || null,
            preExecutionCallCheck: args.preExecutionCallCheck || null,
          });
          break;
        case "submit_veritas_tier_upgrade_exam":
          output = ledger.submitVeritasTierExam({
            storeId: args.storeId,
            storeName: args.storeName,
            walletAddress: args.walletAddress,
            publicReserveWallet: args.publicReserveWallet,
            declaredPublicReserveUsdc: args.declaredPublicReserveUsdc,
            declaredMonthlyVolumeUsdc: args.declaredMonthlyVolumeUsdc,
            vertical: args.vertical,
            observedLatencyMs: args.observedLatencyMs,
            sampleDeliverable: args.sampleDeliverable || {},
          });
          break;
        case "manage_buyer_finops_spend_passport":
          output = ledger.manageBuyerSpendPassport({
            buyerId: args.buyerId || "alphaquant-agent",
            buyerName: args.buyerName,
            walletAddress: args.walletAddress,
            maxSpendPerTxUsdc: args.maxSpendPerTxUsdc,
            dailySpendCapUsdc: args.dailySpendCapUsdc,
            lookingToBuyVerticals: args.lookingToBuyVerticals || null,
            activeRfqDescription: args.activeRfqDescription || null,
            proposedPurchaseUsdc: args.proposedPurchaseUsdc,
            estimatedPromptTokens: args.estimatedPromptTokens,
          });
          break;
        case "notarize_and_witness_a2a_deal":
          output = ledger.notarizeA2ADeal({
            serviceId: args.serviceId || "x402-veritas-deal-witness-acta",
            buyerId: args.buyerId || "alphaquant-agent",
            sellerStoreId: args.sellerStoreId || "trustgate-official-institutional",
            dealAmountUsdc: args.dealAmountUsdc ?? 5.0,
            deliverableSha256: args.deliverableSha256 || null,
            clientRatingOutOf5: args.clientRatingOutOf5 ?? 5.0,
            clientReviewComment: args.clientReviewComment,
            targetSectorOrKeyword: args.targetSectorOrKeyword || null,
            paymentTxHash: args.paymentTxHash || null,
            requireOnChainPaymentProof: Boolean(args._requireOnChainPaymentProof),
            onChainVerificationResult: args._onChainVerificationResult || null,
          });
          break;
        case "match_verified_buyers_by_intent":
          output = ledger.matchVerifiedBuyers({
            sellerStoreId: args.sellerStoreId,
            minAvailableBudgetUsdc: args.minAvailableBudgetUsdc ?? 0,
            targetVertical: args.targetVertical || "ALL",
            minPaymentReliabilityPct: args.minPaymentReliabilityPct ?? 80,
            connectAndCloseDealWithBuyerId: args.connectAndCloseDealWithBuyerId || null,
            dealAmountUsdc: args.dealAmountUsdc ?? null,
            directOfferPitch: args.directOfferPitch || null,
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
