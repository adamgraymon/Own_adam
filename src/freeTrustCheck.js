/**
 * Free MCP Server Trust Check ("gancho" gratuito).
 *
 * Cualquier agente pasa la URL pública de un servidor MCP y recibe GRATIS 3 de las 7
 * preguntas de Continuous AI Trust (permisos, herramientas y cambios desde el último chequeo).
 * El informe completo (7/7 + firma notarial) se desbloquea con 0.25 USDC en Base Mainnet.
 *
 * Diseño:
 *  - probeMcpServerLive(): async, hace initialize + tools/list reales contra el servidor remoto
 *    con protecciones SSRF (solo https, sin IPs privadas, sin redirecciones, timeout y tope de bytes).
 *  - buildMcpTrustReport(): síncrono, recibe el resultado del sondeo y arma el informe.
 */

import crypto from "node:crypto";
import dns from "node:dns/promises";
import net from "node:net";

export const FREE_CHECKS_PER_DAY = 5;
export const FULL_DOSSIER_PRICE_USDC = 0.25;
export const FULL_DOSSIER_SERVICE_ID = "x402-mcp-trust-full-dossier";
export const FULL_DOSSIER_SAMPLE = Object.freeze({
  path: "/trust/sample.json",
  mcpTool: "get_trust_dossier_sample",
});
export const EXTRA_CHECK_PRICE_USDC = 0.02;
export const PUBLIC_BASE_URL = "https://own-adam.onrender.com";
const BADGE_STALE_MS = 30 * 24 * 3600 * 1000;

const PROBE_TIMEOUT_MS = 7000;
const MAX_RESPONSE_BYTES = 512 * 1024;
const MAX_TOOLS_ANALYZED = 200;

// ---------------------------------------------------------------------------
// Protección SSRF
// ---------------------------------------------------------------------------
function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  const v6 = ip.toLowerCase();
  if (v6 === "::1" || v6 === "::") return true;
  if (v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80")) return true;
  const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIp(mapped[1]);
  return false;
}

export function parsePublicMcpUrl(rawUrl) {
  let url;
  try {
    url = new URL(String(rawUrl || "").trim());
  } catch {
    return { ok: false, reason: "serverUrl is not a valid URL. Example: https://example.com/mcp" };
  }
  if (url.protocol !== "https:") {
    return { ok: false, reason: "Only public https:// MCP endpoints can be checked." };
  }
  if (url.username || url.password) {
    return { ok: false, reason: "URLs with embedded credentials are not accepted." };
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (/^(localhost|.*\.local|.*\.internal)$/i.test(host)) {
    return { ok: false, reason: "Local or internal hostnames are not allowed." };
  }
  if (net.isIP(host) && isPrivateIp(host)) {
    return { ok: false, reason: "Host resolves to a private or reserved IP address." };
  }
  return { ok: true, url };
}

export async function validatePublicMcpUrl(rawUrl) {
  const parsed = parsePublicMcpUrl(rawUrl);
  if (!parsed.ok) return parsed;
  const { url } = parsed;
  const host = url.hostname.replace(/^\[|\]$/g, "");
  try {
    const addrs = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true });
    if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) {
      return { ok: false, reason: "Host resolves to a private or reserved IP address." };
    }
  } catch {
    return { ok: false, reason: `DNS lookup failed for ${host}.` };
  }
  return { ok: true, url };
}

// ---------------------------------------------------------------------------
// Cliente MCP mínimo (JSON o SSE)
// ---------------------------------------------------------------------------
async function readBodyCapped(res) {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let text = "";
  let total = 0;
  const isSse = String(res.headers.get("content-type") || "").includes("text/event-stream");
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    text += decoder.decode(value, { stream: true });
    if (total > MAX_RESPONSE_BYTES) {
      await reader.cancel().catch(() => {});
      break;
    }
    // En SSE el stream puede quedar abierto: cortar cuando ya llegó un mensaje JSON-RPC completo.
    if (isSse && /\ndata:.*"jsonrpc".*\n/.test("\n" + text)) {
      await reader.cancel().catch(() => {});
      break;
    }
  }
  return text;
}

function parseJsonRpcBody(text, contentType) {
  if (String(contentType || "").includes("text/event-stream")) {
    for (const line of text.split(/\r?\n/)) {
      if (!line.startsWith("data:")) continue;
      try {
        const msg = JSON.parse(line.slice(5).trim());
        if (msg && (msg.result || msg.error)) return msg;
      } catch {
        /* línea no JSON */
      }
    }
    return null;
  }
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed.find((m) => m.result || m.error) || null : parsed;
  } catch {
    return null;
  }
}

