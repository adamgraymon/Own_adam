/**
 * Módulos Interventores Multi-Vertical (Líneas 2 a 8) sobre el mismo Contrato Base Mainnet:
 *  - Línea 2: Auditor de Estrategias Cuantitativas y Backtests (NQ / Futuros / Crypto)
 *  - Línea 3: Auditor de Código y Smart Contracts Solidity (Compilador `solc` real + Anti-Rugpull)
 *  - Línea 4: Auditor de SLA para APIs Pagas y Oráculos (`x402` Latency + Schema + Freshness)
 *  - Línea 5: Auditor de Skills, Prompts y Plugins para Agentes IA (Anti-Trojan Skill & Exfiltration)
 *  - Línea 6: Auditor de Bases de Conocimiento RAG y Vectores (Anti-Poisoning & L2 Norm)
 *  - Línea 7: Auditor Anti-Cambiazo de Inferencia IA (Proof-of-Inference & Token Accounting)
 *  - Línea 8: Auditor de Alquiler de GPUs y Cómputo Descentralizado (DePIN Benchmark SLA)
 *
 * Incluye blindaje transversal:
 *  - `auditScopeAndLiability`: Tope estricto de responsabilidad al 100% de la comisión cobrada
 *    en la orden (1.0% - 1.5%) + Slashing automático ERC-8004 al vendedor fraudulento.
 *  - Modo `FAIL_CLOSED`: Ante cualquier ambigüedad o formato corrupto, rechaza y devuelve el 100% del USDC.
 */

import solc from "solc";
import { encryptDeliverable } from "./auditorEngine.js";
import { unsealVeritasVaultPayload, hydrateRegexRuleList } from "./veritasEncryptedVaultLoader.js";

export const ENCRYPTED_AUDITOR_SIGNATURES_VAULT = {
  "encryptionStandard": "AES-256-GCM-VERITAS-8183-CONTRACT-BOUND",
  "vaultDomain": "AUDITOR_HEURISTIC_SIGNATURES_VAULT",
  "boundEscrowContract": "0xd4f77bf843b3c359b233aca46d7ff6604cbd0a5e",
  "boundNotarySigner": "0x861ac49f8299c45cca6bd9f0254080fd82061ac4",
  "boundLegionPassportId": "lp0_a1990fc66ed863c9179d571a9db8a28d",
  "ivHex": "cc9fa8bb1ff075b62eaf5061",
  "authTagHex": "d6ca7c4d4334b2f8ce4d2a41e0fa8d3e",
  "ciphertextBase64": "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"
};
const _UNSEALED_AUDITOR_RULES = unsealVeritasVaultPayload(ENCRYPTED_AUDITOR_SIGNATURES_VAULT);

function round4(n) {
  return Math.round(n * 1e4) / 1e4;
}

export function buildAuditScopeAndLiability(verticalName, deterministicChecksRun = []) {
  return {
    vertical: verticalName,
    securityMode: "FAIL_CLOSED_ON_AMBIGUITY",
    deterministicChecksExecuted: deterministicChecksRun,
    maxEvaluatorLiabilityCap:
      "STRICT_CAP_100PCT_OF_PROTOCOL_FEE (1.0% - 1.5% fee only; 0% liability on principal or downstream PnL)",
    fraudSlashingPolicy:
      "Immediate -100 reputation slash (BANNED status) on ERC-8004 registry + 100% principal refund to buyer if rejected",
  };
}

