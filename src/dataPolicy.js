/**
 * Política de datos VERITAS / TrustGate (fuente única de verdad).
 *
 * Tres niveles:
 *   PRIVATE              -> clientes de seguridad, compradores, escrow, chequeos de confianza. Nunca se exponen ni se venden.
 *   PUBLIC_BY_CONSENT    -> vendedores que se registran en la notaría pública y aceptan los términos.
 *   AGGREGATED_ANONYMOUS -> estadísticas de tráfico sin identificar a ningún agente.
 *
 * Esta política se sirve en /privacy (JSON) y /privacy.md, y se refleja en PRIVACY.md del repositorio.
 */

export const DATA_POLICY_VERSION = "1.0.0";
export const PUBLIC_REGISTRY_TERMS_VERSION = "1.0.0";

export const PUBLIC_REGISTRY_TERMS = {
  version: PUBLIC_REGISTRY_TERMS_VERSION,
  en: "By registering a store in the VERITAS public notary registry you agree that the following is PUBLIC and may be shown, ranked and included in paid market reports: store id and name, endpoint URL, payout wallet address, category (vertical), market tier, starting price, star level, audit verdicts and their dates, reputation score, verified reviews and usage statistics of your listing (views, searches that matched your category, deals closed). The CONTENT of your deliverables, your buyers' identities and the content of notarized deals are NOT published. You can request removal at any time; past notarial records (hashes and dates) are kept as an append-only public log.",
  es: "Al registrar una tienda en el registro notarial público VERITAS aceptas que lo siguiente es PÚBLICO y puede mostrarse, rankearse e incluirse en informes de mercado de pago: id y nombre de la tienda, URL del endpoint, wallet de cobro, rubro (vertical), segmento, precio inicial, nivel de estrellas, veredictos de auditoría y sus fechas, reputación, reseñas verificadas y estadísticas de uso de tu ficha (vistas, búsquedas que coincidieron con tu rubro, tratos cerrados). NO se publica el CONTENIDO de tus entregables, la identidad de tus compradores ni el contenido de los tratos notariados. Puedes pedir la baja cuando quieras; los registros notariales pasados (hashes y fechas) se conservan como registro público de solo-añadir.",
};

export const BUYER_DIRECTORY_TERMS = {
  en: "Optional. If you set listMeInBuyerDirectory=true, 2-3 star sellers can see your buyer id, budget limits, categories of interest and RFQ text, and can send you offers. Default is false: your passport stays private.",
  es: "Opcional. Si envías listMeInBuyerDirectory=true, los vendedores de 2-3 estrellas pueden ver tu id de comprador, límites de presupuesto, rubros de interés y texto de solicitud, y enviarte ofertas. Por defecto es false: tu pasaporte queda privado.",
};

export const DATA_POLICY = {
  version: DATA_POLICY_VERSION,
  operator: "adamgraymon (GitHub: github.com/adamgraymon/Own_adam)",
  summary: {
    en: "Two businesses, two rules. SECURITY & ESCROW clients are private. SELLERS who register in the PUBLIC NOTARY accept that their listing is public. Traffic is only shared as anonymous aggregates.",
    es: "Dos negocios, dos reglas. Los clientes de SEGURIDAD y ESCROW son privados. Los VENDEDORES que se registran en la NOTARÍA PÚBLICA aceptan que su ficha sea pública. El tráfico solo se comparte como agregados anónimos.",
  },
  tiers: {
    PRIVATE: {
      who: [
        "Security audits: audit_smart_contract_escrow, audit_agent_skill_escrow, audit_rag_embeddings_escrow, audit_ai_inference_escrow, audit_quant_backtest_escrow, audit_api_sla_escrow, audit_depin_gpu_sla_escrow",
        "Escrow: open_escrow_job, submit_encrypted_deliverable, claim_escrow_timeout_refund",
        "Trust checks: check_mcp_server_trust (who asked is private; the checked server's public metadata and score are public)",
        "Buyers: manage_buyer_finops_spend_passport (unless the buyer opts in to the directory)",
        "Content of notarized deals",
      ],
      rules: {
        en: [
          "Never published, never sold, never used to build lead lists.",
          "Inputs to audit_* tools (code, datasets, skills, embeddings) are processed in memory and not stored after the response. Escrow deliverables stay encrypted until settlement.",
          "Not shown to sellers. Calling a security tool does NOT register you as a buyer.",
        ],
        es: [
          "Nunca se publica, nunca se vende, nunca se usa para armar listas de leads.",
          "Lo que envías a las herramientas audit_* (código, datasets, skills, embeddings) se procesa en memoria y no se guarda tras la respuesta. Los entregables de escrow quedan cifrados hasta la liquidación.",
          "No se muestra a vendedores. Usar una herramienta de seguridad NO te registra como comprador.",
        ],
      },
    },
    PUBLIC_BY_CONSENT: {
      who: ["Sellers registered with register_and_certify_store and acceptPublicRegistryTerms=true", "Buyers who set listMeInBuyerDirectory=true", "Existence of notarial records (id, date, hash, seller star level)"],
      terms: PUBLIC_REGISTRY_TERMS,
      buyerDirectoryTerms: BUYER_DIRECTORY_TERMS,
    },
    AGGREGATED_ANONYMOUS: {
      who: ["All traffic to the server"],
      rules: {
        en: ["Shared or sold only as counts by sector, endpoint, tool and keyword.", "No individual agent is named in public or paid reports.", "Raw request details are visible only to the operator, protected by a secret key, kept in memory (last 40 events)."],
        es: ["Se comparte o vende solo como conteos por rubro, endpoint, herramienta y palabra clave.", "Ningún agente individual aparece con nombre en informes públicos o de pago.", "El detalle bruto solo lo ve el operador, protegido por clave secreta, en memoria (últimos 40 eventos)."],
      },
    },
  },
  retention: {
    auditInputs: "Inputs to the 7 audit_* tools are processed in memory and not stored after the response.",
    escrowDeliverables: "Kept AES-256-GCM encrypted in server memory until the escrow settles; the decryption key is released only to the buyer. Lost on restart.",
    rawTrafficEvents: "Memory only, last 40 events, lost on restart. IPs are never stored in clear: only a truncated SHA-256 hash of IP+user-agent.",
    trustCheckHistory: "Per checked server (public endpoint metadata): last 50 checks, persisted.",
    freeQuotaCounters: "Per day, memory only.",
    sellerRegistry: "Until removal is requested; notarial hashes are append-only.",
  },
  serverSideKeys: {
    en: "These keys belong to the OPERATOR and live only in the server environment. Users never provide them, and no tool asks for your private keys.",
    es: "Estas claves son del OPERADOR y viven solo en el entorno del servidor. Los usuarios nunca las entregan y ninguna herramienta pide tus claves privadas.",
    keys: {
      EVALUATOR_PRIVATE_KEY: "Signs evaluator verdicts on the escrow contract (0xd4f7...0a5e). It cannot withdraw escrowed funds to arbitrary addresses: the contract only pays the seller (approved) or refunds the buyer (rejected/timeout). Rotatable by the contract owner (rotateEvaluatorKey).",
      GEMINI_API_KEY: "Optional. Used only for a second-opinion review of up to 30 sampled dataset rows. If absent, a local heuristic judge is used. Billed to the operator, never to users.",
      UPSTASH_REDIS_REST_URL_AND_TOKEN: "Optional. Stores the public trust-check history so it survives restarts.",
      OWNER_DASHBOARD_KEY: "Protects the operator's raw traffic view.",
    },
  },
  contact: "Open an issue at https://github.com/adamgraymon/Own_adam/issues (removal requests, privacy questions).",
};