async function rpc(url, body, sessionId, protocolVersion) {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
    "User-Agent": "VERITAS-TrustCheck/0.8 (+https://own-adam.onrender.com)",
  };
  if (sessionId) headers["Mcp-Session-Id"] = sessionId;
  if (protocolVersion) headers["MCP-Protocol-Version"] = protocolVersion;
  const started = Date.now();
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    redirect: "manual",
    signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
  });
  const text = body.id === undefined ? "" : await readBodyCapped(res);
  return {
    httpStatus: res.status,
    latencyMs: Date.now() - started,
    sessionId: res.headers.get("mcp-session-id") || sessionId || null,
    wwwAuthenticate: res.headers.get("www-authenticate") || null,
    message: body.id === undefined ? null : parseJsonRpcBody(text, res.headers.get("content-type")),
  };
}

/**
 * Sondeo en vivo: initialize -> notifications/initialized -> tools/list (x2 para reproducibilidad).
 */
export async function probeMcpServerLive(serverUrl) {
  const checkedAt = new Date().toISOString();
  const valid = await validatePublicMcpUrl(serverUrl);
  if (!valid.ok) return { ok: false, stage: "url_validation", reason: valid.reason, checkedAt };
  const url = valid.url.toString();

  try {
    const init = await rpc(url, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "veritas-trust-check", version: "0.8.0" },
      },
    });
    if (init.httpStatus === 401 || init.httpStatus === 403) {
      return {
        ok: false,
        stage: "initialize",
        requiresAuth: true,
        httpStatus: init.httpStatus,
        wwwAuthenticate: init.wwwAuthenticate,
        reason: "Server requires authentication before initialize (good practice, but tools cannot be inspected anonymously).",
        checkedAt,
      };
    }
    if (!init.message?.result) {
      return {
        ok: false,
        stage: "initialize",
        httpStatus: init.httpStatus,
        reason: init.message?.error?.message || `No valid JSON-RPC initialize response (HTTP ${init.httpStatus}).`,
        checkedAt,
      };
    }
    const negotiated = init.message.result.protocolVersion || "2025-06-18";
    await rpc(url, { jsonrpc: "2.0", method: "notifications/initialized" }, init.sessionId, negotiated).catch(() => {});

    const list1 = await rpc(url, { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }, init.sessionId, negotiated);
    const list2 = await rpc(url, { jsonrpc: "2.0", id: 3, method: "tools/list", params: {} }, init.sessionId, negotiated).catch(
      () => null
    );

    const tools = Array.isArray(list1.message?.result?.tools) ? list1.message.result.tools.slice(0, MAX_TOOLS_ANALYZED) : null;
    if (!tools) {
      return {
        ok: false,
        stage: "tools/list",
        httpStatus: list1.httpStatus,
        requiresAuth: list1.httpStatus === 401 || list1.httpStatus === 403,
        reason: list1.message?.error?.message || `tools/list did not return a tool array (HTTP ${list1.httpStatus}).`,
        serverInfo: init.message.result.serverInfo || null,
        checkedAt,
      };
    }

    return {
      ok: true,
      checkedAt,
      serverUrl: url,
      serverInfo: init.message.result.serverInfo || null,
      protocolVersion: negotiated,
      capabilities: init.message.result.capabilities || {},
      instructions: typeof init.message.result.instructions === "string" ? init.message.result.instructions.slice(0, 2000) : null,
      initLatencyMs: init.latencyMs,
      toolsListLatencyMs: list1.latencyMs,
      tools,
      secondToolsList: Array.isArray(list2?.message?.result?.tools) ? list2.message.result.tools.slice(0, MAX_TOOLS_ANALYZED) : null,
      usesSession: Boolean(init.sessionId),
    };
  } catch (err) {
    return {
      ok: false,
      stage: "network",
      reason: err?.name === "TimeoutError" ? `Server did not answer within ${PROBE_TIMEOUT_MS} ms.` : `Network error: ${err?.message}`,
      checkedAt,
    };
  }
}