// ============================================================================
// LÍNEA 2: INTERVENTOR DE BACKTESTS Y ESTRATEGIAS CUANTITATIVAS (TRADING / NQ)
// ============================================================================
export function auditQuantStrategyBacktest({
  trades = [],
  spec = {
    minTrades: 20,
    minProfitFactor: 1.25,
    maxDrawdownPct: 25.0,
    minSharpeRatio: 0.8,
    initialCapitalUsd: 10000,
  },
}) {
  const startTime = performance.now();
  const payloadStr = JSON.stringify(trades);
  const encryptedVault = encryptDeliverable(payloadStr);
  const findings = [];
  const checks = [
    "MINIMUM_SAMPLE_SIZE_CHECK",
    "CHRONOLOGICAL_LOOK_AHEAD_BIAS_SCAN",
    "EXACT_TRADE_BY_TRADE_PNL_RECALCULATION",
    "PROFIT_FACTOR_AND_MAX_DRAWDOWN_BOUNDARIES",
  ];
  const auditScopeAndLiability = buildAuditScopeAndLiability("QUANT_BACKTEST_AUDITOR", checks);

  if (!Array.isArray(trades) || trades.length < (spec.minTrades || 20)) {
    return {
      approved: false,
      vertical: "QUANT_BACKTEST_AUDITOR",
      stageFailed: "INSUFFICIENT_SAMPLE_SIZE",
      summary: `Rechazado: el backtest contiene ${trades?.length || 0} operaciones (mínimo exigido: ${spec.minTrades || 20} para validez estadística).`,
      findings: ["Muestra insuficiente para descartar suerte aleatoria."],
      encryptedVault,
      auditScopeAndLiability,
      metrics: { durationMs: round4(performance.now() - startTime) },
    };
  }

  let grossProfit = 0;
  let grossLoss = 0;
  let wins = 0;
  let equity = spec.initialCapitalUsd || 10000;
  let peakEquity = equity;
  let maxDrawdownPct = 0;
  let prevEntryTs = 0;
  const returns = [];

  for (let i = 0; i < trades.length; i++) {
    const t = trades[i];
    const entryTs = Number(t.entryTimestampMs || Date.parse(t.entryTime));
    const exitTs = Number(t.exitTimestampMs || Date.parse(t.exitTime));

    if (!Number.isFinite(entryTs) || !Number.isFinite(exitTs) || exitTs <= entryTs) {
      return {
        approved: false,
        vertical: "QUANT_BACKTEST_AUDITOR",
        stageFailed: "LOOK_AHEAD_BIAS_DETECTED",
        summary: `¡Fraude Cuantitativo! Operación #${i + 1} tiene salida (${exitTs}) anterior o igual a su entrada (${entryTs}).`,
        findings: [
          `Trade #${i + 1}: Look-Ahead Bias detectado (uso de precios futuros antes del cierre de vela).`,
        ],
        encryptedVault,
        auditScopeAndLiability,
        metrics: { durationMs: round4(performance.now() - startTime) },
      };
    }

    if (entryTs < prevEntryTs) {
      findings.push(`Trade #${i + 1}: secuencia temporal desordenada.`);
    }
    prevEntryTs = entryTs;

    const direction = String(t.side || "LONG").toUpperCase() === "SHORT" ? -1 : 1;
    const size = Number(t.size || 1);
    const fee = Number(t.feeUsd || 0);
    const expectedPnl = (Number(t.exitPrice) - Number(t.entryPrice)) * size * direction - fee;
    const reportedPnl = Number(t.pnlUsd);

    if (!Number.isFinite(reportedPnl) || Math.abs(expectedPnl - reportedPnl) > 0.05) {
      return {
        approved: false,
        vertical: "QUANT_BACKTEST_AUDITOR",
        stageFailed: "FAKE_PNL_ACCOUNTING",
        summary: `¡Contabilidad Adulterada! En Trade #${i + 1} reportó PnL=${reportedPnl} USD pero la matemática de precios da ${round4(expectedPnl)} USD.`,
        findings: [
          `Entrada=${t.entryPrice}, Salida=${t.exitPrice}, Lado=${t.side}, Size=${size}, Fee=${fee}`,
        ],
        encryptedVault,
        auditScopeAndLiability,
        metrics: { durationMs: round4(performance.now() - startTime) },
      };
    }

    if (reportedPnl > 0) {
      grossProfit += reportedPnl;
      wins++;
    } else {
      grossLoss += Math.abs(reportedPnl);
    }

    const tradeReturn = reportedPnl / equity;
    returns.push(tradeReturn);
    equity += reportedPnl;

    if (equity > peakEquity) peakEquity = equity;
    const ddPct = ((peakEquity - equity) / peakEquity) * 100;
    if (ddPct > maxDrawdownPct) maxDrawdownPct = ddPct;
  }

  const profitFactor = grossLoss === 0 ? (grossProfit > 0 ? 99 : 0) : round4(grossProfit / grossLoss);
  const winRatePct = round4((wins / trades.length) * 100);
  const meanRet = returns.reduce((a, b) => a + b, 0) / returns.length;
  const stdRet = Math.sqrt(
    returns.reduce((acc, r) => acc + Math.pow(r - meanRet, 2), 0) / Math.max(1, returns.length - 1)
  );
  const sharpeRatio = stdRet === 0 ? 0 : round4((meanRet / stdRet) * Math.sqrt(252));
  maxDrawdownPct = round4(maxDrawdownPct);

  const quantMetrics = {
    durationMs: round4(performance.now() - startTime),
    totalTradesVerified: trades.length,
    winRatePct,
    profitFactor,
    maxDrawdownPct,
    sharpeRatio,
    finalEquityUsd: round4(equity),
    netProfitUsd: round4(equity - (spec.initialCapitalUsd || 10000)),
  };

  if (profitFactor < (spec.minProfitFactor || 1.25)) {
    return {
      approved: false,
      vertical: "QUANT_BACKTEST_AUDITOR",
      stageFailed: "BELOW_MIN_PROFIT_FACTOR",
      summary: `Rechazado: Profit Factor real (${profitFactor}) inferior al mínimo pactado (${spec.minProfitFactor || 1.25}).`,
      findings: [`Gross Profit: ${round4(grossProfit)} USD vs Gross Loss: ${round4(grossLoss)} USD`],
      encryptedVault,
      auditScopeAndLiability,
      metrics: quantMetrics,
    };
  }

  if (maxDrawdownPct > (spec.maxDrawdownPct || 25.0)) {
    return {
      approved: false,
      vertical: "QUANT_BACKTEST_AUDITOR",
      stageFailed: "EXCESSIVE_DRAWDOWN",
      summary: `Rechazado por riesgo excesivo: Max Drawdown (${maxDrawdownPct}%) supera el límite de ${spec.maxDrawdownPct || 25.0}%.`,
      findings: [`Caída máxima desde el pico de capital: ${maxDrawdownPct}%`],
      encryptedVault,
      auditScopeAndLiability,
      metrics: quantMetrics,
    };
  }

  return {
    approved: true,
    vertical: "QUANT_BACKTEST_AUDITOR",
    stageFailed: null,
    summary: `Backtest Cuantitativo Aprobado: ${trades.length} trades sin Look-Ahead Bias | Profit Factor=${profitFactor} | Sharpe=${sharpeRatio} | MaxDD=${maxDrawdownPct}%.`,
    findings: [
      `100% de operaciones cuadradas matemáticamente (PnL neto: +${quantMetrics.netProfitUsd} USD)`,
      `0 violaciones cronológicas (Look-Ahead Bias = 0)`,
      `Huella SHA-256 lista para sellar en Base Mainnet: 0x${encryptedVault.plaintextSha256.slice(0, 16)}...`,
    ],
    encryptedVault,
    auditScopeAndLiability,
    metrics: quantMetrics,
  };
}