/**
 * Agrega registros del radar sin identificar agentes: solo conteos por palabra clave y herramienta.
 */
export function anonymizeRadarRecords(records = []) {
  const keywordCounts = {};
  const toolCounts = {};
  let totalSearches = 0;
  for (const r of records || []) {
    const n = Number(r.searchFrequencyCount) || 0;
    totalSearches += n;
    for (const kw of r.exactKeywordsQueried || []) keywordCounts[kw] = (keywordCounts[kw] || 0) + n;
    if (r.lastToolQueried) toolCounts[r.lastToolQueried] = (toolCounts[r.lastToolQueried] || 0) + n;
  }
  const top = (obj) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 25)
      .map(([key, count]) => ({ key, count }));
  return {
    privacyTier: "AGGREGATED_ANONYMOUS",
    distinctAgentsCount: (records || []).length,
    totalSearches,
    topKeywords: top(keywordCounts),
    topToolsQueried: top(toolCounts),
    note: "Individual agents are never named. See /privacy.",
  };
}

export function hasBuyerDirectoryConsent(ledger, buyerId) {
  return Boolean(ledger?.buyerDirectoryConsents?.[buyerId]);
}

export function setBuyerDirectoryConsent(ledger, buyerId, value) {
  if (!ledger.buyerDirectoryConsents) ledger.buyerDirectoryConsents = {};
  if (value) ledger.buyerDirectoryConsents[buyerId] = { consentedAt: new Date().toISOString(), termsVersion: DATA_POLICY_VERSION };
  else delete ledger.buyerDirectoryConsents[buyerId];
}

export function renderPrivacyMarkdown() {
  const p = DATA_POLICY;
  const list = (arr) => arr.map((x) => `- ${x}`).join("\n");
  return `# VERITAS / TrustGate — Data & Privacy Policy (v${p.version})

${p.summary.en}

${p.summary.es}

## 1. PRIVATE (security & escrow clients)
${list(p.tiers.PRIVATE.who)}

${list(p.tiers.PRIVATE.rules.en)}

${list(p.tiers.PRIVATE.rules.es)}

## 2. PUBLIC BY CONSENT (public notary registry)
${list(p.tiers.PUBLIC_BY_CONSENT.who)}

**Seller terms (v${PUBLIC_REGISTRY_TERMS_VERSION})**

${PUBLIC_REGISTRY_TERMS.en}

${PUBLIC_REGISTRY_TERMS.es}

**Buyer directory (opt-in)**

${BUYER_DIRECTORY_TERMS.en}

${BUYER_DIRECTORY_TERMS.es}

## 3. AGGREGATED ANONYMOUS (traffic)
${list(p.tiers.AGGREGATED_ANONYMOUS.rules.en)}

${list(p.tiers.AGGREGATED_ANONYMOUS.rules.es)}

## Retention
${Object.entries(p.retention).map(([k, v]) => `- **${k}**: ${v}`).join("\n")}

## Server-side keys (operator only)
${p.serverSideKeys.en}

${p.serverSideKeys.es}

${Object.entries(p.serverSideKeys.keys).map(([k, v]) => `- \`${k}\`: ${v}`).join("\n")}

## Contact
${p.contact}
`;
}