// ---------------------------------------------------------------------------
// Análisis
// ---------------------------------------------------------------------------
// Los verbos aceptan conjugaciones (deletes, deleted, deleting...) para que no se escapen variantes.
const V = "(?:s|es|d|ed|ing)?";
const CAPABILITY_PATTERNS = [
  { capability: "CODE_OR_SHELL_EXECUTION", risk: "HIGH", re: new RegExp(`\\b(exec|execut(?:e|es|ed|ing)|shell|bash|terminal|commands?|run[_ ]?code|eval|subprocess|powershell)\\b`, "i") },
  { capability: "FILESYSTEM_WRITE_OR_DELETE", risk: "HIGH", re: new RegExp(`\\b(writ(?:e|es|ing)[_ ]?files?|delet(?:e|es|ed|ing)|remov(?:e|es|ed|ing)|rm|unlink${V}|overwrit(?:e|es|ing)|move[_ ]?files?|create[_ ]?files?|edit[_ ]?files?|wipe${V})\\b`, "i") },
  { capability: "MONEY_OR_PAYMENTS", risk: "HIGH", re: new RegExp(`\\b(pay${V}|payments?|transfer${V}|send${V}[_ ]?(usdc|eth|funds|money|tokens)|withdraw${V}|purchas(?:e|es|ed|ing)|buy|buys|swap${V}|wallets?|invoices?|charg(?:e|es|ed|ing))\\b`, "i") },
  { capability: "CREDENTIALS_OR_SECRETS", risk: "HIGH", re: /\b(secrets?|passwords?|credentials?|api[_ -]?keys?|(access|auth|bearer|refresh|oauth|session)[_ -]?tokens?|private[_ -]?keys?|seed phrase|mnemonic|id_rsa|\.ssh|\.env)\b/i },
  { capability: "DATA_EXFILTRATION", risk: "HIGH", re: new RegExp(`\\b(exfiltrat(?:e|es|ed|ing)|leak${V}|upload${V}[^.]{0,40}(our|external|remote|third[- ]party) server)\\b`, "i") },
  { capability: "OUTBOUND_MESSAGING", risk: "MEDIUM", re: new RegExp(`\\b(send${V}[_ ]?(emails?|messages?|sms)|post${V}[_ ]?(tweets?|messages?)|notif(?:y|ies)|slack|telegram|discord|emails?)\\b`, "i") },
  { capability: "NETWORK_FETCH", risk: "MEDIUM", re: new RegExp(`\\b(fetch${V}|http|urls?|brows(?:e|es|ing)|scrap(?:e|es|ing)|crawl${V}|download${V}|upload${V}|requests?)\\b`, "i") },
  { capability: "DATABASE_WRITE", risk: "MEDIUM", re: /\b(insert|update|upsert|drop|truncate|sql|database|db_)\b/i },
  { capability: "FILESYSTEM_READ", risk: "LOW", re: /\b(read[_ ]?files?|list[_ ]?(dir|files)|get[_ ]?files?|open[_ ]?files?)\b/i },
];