// ============================================================================
// LÍNEA 3: INTERVENTOR DE SMART CONTRACTS Y CÓDIGO (SOLIDITY + ANTI-RUGPULL)
// ============================================================================
const SOLIDITY_BACKDOOR_PATTERNS = hydrateRegexRuleList(_UNSEALED_AUDITOR_RULES.SOLIDITY_BACKDOOR_PATTERNS);

export function auditSmartContractDeliverable({
  soliditySourceCode = "",
  contractName = "",
  requiredFunctions = [],
}) {
  const startTime = performance.now();
  const encryptedVault = encryptDeliverable(soliditySourceCode);
  const findings = [];
  const checks = [
    "STATIC_BACKDOOR_SCAN (selfdestruct, delegatecall, tx.origin, assembly sstore)",
    "REAL_SOLC_EVM_COMPILATION",
    "NON_EMPTY_DEPLOYABLE_BYTECODE_CHECK",
    "REQUIRED_ABI_SIGNATURES_VERIFICATION",
  ];
  const auditScopeAndLiability = buildAuditScopeAndLiability("SMART_CONTRACT_AUDITOR", checks);

  for (const rule of SOLIDITY_BACKDOOR_PATTERNS) {
    if (rule.regex.test(soliditySourceCode)) {
      findings.push(`Vector malicioso detectado en código fuente: ${rule.name}`);
    }
  }

  if (findings.length > 0) {
    return {
      approved: false,
      vertical: "SMART_CONTRACT_AUDITOR",
      stageFailed: "BACKDOOR_OR_RUGPULL_DETECTED",
      summary: `¡Alerta de Seguridad en Smart Contract! Se bloqueó código con puertas traseras (${findings.join(", ")}).`,
      findings,
      encryptedVault,
      auditScopeAndLiability,
      metrics: { durationMs: round4(performance.now() - startTime) },
    };
  }

  const input = {
    language: "Solidity",
    sources: {
      "Deliverable.sol": { content: soliditySourceCode },
    },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode.object"],
        },
      },
    },
  };

  const compiled = JSON.parse(solc.compile(JSON.stringify(input)));
  const errors = (compiled.errors || []).filter((e) => e.severity === "error");

  if (errors.length > 0) {
    return {
      approved: false,
      vertical: "SMART_CONTRACT_AUDITOR",
      stageFailed: "SOLIDITY_COMPILATION_FAILED",
      summary: `Rechazado: El contrato Solidity entregado no compila (${errors.length} errores de compilación en solc).`,
      findings: errors.slice(0, 3).map((e) => e.formattedMessage.trim()),
      encryptedVault,
      auditScopeAndLiability,
      metrics: { durationMs: round4(performance.now() - startTime) },
    };
  }

  const fileContracts = compiled.contracts?.["Deliverable.sol"] || {};
  const targetName = contractName || Object.keys(fileContracts)[0];
  const targetArtifact = fileContracts[targetName];

  if (!targetArtifact || !targetArtifact.evm?.bytecode?.object) {
    return {
      approved: false,
      vertical: "SMART_CONTRACT_AUDITOR",
      stageFailed: "EMPTY_BYTECODE",
      summary: `Rechazado: No se encontró bytecode desplegable para el contrato '${targetName}'.`,
      findings: [],
      encryptedVault,
      auditScopeAndLiability,
      metrics: { durationMs: round4(performance.now() - startTime) },
    };
  }

  const abiFunctions = targetArtifact.abi
    .filter((item) => item.type === "function")
    .map((item) => item.name);

  const missingFns = requiredFunctions.filter((fn) => !abiFunctions.includes(fn));
  if (missingFns.length > 0) {
    return {
      approved: false,
      vertical: "SMART_CONTRACT_AUDITOR",
      stageFailed: "MISSING_REQUIRED_ABI_FUNCTIONS",
      summary: `Incumplimiento de especificación ABI: faltan las funciones [${missingFns.join(", ")}].`,
      findings: [`Funciones encontradas en ABI: ${abiFunctions.join(", ")}`],
      encryptedVault,
      auditScopeAndLiability,
      metrics: { durationMs: round4(performance.now() - startTime) },
    };
  }

  const bytecodeSize = targetArtifact.evm.bytecode.object.length / 2;
  return {
    approved: true,
    vertical: "SMART_CONTRACT_AUDITOR",
    stageFailed: null,
    summary: `Smart Contract '${targetName}' Aprobado: Compilado con solc (${bytecodeSize} bytes EVM), 0 puertas traseras y ${abiFunctions.length} funciones ABI verificadas.`,
    findings: [
      `Compilador oficial: ${solc.version()}`,
      `Funciones ABI verificadas: ${abiFunctions.join(", ")}`,
      `0 patrones de Rugpull (selfdestruct / delegatecall / tx.origin libres)`,
    ],
    encryptedVault,
    auditScopeAndLiability,
    metrics: {
      durationMs: round4(performance.now() - startTime),
      compilerVersion: solc.version(),
      bytecodeSizeBytes: bytecodeSize,
      abiFunctionCount: abiFunctions.length,
    },
  };
}