const INJECTION_PATTERNS = [
  { id: "IGNORE_PREVIOUS_INSTRUCTIONS", re: /ignore (all |any )?(previous|prior|above) (instructions|prompts)/i },
  { id: "HIDDEN_SYSTEM_DIRECTIVE", re: /<\s*(system|important|instructions?)\s*>/i },
  { id: "DO_NOT_TELL_USER", re: /(do not|don't|never) (tell|inform|mention|show)( to)? (the )?user/i },
  { id: "EXFILTRATION_HINT", re: /(send|upload|post|forward).{0,40}(~\/\.ssh|id_rsa|\.env|credentials|private key)/i },
  { id: "CROSS_TOOL_HIJACK", re: /(before|instead of) (using|calling) (any )?other tools?/i },
];

const INVISIBLE_UNICODE = /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF\u{E0000}-\u{E007F}]/u;

/**
 * Metodología pública del puntaje. Cualquier cambio de reglas se registra aquí y aplica a TODOS
 * los servidores por igual (incluido el nuestro).
 */
export const TRUST_METHODOLOGY = {
  version: "1.1.0",
  scoring: {
    start: 100,
    penalties: { CRITICAL: -35, HIGH: -15, MEDIUM: -5, LOW: -1, toolsChangedSinceLastCheck: -10 },
    verdicts: { DO_NOT_CONNECT: "any CRITICAL finding", LOW_RISK: ">= 80", REVIEW_BEFORE_USE: "55-79", HIGH_RISK: "< 55" },
  },
  signals: [
    "Capabilities inferred from tool names and descriptions (code execution, file write/delete, payments, credentials, messaging, network, database).",
    "Prompt-injection / tool-poisoning phrases and hidden Unicode in tool metadata.",
    "MCP safety annotations (readOnlyHint, destructiveHint) compared against inferred capabilities.",
    "Tool list fingerprint compared with the previous check (drift / rug-pull).",
    "Tool list compared across two identical calls (cloaking).",
  ],
  limitations: [
    "Only public metadata is analyzed. Runtime behavior requires a local gateway.",
    "Keyword heuristics can produce false positives and false negatives.",
  ],
  changelog: [
    { version: "1.0.0", date: "2026-11-17", change: "Initial release." },
    {
      version: "1.1.0",
      date: "2026-11-17",
      change:
        "Fewer false positives for security/audit tools: text that only DESCRIBES what a tool detects ('scans for', 'detects', 'flags', 'checks for'), negations ('does not move funds') and references to the caller's own actions ('before you pay') no longer count as capabilities, unless the same clause also chains a real action ('and then deletes'). 'token' alone no longer means credentials (LLM tokens); only access/auth/bearer/session tokens do. Unauthenticated-exposure finding now only counts high-impact tools that are not declared read-only. Stricter in other places: verb conjugations (deletes, deleted, pays...), snake_case tool names (run_shell), ~/.ssh / .env references and exfiltration to external servers are now detected. Adversarial regression tests keep real attacks detected.",
    },
  ],
};

const DETECTION_VERBS = /\b(scans?|scanning|detects?|detecting|flags?|flagging|checks?|checking|looks? for|searches|searching|audits?|auditing|verif(?:y|ies)|monitors?|blocks?|prevents?|protects? against|guards? against|identif(?:y|ies))\b/i;
const CHAINED_ACTION = /(\b(and|then|by|to)\b|,)\s*(then\s+)?(it\s+)?(delet|remov|execut|run|send|transfer|pay|writ|upload|post|withdraw|overwrit|exfiltrat|forward|leak)\w*/i;
const NEGATION_SPAN = /\b(does not|doesn't|do not|never|cannot|can't|without|no)\s+(\w+\s+){0,3}?(move|moves|send|sends|transfer|transfers|pay|pays|touch|touches|execute|executes|write|writes|delete|deletes|access|accesses|store|stores)\b[^.;]*/gi;
const CALLER_ACTION_SPAN = /\b(before|after|when|if)?\s*(you|you've|you have|you're)\s+(pay|paid|paying|buy|bought|buying|spend|spent|purchase|purchased)\b(\s+for)?/gi;

/**
 * Elimina del texto las partes que solo DESCRIBEN lo que la herramienta detecta, negaciones y
 * acciones del propio usuario. Conserva cualquier acción real encadenada en la misma frase.
 */
export function stripNonCapabilityContext(text) {
  let out = String(text || "")
    .replace(NEGATION_SPAN, " ")
    .replace(CALLER_ACTION_SPAN, " ");
  const clauses = out.split(/(?<=[.;:!?])\s+|\s+-\s+/);
  return clauses
    .map((clause) => {
      const m = clause.match(DETECTION_VERBS);
      if (!m) return clause;
      const before = clause.slice(0, m.index);
      const after = clause.slice(m.index);
      const chained = after.match(CHAINED_ACTION);
      // Si la frase encadena una acción real ("detects X and then deletes"), conservar desde esa acción.
      return chained ? `${before} ${after.slice(chained.index)}` : before;
    })
    .join(" ");
}

function sha256(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function stableToolFingerprint(tools) {
  const normalized = tools
    .map((t) => ({
      name: t.name,
      description: t.description || "",
      inputSchema: t.inputSchema || {},
      annotations: t.annotations || {},
    }))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
  return sha256(JSON.stringify(normalized));
}

function perToolHashes(tools) {
  const out = {};
  for (const t of tools) {
    out[t.name] = sha256(JSON.stringify({ d: t.description || "", s: t.inputSchema || {}, a: t.annotations || {} })).slice(0, 16);
  }
  return out;
}

function classifyTool(tool) {
  const haystack = `${String(tool.name || "").replace(/_/g, " ")} ${stripNonCapabilityContext(tool.description || "")}`;
  const caps = CAPABILITY_PATTERNS.filter((p) => p.re.test(haystack)).map((p) => ({ capability: p.capability, risk: p.risk }));
  const ann = tool.annotations || {};
  const declaredReadOnly = ann.readOnlyHint === true;
  const declaredDestructive = ann.destructiveHint === true;
  const highCaps = caps.filter((c) => c.risk === "HIGH");
  let risk = caps.some((c) => c.risk === "HIGH") ? "HIGH" : caps.some((c) => c.risk === "MEDIUM") ? "MEDIUM" : "LOW";
  if (declaredDestructive) risk = "HIGH";
  return {
    name: tool.name,
    risk,
    inferredCapabilities: caps.map((c) => c.capability),
    declaredReadOnly,
    declaredDestructive,
    declaredOpenWorld: ann.openWorldHint === true,
    hasAnnotations: Object.keys(ann).length > 0,
    annotationMismatch: declaredReadOnly && highCaps.some((c) => c.capability !== "CREDENTIALS_OR_SECRETS"),
  };
}

function estimateTokens(obj) {
  return Math.ceil(JSON.stringify(obj).length / 4);
}

function scanFindings(probe, classified) {
  const findings = [];
  for (const tool of probe.tools) {
    const text = `${tool.description || ""} ${JSON.stringify(tool.inputSchema || {})}`;
    for (const p of INJECTION_PATTERNS) {
      if (p.re.test(text)) {
        findings.push({ severity: "CRITICAL", tool: tool.name, id: `PROMPT_INJECTION_${p.id}`, detail: "Tool metadata contains instructions aimed at the calling model (tool poisoning pattern)." });
      }
    }
    if (INVISIBLE_UNICODE.test(text)) {
      findings.push({ severity: "HIGH", tool: tool.name, id: "INVISIBLE_UNICODE_IN_METADATA", detail: "Hidden zero-width / tag Unicode characters found in tool metadata." });
    }
    if ((tool.description || "").length > 4000) {
      findings.push({ severity: "MEDIUM", tool: tool.name, id: "OVERSIZED_DESCRIPTION", detail: "Very long description: can hide instructions and wastes context tokens." });
    }
    if (!tool.description) {
      findings.push({ severity: "LOW", tool: tool.name, id: "MISSING_DESCRIPTION", detail: "Tool has no description; agents cannot judge what it does." });
    }
  }
  for (const c of classified) {
    if (c.annotationMismatch) {
      findings.push({ severity: "HIGH", tool: c.name, id: "READONLY_HINT_CONTRADICTS_CAPABILITY", detail: `Declared readOnlyHint=true but looks capable of: ${c.inferredCapabilities.join(", ")}.` });
    }
    if (c.risk === "HIGH" && !c.hasAnnotations) {
      findings.push({ severity: "MEDIUM", tool: c.name, id: "HIGH_RISK_TOOL_WITHOUT_ANNOTATIONS", detail: "High-impact tool has no safety annotations (destructiveHint / readOnlyHint)." });
    }
  }
  const highRiskWritable = classified.filter((c) => c.risk === "HIGH" && !c.declaredReadOnly);
  if (highRiskWritable.length > 0) {
    findings.push({ severity: "MEDIUM", tool: null, id: "HIGH_RISK_TOOLS_EXPOSED_WITHOUT_AUTH", detail: `${highRiskWritable.length} high-impact, non-read-only tool(s) are listed to anonymous clients with no authentication: ${highRiskWritable.map((c) => c.name).join(", ")}.` });
  }
  return findings;
}

function ensureStore(ledger) {
  if (!ledger.freeTrustCheck) {
    ledger.freeTrustCheck = {
      snapshots: new Map(), // url -> { fingerprint, toolHashes, firstSeenAt, lastSeenAt, checks }
      quota: new Map(), // callerKey|day -> count
      stats: { totalChecks: 0, freeChecks: 0, paidChecks: 0, quotaBlocked: 0 },
      persist: null, // función (url, snap, map) => Promise; se activa con enableTrustPersistence()
    };
  }
  return ledger.freeTrustCheck;
}

/**
 * Activa la persistencia del historial (Upstash Redis o archivo local) y recarga las fichas guardadas.
 * Solo lo llama server.js; los tests trabajan en memoria.
 */
export async function enableTrustPersistence(ledger) {
  const { loadTrustSnapshots, saveTrustSnapshot, trustStoreStatus } = await import("./trustStore.js");
  const store = ensureStore(ledger);
  const entries = await loadTrustSnapshots();
  for (const [url, snap] of entries) {
    if (snap && snap.fingerprint && !store.snapshots.has(url)) store.snapshots.set(url, snap);
  }
  store.persist = saveTrustSnapshot;
  store.persistStatus = trustStoreStatus;
  return trustStoreStatus;
}

/** Consume una consulta gratis diaria. Devuelve { allowed, remaining }. */
export function consumeFreeCheckQuota(ledger, callerKey) {
  const store = ensureStore(ledger);
  const day = new Date().toISOString().slice(0, 10);
  const key = `${callerKey || "anonymous"}|${day}`;
  if (store.quota.size > 5000) store.quota.clear();
  const used = store.quota.get(key) || 0;
  if (used >= FREE_CHECKS_PER_DAY) return { allowed: false, remaining: 0, used };
  store.quota.set(key, used + 1);
  return { allowed: true, remaining: FREE_CHECKS_PER_DAY - used - 1, used: used + 1 };
}

function paymentInstructions() {
  const wallet = "0x861Ac49F8299C45Cca6bD9F0254080Fd82061Ac4";
  return {
    network: "Base Mainnet",
    chainId: 8453,
    usdcTokenContract: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    recipientWallet: wallet,
    fullDossierSample: FULL_DOSSIER_SAMPLE,
    pricing: [
      { tier: "FREE", priceUsdc: 0, includes: `${FREE_CHECKS_PER_DAY} checks/day, questions 1, 2 and 5` },
      { tier: "EXTRA_CHECK", priceUsdc: EXTRA_CHECK_PRICE_USDC, includes: "One more basic check after the daily free quota" },
      { tier: "FULL_DOSSIER", priceUsdc: FULL_DOSSIER_PRICE_USDC, includes: "All 7 questions, every finding, anti-cloaking test and signed report" },
    ],
    howToUnlock: `Generate and keep a private random 32-byte token as 64 hex characters. Send the USDC amount on Base to ${wallet}, then call check_mcp_server_trust with serverUrl, paymentTxHash and paymentRecoveryToken. Reuse those arguments to recover the report without another transfer. Amount >= ${FULL_DOSSIER_PRICE_USDC} unlocks the full dossier; >= ${EXTRA_CHECK_PRICE_USDC} unlocks one extra basic check.`,
  };
}

export function buildQuotaExhaustedResponse(quota) {
  return {
    ok: false,
    tool: "check_mcp_server_trust",
    status: "FREE_DAILY_QUOTA_EXHAUSTED",
    httpStatus: 402,
    reason: `You used your ${FREE_CHECKS_PER_DAY} free checks for today. They reset at 00:00 UTC.`,
    freeChecksRemainingToday: quota?.remaining ?? 0,
    unlock: paymentInstructions(),
  };
}

// ---------------------------------------------------------------------------
// Insignia pública para dueños de servidores MCP
// ---------------------------------------------------------------------------
export function getPublicTrustRecord(ledger, serverUrl) {
  const store = ensureStore(ledger);
  let key = String(serverUrl || "").trim();
  try {
    key = new URL(key).toString();
  } catch {
    /* usar tal cual */
  }
  const snap = store.snapshots.get(key);
  if (!snap) return { ok: false, server: key, status: "NOT_CHECKED_YET", howToCheck: "Call the MCP tool check_mcp_server_trust with this serverUrl (free)." };
  const stale = Date.now() - Date.parse(snap.lastSeenAt) > BADGE_STALE_MS;
  return {
    ok: true,
    server: key,
    serverName: snap.serverName,
    trustScore: snap.lastScore ?? null,
    verdict: snap.lastVerdict ?? null,
    firstSeenAt: snap.firstSeenAt,
    lastCheckedAt: snap.lastSeenAt,
    totalChecks: snap.checks,
    stale,
    toolFingerprint: snap.fingerprint.slice(0, 16),
    serverVersion: snap.serverVersion ?? null,
    history: snap.history || [],
  };
}

function escapeXml(s) {
  return String(s).replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]);
}