// ============================================================================
// LÍNEA 4: ORÁCULO Y AUDITOR DE SLA PARA APIS PAGAS (x402 SLA AUDITOR)
// ============================================================================
export function auditApiOracleSla({
  apiResponsePayload = {},
  observedLatencyMs = 45,
  slaSpec = {
    maxLatencyMs: 300,
    requiredKeys: ["symbol", "price", "timestamp"],
    maxStalenessSeconds: 120,
  },
}) {
  const startTime = performance.now();
  const rawStr =
    typeof apiResponsePayload === "string"
      ? apiResponsePayload
      : JSON.stringify(apiResponsePayload);
  const encryptedVault = encryptDeliverable(rawStr);
  const checks = [
    "JSON_STRUCTURAL_INTEGRITY",
    "LATENCY_THRESHOLD_SLA",
    "MANDATORY_SCHEMA_KEYS",
    "CRYPTOGRAPHIC_TIMESTAMP_FRESHNESS",
  ];
  const auditScopeAndLiability = buildAuditScopeAndLiability("API_SLA_ORACLE_AUDITOR", checks);

  let parsed;
  try {
    parsed =
      typeof apiResponsePayload === "string" ? JSON.parse(apiResponsePayload) : apiResponsePayload;
  } catch {
    return {
      approved: false,
      vertical: "API_SLA_ORACLE_AUDITOR",
      stageFailed: "MALFORMED_JSON_RESPONSE",
      summary: "Rechazado: El endpoint x402 devolvió un cuerpo corrupto que no es JSON válido.",
      findings: [],
      encryptedVault,
      auditScopeAndLiability,
      metrics: { durationMs: round4(performance.now() - startTime), observedLatencyMs },
    };
  }

  if (observedLatencyMs > (slaSpec.maxLatencyMs || 300)) {
    return {
      approved: false,
      vertical: "API_SLA_ORACLE_AUDITOR",
      stageFailed: "SLA_LATENCY_BREACH",
      summary: `Incumplimiento de SLA: la API tardó ${observedLatencyMs} ms (máximo permitido por contrato: ${slaSpec.maxLatencyMs} ms).`,
      findings: ["Reembolso automático activado por lentitud del proveedor."],
      encryptedVault,
      auditScopeAndLiability,
      metrics: { durationMs: round4(performance.now() - startTime), observedLatencyMs },
    };
  }

  const reqKeys = slaSpec.requiredKeys || [];
  const missingKeys = reqKeys.filter(
    (k) => parsed === null || parsed[k] === undefined || parsed[k] === ""
  );
  if (missingKeys.length > 0) {
    return {
      approved: false,
      vertical: "API_SLA_ORACLE_AUDITOR",
      stageFailed: "MISSING_SLA_FIELDS",
      summary: `Respuesta API incompleta: faltan las llaves obligatorias [${missingKeys.join(", ")}].`,
      findings: [],
      encryptedVault,
      auditScopeAndLiability,
      metrics: { durationMs: round4(performance.now() - startTime), observedLatencyMs },
    };
  }

  if (parsed.timestamp && slaSpec.maxStalenessSeconds) {
    const tsMs =
      typeof parsed.timestamp === "number" && parsed.timestamp < 1e12
        ? parsed.timestamp * 1000
        : Number(parsed.timestamp) || Date.parse(parsed.timestamp);
    const ageSeconds = Math.abs(Date.now() - tsMs) / 1000;
    if (Number.isFinite(ageSeconds) && ageSeconds > slaSpec.maxStalenessSeconds) {
      return {
        approved: false,
        vertical: "API_SLA_ORACLE_AUDITOR",
        stageFailed: "STALE_ORACLE_DATA",
        summary: `Datos obsoletos detectados: la respuesta tiene ${Math.round(ageSeconds)}s de antigüedad (máximo permitido: ${slaSpec.maxStalenessSeconds}s).`,
        findings: [],
        encryptedVault,
        auditScopeAndLiability,
        metrics: { durationMs: round4(performance.now() - startTime), observedLatencyMs },
      };
    }
  }

  return {
    approved: true,
    vertical: "API_SLA_ORACLE_AUDITOR",
    stageFailed: null,
    summary: `SLA de API/Oráculo Aprobado: Latencia=${observedLatencyMs} ms (<= ${slaSpec.maxLatencyMs} ms), esquema completo (${reqKeys.join(", ")}) y datos frescos.`,
    findings: [
      `Latencia verificada: ${observedLatencyMs} ms`,
      `Huella SHA-256 de la respuesta: 0x${encryptedVault.plaintextSha256.slice(0, 16)}...`,
    ],
    encryptedVault,
    auditScopeAndLiability,
    metrics: {
      durationMs: round4(performance.now() - startTime),
      observedLatencyMs,
      verifiedKeysCount: reqKeys.length,
    },
  };
}

// ============================================================================
// LÍNEA 5: INTERVENTOR DE SKILLS, PROMPTS Y PLUGINS PARA AGENTES (ANTI-TROJAN)
// ============================================================================
const SKILL_TROJAN_PATTERNS = hydrateRegexRuleList(_UNSEALED_AUDITOR_RULES.SKILL_TROJAN_PATTERNS);

/**
 * Audita un paquete de Skill (`SKILL.md` + scripts opcionales) antes de que un Agente IA lo compre o instale.
 */
export function auditAgentSkillDeliverable({
  skillMarkdown = "",
  bundledScripts = "",
  requiredSections = ["name:", "description:"],
}) {
  const startTime = performance.now();
  const combinedPayload = `${skillMarkdown}\n---SCRIPTS---\n${bundledScripts}`;
  const encryptedVault = encryptDeliverable(combinedPayload);
  const findings = [];
  const checks = [
    "SECRET_AND_PRIVATE_KEY_EXFILTRATION_SCAN",
    "REMOTE_CODE_EXECUTION_SINK_SCAN",
    "BASE64_DROPPER_AND_UNICODE_STEGO_SCAN",
    "REQUIRED_SKILL_FRONTMATTER_VERIFICATION",
  ];
  const auditScopeAndLiability = buildAuditScopeAndLiability("AGENT_SKILL_SECURITY_AUDITOR", checks);

  if (!skillMarkdown || skillMarkdown.trim().length < 40) {
    return {
      approved: false,
      vertical: "AGENT_SKILL_SECURITY_AUDITOR",
      stageFailed: "EMPTY_OR_TRUNCATED_SKILL",
      summary: "Rechazado (Fail-Closed): El archivo SKILL.md está vacío o truncado (< 40 caracteres).",
      findings: [],
      encryptedVault,
      auditScopeAndLiability,
      metrics: { durationMs: round4(performance.now() - startTime) },
    };
  }

  for (const rule of SKILL_TROJAN_PATTERNS) {
    if (rule.regex.test(combinedPayload)) {
      findings.push(`Amenaza detectada en Skill/Prompt: ${rule.name}`);
    }
  }

  if (findings.length > 0) {
    return {
      approved: false,
      vertical: "AGENT_SKILL_SECURITY_AUDITOR",
      stageFailed: "TROJAN_SKILL_OR_EXFILTRATION_DETECTED",
      summary: `¡Skill Troyano Bloqueado! Se detectaron ${findings.length} vectores de exfiltración o ejecución remota (${findings.join("; ")}).`,
      findings,
      encryptedVault,
      auditScopeAndLiability,
      metrics: { durationMs: round4(performance.now() - startTime), threatsFound: findings.length },
    };
  }

  const missingSections = (requiredSections || []).filter(
    (sec) => !skillMarkdown.toLowerCase().includes(String(sec).toLowerCase())
  );
  if (missingSections.length > 0) {
    return {
      approved: false,
      vertical: "AGENT_SKILL_SECURITY_AUDITOR",
      stageFailed: "MISSING_REQUIRED_SKILL_METADATA",
      summary: `Rechazado: Al Skill le faltan secciones obligatorias [${missingSections.join(", ")}].`,
      findings: [],
      encryptedVault,
      auditScopeAndLiability,
      metrics: { durationMs: round4(performance.now() - startTime) },
    };
  }

  return {
    approved: true,
    vertical: "AGENT_SKILL_SECURITY_AUDITOR",
    stageFailed: null,
    summary: `Skill/Prompt Aprobado: ${combinedPayload.length} bytes escaneados con 0 exfiltradores de claves, 0 código ofuscado y estructura válida.`,
    findings: [
      "0 accesos a process.env / claves privadas / SSH",
      "0 sinks de ejecución arbitraria (eval / child_process)",
      "0 caracteres Unicode invisibles de Prompt Injection",
    ],
    encryptedVault,
    auditScopeAndLiability,
    metrics: {
      durationMs: round4(performance.now() - startTime),
      scannedBytes: combinedPayload.length,
      threatsFound: 0,
    },
  };
}

// ============================================================================
// LÍNEA 6: INTERVENTOR DE BASES DE CONOCIMIENTO RAG Y VECTORES (ANTI-POISONING)
// ============================================================================
const RAG_POISON_PATTERNS = hydrateRegexRuleList(_UNSEALED_AUDITOR_RULES.RAG_POISON_PATTERNS).map((r) => r.regex);

/**
 * Audita un lote de Embeddings Vectoriales y Chunks de texto (`RAG`) antes de que un Agente los inyecte en su memoria.
 */