export function renderTrustBadgeSvg(ledger, serverUrl) {
  const rec = getPublicTrustRecord(ledger, serverUrl);
  let value;
  let color;
  if (!rec.ok) {
    value = "not checked";
    color = "#9f9f9f";
  } else if (rec.stale) {
    value = `${rec.trustScore}/100 (stale)`;
    color = "#9f9f9f";
  } else {
    value = `${rec.trustScore}/100`;
    color = rec.verdict === "LOW_RISK" ? "#2ea44f" : rec.verdict === "REVIEW_BEFORE_USE" ? "#dfb317" : "#e05d44";
  }
  const label = "VERITAS MCP trust";
  const lw = label.length * 6.5 + 12;
  const vw = value.length * 6.8 + 12;
  const w = Math.round(lw + vw);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="20" role="img" aria-label="${escapeXml(label)}: ${escapeXml(value)}"><title>${escapeXml(label)}: ${escapeXml(value)}</title><rect width="${Math.round(lw)}" height="20" fill="#555"/><rect x="${Math.round(lw)}" width="${Math.round(vw)}" height="20" fill="${color}"/><g fill="#fff" font-family="Verdana,DejaVu Sans,sans-serif" font-size="11" text-anchor="middle"><text x="${Math.round(lw / 2)}" y="14">${escapeXml(label)}</text><text x="${Math.round(lw + vw / 2)}" y="14">${escapeXml(value)}</text></g></svg>`;
}

/**
 * Construye el informe (síncrono). `probe` viene de probeMcpServerLive().
 * `mode`: "FREE" (3/7 preguntas) o "FULL" (7/7 + firma).
 */
export function buildMcpTrustReport({ ledger, probe, mode = "FREE", quota = null, paymentTxHash = null }) {
  const store = ensureStore(ledger);
  store.stats.totalChecks += 1;
  if (mode === "FULL") store.stats.paidChecks += 1;
  else store.stats.freeChecks += 1;

  if (!probe || !probe.ok) {
    return {
      ok: false,
      tool: "check_mcp_server_trust",
      mode,
      stage: probe?.stage || "unknown",
      reason: probe?.reason || "Probe failed.",
      requiresAuth: Boolean(probe?.requiresAuth),
      httpStatus: probe?.httpStatus ?? null,
      freeChecksRemainingToday: quota?.remaining ?? null,
      checkedAt: probe?.checkedAt || new Date().toISOString(),
    };
  }

  const classified = probe.tools.map(classifyTool);
  const fingerprint = stableToolFingerprint(probe.tools);
  const toolHashes = perToolHashes(probe.tools);
  const prev = store.snapshots.get(probe.serverUrl) || null;

  // Q5: cambios desde el último chequeo
  let drift;
  if (!prev) {
    drift = { status: "BASELINE_RECORDED", detail: "First time we see this server. Check again after its next update to detect changes." };
  } else if (prev.fingerprint === fingerprint) {
    drift = { status: "NO_CHANGE", sinceIso: prev.lastSeenAt, previousChecks: prev.checks };
  } else {
    const added = Object.keys(toolHashes).filter((n) => !(n in prev.toolHashes));
    const removed = Object.keys(prev.toolHashes).filter((n) => !(n in toolHashes));
    const modified = Object.keys(toolHashes).filter((n) => n in prev.toolHashes && prev.toolHashes[n] !== toolHashes[n]);
    drift = {
      status: "CHANGED_SINCE_LAST_CHECK",
      sinceIso: prev.lastSeenAt,
      addedTools: added,
      removedTools: removed,
      modifiedTools: modified,
      alert: modified.length || added.length ? "Review changed tool descriptions/schemas before trusting them again (rug-pull pattern)." : null,
    };
  }
  if (store.snapshots.size > 2000 && !prev) store.snapshots.delete(store.snapshots.keys().next().value);
  store.snapshots.set(probe.serverUrl, {
    fingerprint,
    toolHashes,
    firstSeenAt: prev?.firstSeenAt || probe.checkedAt,
    lastSeenAt: probe.checkedAt,
    checks: (prev?.checks || 0) + 1,
  });

  const riskCounts = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  classified.forEach((c) => (riskCounts[c.risk] += 1));
  const totalToolTokens = estimateTokens(probe.tools);

  const q1 = {
    question: "What permissions does it have?",
    summary: `${probe.tools.length} tools exposed anonymously: ${riskCounts.HIGH} high-impact, ${riskCounts.MEDIUM} medium, ${riskCounts.LOW} low.`,
    capabilitiesDetected: [...new Set(classified.flatMap((c) => c.inferredCapabilities))],
    highImpactTools: classified.filter((c) => c.risk === "HIGH").map((c) => ({ name: c.name, capabilities: c.inferredCapabilities, declaredDestructive: c.declaredDestructive })),
    note: "Inferred from public tool metadata and MCP annotations, not from runtime observation.",
  };
  const q2 = {
    question: "What tools does it use?",
    toolCount: probe.tools.length,
    tools: classified.map((c) => ({ name: c.name, risk: c.risk, readOnly: c.declaredReadOnly, destructive: c.declaredDestructive })),
    contextFootprintTokensApprox: totalToolTokens,
    avgTokensPerTool: probe.tools.length ? Math.round(totalToolTokens / probe.tools.length) : 0,
    annotationCoveragePct: probe.tools.length ? Math.round((classified.filter((c) => c.hasAnnotations).length / probe.tools.length) * 100) : 0,
  };
  const q5 = { question: "Has its behavior changed after an update?", ...drift, currentFingerprint: fingerprint.slice(0, 16) };

  const findings = scanFindings(probe, classified);
  const sev = (s) => findings.filter((f) => f.severity === s).length;
  let score = 100 - sev("CRITICAL") * 35 - sev("HIGH") * 15 - sev("MEDIUM") * 5 - sev("LOW") * 1;
  if (drift.status === "CHANGED_SINCE_LAST_CHECK" && (drift.modifiedTools?.length || drift.addedTools?.length)) score -= 10;
  score = Math.max(0, Math.min(100, score));
  const verdict = sev("CRITICAL") > 0 ? "DO_NOT_CONNECT" : score >= 80 ? "LOW_RISK" : score >= 55 ? "REVIEW_BEFORE_USE" : "HIGH_RISK";
  const snap = store.snapshots.get(probe.serverUrl);
  snap.lastScore = score;
  snap.lastVerdict = verdict;
  snap.serverName = probe.serverInfo?.name || null;
  snap.serverVersion = probe.serverInfo?.version || null;
  // Historial técnico de confianza: una línea por chequeo (últimos 50).
  snap.history = [
    ...(prev?.history || []),
    {
      at: probe.checkedAt,
      score,
      verdict,
      version: probe.serverInfo?.version || null,
      fingerprint: fingerprint.slice(0, 16),
      toolCount: probe.tools.length,
      drift: drift.status,
      ...(drift.status === "CHANGED_SINCE_LAST_CHECK"
        ? { added: drift.addedTools.length, removed: drift.removedTools.length, modified: drift.modifiedTools.length }
        : {}),
    },
  ].slice(-50);
  if (store.persist) store.persist(probe.serverUrl, snap, store.snapshots);
  const badgeUrl = `${PUBLIC_BASE_URL}/badge.svg?server=${encodeURIComponent(probe.serverUrl)}`;

  const base = {
    ok: true,
    tool: "check_mcp_server_trust",
    mode,
    server: {
      url: probe.serverUrl,
      name: probe.serverInfo?.name || null,
      version: probe.serverInfo?.version || null,
      protocolVersion: probe.protocolVersion,
      latencyMs: { initialize: probe.initLatencyMs, toolsList: probe.toolsListLatencyMs },
    },
    checkedAt: probe.checkedAt,
    trustScore: score,
    verdict,
    findingsCount: { critical: sev("CRITICAL"), high: sev("HIGH"), medium: sev("MEDIUM"), low: sev("LOW") },
    answers: {
      q1_whatPermissionsDoesItHave: q1,
      q2_whatToolsDoesItUse: q2,
      q5_hasBehaviorChangedAfterUpdate: q5,
    },
    disclaimer: "Evidence-based snapshot from public MCP metadata. Not an absolute security guarantee.",
    methodology: { version: TRUST_METHODOLOGY.version, url: `${PUBLIC_BASE_URL}/trust/methodology` },
    badge: {
      svgUrl: badgeUrl,
      markdownForReadme: `[![VERITAS MCP Trust](${badgeUrl})](${PUBLIC_BASE_URL}/trust?server=${encodeURIComponent(probe.serverUrl)})`,
      note: "Free badge for server owners. It always shows the latest score and turns grey if the server is not re-checked in 30 days.",
    },
  };

  if (mode !== "FULL") {
    base.answers.q3_hasItTriedUnauthorizedAccess = { locked: true };
    base.answers.q4_areResultsReproducible = { locked: true };
    base.answers.q6_whichAuditsHasItPassed = { locked: true };
    base.answers.q7_whatVulnerabilitiesRemainPending = { locked: true, teaser: `${findings.length} finding(s) detected (${sev("CRITICAL")} critical, ${sev("HIGH")} high). Details in the full dossier.` };
    base.freeChecksRemainingToday = quota?.remaining ?? null;
    base.unlockFullDossier = paymentInstructions();
    return base;
  }

  // ---- FULL: 7/7 ----
  const metaText = `${probe.instructions || ""} ${probe.tools.map((t) => t.description || "").join(" ")}`;
  const q3 = {
    question: "Has it tried to access unauthorized resources?",
    status: findings.some((f) => f.id.startsWith("PROMPT_INJECTION_EXFILTRATION")) ? "EXFILTRATION_INSTRUCTIONS_FOUND_IN_METADATA" : "NO_EVIDENCE_IN_METADATA",
    serverInstructionsInjectionHits: INJECTION_PATTERNS.filter((p) => p.re.test(probe.instructions || "")).map((p) => p.id),
    credentialRequestsInSchemas: probe.tools
      .filter((t) => /password|secret|private[_ ]?key|api[_ ]?key|mnemonic|seed/i.test(JSON.stringify(t.inputSchema || {})))
      .map((t) => t.name),
    limitation: "A remote probe can only see declared metadata. Runtime access attempts require a local MCP gateway/proxy.",
    metadataBytesScanned: metaText.length,
  };
  let reproducibility;
  if (probe.secondToolsList) {
    const fp2 = stableToolFingerprint(probe.secondToolsList);
    reproducibility = fp2 === fingerprint ? "STABLE_ACROSS_REPEATED_CALLS" : "TOOL_LIST_CHANGES_BETWEEN_CALLS";
  } else {
    reproducibility = "SECOND_CALL_FAILED";
  }
  const q4 = {
    question: "Are its results reproducible?",
    toolsListConsistency: reproducibility,
    alert: reproducibility === "TOOL_LIST_CHANGES_BETWEEN_CALLS" ? "Tool definitions differ between two identical calls: possible cloaking (shows different tools to different clients)." : null,
  };
  const q6 = {
    question: "Which audits has it passed?",
    checksPassed: [
      { check: "HTTPS transport", passed: true },
      { check: "MCP initialize handshake", passed: true },
      { check: "No prompt-injection patterns in tool metadata", passed: sev("CRITICAL") === 0 },
      { check: "No hidden Unicode in metadata", passed: !findings.some((f) => f.id === "INVISIBLE_UNICODE_IN_METADATA") },
      { check: "Annotations consistent with capabilities", passed: !findings.some((f) => f.id === "READONLY_HINT_CONTRADICTS_CAPABILITY") },
      { check: "Stable tool list (anti-cloaking)", passed: reproducibility === "STABLE_ACROSS_REPEATED_CALLS" },
      { check: "Response time under 1500 ms", passed: probe.toolsListLatencyMs < 1500 },
    ],
    veritasHistory: { firstSeenAt: store.snapshots.get(probe.serverUrl).firstSeenAt, totalChecks: store.snapshots.get(probe.serverUrl).checks },
  };
  const q7 = { question: "What vulnerabilities remain pending?", findings };

  base.answers = {
    q1_whatPermissionsDoesItHave: q1,
    q2_whatToolsDoesItUse: q2,
    q3_hasItTriedUnauthorizedAccess: q3,
    q4_areResultsReproducible: q4,
    q5_hasBehaviorChangedAfterUpdate: q5,
    q6_whichAuditsHasItPassed: q6,
    q7_whatVulnerabilitiesRemainPending: q7,
  };
  const reportHash = sha256(JSON.stringify(base.answers) + base.checkedAt);
  base.notarySeal = {
    reportSha256: reportHash,
    signatureHmacSha256: crypto.createHmac("sha256", ledger.evaluatorSecretKey || "veritas").update(`MCP_TRUST|${probe.serverUrl}|${reportHash}`).digest("hex"),
    signer: "0x861Ac49F8299C45Cca6bD9F0254080Fd82061Ac4",
    paymentTxHash,
  };
  return base;
}

export function getFreeTrustCheckStats(ledger) {
  const store = ensureStore(ledger);
  return {
    ...store.stats,
    serversTracked: store.snapshots.size,
    persistence: store.persistStatus
      ? { backend: store.persistStatus.backend, loadedOnStartup: store.persistStatus.loadedSnapshots, lastSaveAt: store.persistStatus.lastSaveAt, saveErrors: store.persistStatus.saveErrors }
      : { backend: "memory" },
  };
}