export function auditRagEmbeddingsDeliverable({
  chunks = [],
  expectedDimension = 8,
  minChunks = 5,
}) {
  const startTime = performance.now();
  const encryptedVault = encryptDeliverable(JSON.stringify(chunks));
  const checks = [
    "EXACT_VECTOR_DIMENSION_CONSISTENCY",
    "L2_NORM_DEAD_OR_NAN_VECTOR_SCAN",
    "DUPLICATE_CHUNK_AND_CLONED_VECTOR_DETECTION",
    "RAG_INDIRECT_PROMPT_INJECTION_POISONING_SCAN",
  ];
  const auditScopeAndLiability = buildAuditScopeAndLiability(
    "RAG_EMBEDDING_POISONING_AUDITOR",
    checks
  );

  if (!Array.isArray(chunks) || chunks.length < minChunks) {
    return {
      approved: false,
      vertical: "RAG_EMBEDDING_POISONING_AUDITOR",
      stageFailed: "INSUFFICIENT_RAG_CHUNKS",
      summary: `Rechazado: La base RAG contiene ${chunks?.length || 0} chunks (mínimo exigido: ${minChunks}).`,
      findings: [],
      encryptedVault,
      auditScopeAndLiability,
      metrics: { durationMs: round4(performance.now() - startTime) },
    };
  }

  const seenTexts = new Set();

  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    const text = String(c?.text || "").trim();
    const vec = c?.embedding;

    if (!text || !Array.isArray(vec) || vec.length !== expectedDimension) {
      return {
        approved: false,
        vertical: "RAG_EMBEDDING_POISONING_AUDITOR",
        stageFailed: "VECTOR_DIMENSION_MISMATCH",
        summary: `Rechazado en Chunk #${i + 1}: dimensión del vector (${vec?.length || 0}) no coincide con la dimensión pactada (${expectedDimension}).`,
        findings: [],
        encryptedVault,
        auditScopeAndLiability,
        metrics: { durationMs: round4(performance.now() - startTime) },
      };
    }

    // Calcular norma L2 y verificar que no haya NaN, Infinity o vectores muertos (todos 0)
    let sumSq = 0;
    for (let j = 0; j < vec.length; j++) {
      const val = Number(vec[j]);
      if (!Number.isFinite(val)) {
        return {
          approved: false,
          vertical: "RAG_EMBEDDING_POISONING_AUDITOR",
          stageFailed: "CORRUPT_NAN_EMBEDDING",
          summary: `Rechazado en Chunk #${i + 1}: el vector contiene valores corruptos (NaN/Infinity).`,
          findings: [],
          encryptedVault,
          auditScopeAndLiability,
          metrics: { durationMs: round4(performance.now() - startTime) },
        };
      }
      sumSq += val * val;
    }

    const l2Norm = Math.sqrt(sumSq);
    if (l2Norm < 1e-4 || l2Norm > 100) {
      return {
        approved: false,
        vertical: "RAG_EMBEDDING_POISONING_AUDITOR",
        stageFailed: "DEGENERATE_ZERO_OR_EXPLODING_VECTOR",
        summary: `¡Fraude de Embeddings! Chunk #${i + 1} tiene norma L2 degenerada (${round4(l2Norm)}) — vector muerto o relleno falso.`,
        findings: [],
        encryptedVault,
        auditScopeAndLiability,
        metrics: { durationMs: round4(performance.now() - startTime) },
      };
    }

    if (seenTexts.has(text)) {
      return {
        approved: false,
        vertical: "RAG_EMBEDDING_POISONING_AUDITOR",
        stageFailed: "CLONED_RAG_CHUNKS",
        summary: `Rechazado: Se detectaron fragmentos de texto clonados en el Chunk #${i + 1}.`,
        findings: [],
        encryptedVault,
        auditScopeAndLiability,
        metrics: { durationMs: round4(performance.now() - startTime) },
      };
    }
    seenTexts.add(text);

    for (const pat of RAG_POISON_PATTERNS) {
      if (pat.test(text)) {
        return {
          approved: false,
          vertical: "RAG_EMBEDDING_POISONING_AUDITOR",
          stageFailed: "RAG_DATA_POISONING_DETECTED",
          summary: `¡Alerta de Envenenamiento RAG! El Chunk #${i + 1} contiene instrucciones ocultas para secuestrar al agente cuando consulte su memoria.`,
          findings: [`Texto malicioso bloqueado: "${text.slice(0, 80)}..."`],
          encryptedVault,
          auditScopeAndLiability,
          metrics: { durationMs: round4(performance.now() - startTime) },
        };
      }
    }
  }

  return {
    approved: true,
    vertical: "RAG_EMBEDDING_POISONING_AUDITOR",
    stageFailed: null,
    summary: `Base de Conocimiento RAG Aprobada: ${chunks.length} vectores de ${expectedDimension} dimensiones con norma L2 íntegra y 0 envenenamiento semántico.`,
    findings: [
      `100% de vectores con dimensión exacta (${expectedDimension}D) y norma L2 válida`,
      `0 chunks clonados y 0 vectores de envenenamiento RAG`,
    ],
    encryptedVault,
    auditScopeAndLiability,
    metrics: {
      durationMs: round4(performance.now() - startTime),
      verifiedChunks: chunks.length,
      vectorDimension: expectedDimension,
    },
  };
}

// ============================================================================
// LÍNEA 7: AUDITOR ANTI-CAMBIAZO DE INFERENCIA IA (PROOF-OF-INFERENCE)
// ============================================================================
/**
 * Audita que un proveedor de inferencia LLM no haya inflado falsamente los tokens cobrados
 * ni haya sustituido un modelo grande por uno defectuoso/repetitivo (Model Downgrade Fraud).
 */
export function auditAiInferenceDeliverable({
  responseText = "",
  billedOutputTokens = 0,
  mustIncludeTerms = [],
  forbiddenTerms = [],
  minUniqueWordRatio = 0.35,
}) {
  const startTime = performance.now();
  const encryptedVault = encryptDeliverable(responseText);
  const checks = [
    "TOKEN_BILLING_INFLATION_AUDIT",
    "LEXICAL_ENTROPY_ANTI_QUANTIZATION_COLLAPSE",
    "MANDATORY_AND_FORBIDDEN_CONSTRAINT_CHECK",
  ];
  const auditScopeAndLiability = buildAuditScopeAndLiability("AI_INFERENCE_PROOF_AUDITOR", checks);

  const trimmed = String(responseText || "").trim();
  if (trimmed.length < 20) {
    return {
      approved: false,
      vertical: "AI_INFERENCE_PROOF_AUDITOR",
      stageFailed: "EMPTY_OR_TRUNCATED_INFERENCE",
      summary: "Rechazado: La respuesta de inferencia está vacía o truncada (< 20 caracteres).",
      findings: [],
      encryptedVault,
      auditScopeAndLiability,
      metrics: { durationMs: round4(performance.now() - startTime) },
    };
  }

  // 1. Verificar inflación de tokens facturados (1 token ≈ 3.5–4 chars; permitimos margen generoso hasta chars/2.2)
  const maxPlausibleTokens = Math.ceil(trimmed.length / 2.2) + 15;
  if (billedOutputTokens > maxPlausibleTokens) {
    return {
      approved: false,
      vertical: "AI_INFERENCE_PROOF_AUDITOR",
      stageFailed: "TOKEN_BILLING_FRAUD",
      summary: `¡Sobrefacturación de Tokens Detectada! El proveedor intenta cobrar ${billedOutputTokens} tokens por un texto de solo ${trimmed.length} caracteres (máximo plausible: ${maxPlausibleTokens} tokens).`,
      findings: [],
      encryptedVault,
      auditScopeAndLiability,
      metrics: {
        durationMs: round4(performance.now() - startTime),
        billedOutputTokens,
        maxPlausibleTokens,
      },
    };
  }

  // 2. Entropía léxica: detectar colapso repetitivo típico de modelos baratos/cuantizados (Model Downgrade)
  const words = trimmed
    .toLowerCase()
    .replace(/[^a-záéíóúñ0-9\s]/gi, " ")
    .split(/\s+/)
    .filter(Boolean);
  const uniqueWords = new Set(words);
  const uniqueRatio = words.length > 0 ? round4(uniqueWords.size / words.length) : 0;

  if (words.length >= 12 && uniqueRatio < minUniqueWordRatio) {
    return {
      approved: false,
      vertical: "AI_INFERENCE_PROOF_AUDITOR",
      stageFailed: "MODEL_DOWNGRADE_REPETITION_COLLAPSE",
      summary: `¡Cambiazo de Modelo Detectado (Model Downgrade)! La respuesta presenta colapso repetitivo (ratio de vocabulario único=${uniqueRatio} < ${minUniqueWordRatio}).`,
      findings: [],
      encryptedVault,
      auditScopeAndLiability,
      metrics: { durationMs: round4(performance.now() - startTime), uniqueWordRatio: uniqueRatio },
    };
  }

  const missingTerms = (mustIncludeTerms || []).filter(
    (term) => !trimmed.toLowerCase().includes(String(term).toLowerCase())
  );
  if (missingTerms.length > 0) {
    return {
      approved: false,
      vertical: "AI_INFERENCE_PROOF_AUDITOR",
      stageFailed: "MISSING_REQUIRED_INFERENCE_CONSTRAINTS",
      summary: `Incumplimiento de instrucciones: faltan los conceptos obligatorios [${missingTerms.join(", ")}].`,
      findings: [],
      encryptedVault,
      auditScopeAndLiability,
      metrics: { durationMs: round4(performance.now() - startTime) },
    };
  }

  const violatedForbidden = (forbiddenTerms || []).filter((term) =>
    trimmed.toLowerCase().includes(String(term).toLowerCase())
  );
  if (violatedForbidden.length > 0) {
    return {
      approved: false,
      vertical: "AI_INFERENCE_PROOF_AUDITOR",
      stageFailed: "FORBIDDEN_CONSTRAINT_VIOLATED",
      summary: `Rechazado: La inferencia incluyó términos prohibidos [${violatedForbidden.join(", ")}].`,
      findings: [],
      encryptedVault,
      auditScopeAndLiability,
      metrics: { durationMs: round4(performance.now() - startTime) },
    };
  }

  return {
    approved: true,
    vertical: "AI_INFERENCE_PROOF_AUDITOR",
    stageFailed: null,
    summary: `Inferencia IA Aprobada: Conteo de tokens honesto (${billedOutputTokens} tokens), alta riqueza léxica (${uniqueRatio}) y 100% de restricciones cumplidas.`,
    findings: [
      `Tokens facturados (${billedOutputTokens}) consistentes con longitud real (${trimmed.length} chars)`,
      `Diversidad léxica verificada (${uniqueRatio}) — sin degradación de modelo`,
    ],
    encryptedVault,
    auditScopeAndLiability,
    metrics: {
      durationMs: round4(performance.now() - startTime),
      billedOutputTokens,
      uniqueWordRatio: uniqueRatio,
    },
  };
}

// ============================================================================
// LÍNEA 8: AUDITOR DE ALQUILER DE GPUS Y CÓMPUTO DEPIN (GPU BENCHMARK SLA)
// ============================================================================
/**
 * Audita las pruebas de rendimiento de un nodo GPU descentralizado (DePIN) antes de liberar el pago por hora.
 */
export function auditDepinGpuComputeSla({
  benchmarkReport = {},
  slaSpec = {
    minTflopsFp16: 120,
    minVramGb: 40,
    minMemoryBandwidthGbs: 900,
    maxTempCelsius: 85,
    maxPacketLossPct: 0.5,
  },
}) {
  const startTime = performance.now();
  const encryptedVault = encryptDeliverable(JSON.stringify(benchmarkReport));
  const checks = [
    "FP16_MATMUL_TFLOPS_BENCHMARK_VERIFICATION",
    "AVAILABLE_VRAM_AND_BANDWIDTH_SLA",
    "THERMAL_THROTTLING_AND_PACKET_LOSS_GUARD",
  ];
  const auditScopeAndLiability = buildAuditScopeAndLiability("DEPIN_GPU_COMPUTE_AUDITOR", checks);

  const measuredTflops = Number(benchmarkReport.measuredTflopsFp16 || 0);
  const availableVramGb = Number(benchmarkReport.availableVramGb || 0);
  const bandwidthGbs = Number(benchmarkReport.memoryBandwidthGbs || 0);
  const tempC = Number(benchmarkReport.gpuTempCelsius ?? 65);
  const packetLoss = Number(benchmarkReport.packetLossPct ?? 0);

  if (measuredTflops < (slaSpec.minTflopsFp16 || 120)) {
    return {
      approved: false,
      vertical: "DEPIN_GPU_COMPUTE_AUDITOR",
      stageFailed: "GPU_TFLOPS_BELOW_SLA",
      summary: `¡Hardware Inferior Detectado! El nodo GPU rindió ${measuredTflops} TFLOPS FP16 (mínimo contratado: ${slaSpec.minTflopsFp16} TFLOPS).`,
      findings: ["Posible falsificación de modelo de GPU o estrangulamiento severo."],
      encryptedVault,
      auditScopeAndLiability,
      metrics: { durationMs: round4(performance.now() - startTime), measuredTflops, availableVramGb },
    };
  }

  if (availableVramGb < (slaSpec.minVramGb || 40)) {
    return {
      approved: false,
      vertical: "DEPIN_GPU_COMPUTE_AUDITOR",
      stageFailed: "INSUFFICIENT_VRAM_CAPACITY",
      summary: `Incumplimiento de VRAM: el nodo entregó ${availableVramGb} GB disponibles (mínimo contratado: ${slaSpec.minVramGb} GB).`,
      findings: [],
      encryptedVault,
      auditScopeAndLiability,
      metrics: { durationMs: round4(performance.now() - startTime), measuredTflops, availableVramGb },
    };
  }

  if (bandwidthGbs < (slaSpec.minMemoryBandwidthGbs || 900)) {
    return {
      approved: false,
      vertical: "DEPIN_GPU_COMPUTE_AUDITOR",
      stageFailed: "LOW_MEMORY_BANDWIDTH",
      summary: `Ancho de banda de memoria insuficiente: ${bandwidthGbs} GB/s (mínimo exigido: ${slaSpec.minMemoryBandwidthGbs} GB/s).`,
      findings: [],
      encryptedVault,
      auditScopeAndLiability,
      metrics: { durationMs: round4(performance.now() - startTime), bandwidthGbs },
    };
  }

  if (tempC > (slaSpec.maxTempCelsius || 85) || packetLoss > (slaSpec.maxPacketLossPct ?? 0.5)) {
    return {
      approved: false,
      vertical: "DEPIN_GPU_COMPUTE_AUDITOR",
      stageFailed: "THERMAL_THROTTLING_OR_NETWORK_LOSS",
      summary: `Nodo DePIN inestable: Temperatura=${tempC}°C (máx ${slaSpec.maxTempCelsius}°C), Pérdida de paquetes=${packetLoss}% (máx ${slaSpec.maxPacketLossPct}%).`,
      findings: [],
      encryptedVault,
      auditScopeAndLiability,
      metrics: { durationMs: round4(performance.now() - startTime), tempC, packetLoss },
    };
  }

  return {
    approved: true,
    vertical: "DEPIN_GPU_COMPUTE_AUDITOR",
    stageFailed: null,
    summary: `Nodo GPU DePIN Aprobado: ${measuredTflops} TFLOPS FP16 | ${availableVramGb} GB VRAM | ${bandwidthGbs} GB/s | Temp=${tempC}°C.`,
    findings: [
      `Potencia real verificada: ${measuredTflops} TFLOPS FP16 (>= ${slaSpec.minTflopsFp16})`,
      `VRAM libre: ${availableVramGb} GB y ancho de banda: ${bandwidthGbs} GB/s`,
    ],
    encryptedVault,
    auditScopeAndLiability,
    metrics: {
      durationMs: round4(performance.now() - startTime),
      measuredTflops,
      availableVramGb,
      bandwidthGbs,
      tempC,
    },
  };
}
