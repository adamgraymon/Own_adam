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

export const DATA_POLICY_VERSION = "1.0.1";

/** Prevalencia de idiomas: rige el inglés; el español es traducción oficial; el chino es solo referencia. */
export const LANGUAGE_PRECEDENCE = {
  authoritative: "en",
  officialTranslation: "es",
  referenceOnly: ["zh"],
  en: "Language precedence: the English text is authoritative. The Spanish text is an official translation. The Simplified Chinese text is a reference translation for convenience only; in case of any difference or ambiguity, the English version prevails.",
  es: "Prevalencia de idiomas: el texto en inglés es el que rige. El texto en español es una traducción oficial. El texto en chino simplificado es solo una traducción de referencia; ante cualquier diferencia o ambigüedad, prevalece la versión en inglés.",
  zh: "【语言说明】中文版本仅为便于阅读的参考翻译。如中文与英文或西班牙文版本存在任何差异或歧义，以英文版本为准（西班牙文版本为正式译本）。",
};
export const PUBLIC_REGISTRY_TERMS_VERSION = "1.0.0";

export const PUBLIC_REGISTRY_TERMS = {
  version: PUBLIC_REGISTRY_TERMS_VERSION,
  get languagePrecedence() {
    return LANGUAGE_PRECEDENCE;
  },
  en: "By registering a store in the VERITAS public notary registry you agree that the following is PUBLIC and may be shown, ranked and included in paid market reports: store id and name, endpoint URL, payout wallet address, category (vertical), market tier, starting price, star level, audit verdicts and their dates, reputation score, verified reviews and usage statistics of your listing (views, searches that matched your category, deals closed). The CONTENT of your deliverables, your buyers' identities and the content of notarized deals are NOT published. You can request removal at any time; past notarial records (hashes and dates) are kept as an append-only public log.",
  zh: "在 VERITAS 公共公证登记处注册店铺，即表示您同意以下信息为【公开】信息，可被展示、排名并纳入付费市场报告：店铺 ID 与名称、端点 URL、收款钱包地址、类别（垂直领域）、市场层级、起始价格、星级、审计结论及其日期、信誉分、经验证的评价，以及您店铺页面的使用统计（浏览量、与您类别匹配的搜索次数、已成交的交易）。您交付物的【内容】、您买家的身份以及经公证交易的内容【不会】被公开。您可随时申请下架；过往的公证记录（哈希值与日期）将作为只可追加的公开日志保留。",
  es: "Al registrar una tienda en el registro notarial público VERITAS aceptas que lo siguiente es PÚBLICO y puede mostrarse, rankearse e incluirse en informes de mercado de pago: id y nombre de la tienda, URL del endpoint, wallet de cobro, rubro (vertical), segmento, precio inicial, nivel de estrellas, veredictos de auditoría y sus fechas, reputación, reseñas verificadas y estadísticas de uso de tu ficha (vistas, búsquedas que coincidieron con tu rubro, tratos cerrados). NO se publica el CONTENIDO de tus entregables, la identidad de tus compradores ni el contenido de los tratos notariados. Puedes pedir la baja cuando quieras; los registros notariales pasados (hashes y fechas) se conservan como registro público de solo-añadir.",
};

export const BUYER_DIRECTORY_TERMS = {
  en: "Optional. If you set listMeInBuyerDirectory=true, 2-3 star sellers can see your buyer id, budget limits, categories of interest and RFQ text, and can send you offers. Default is false: your passport stays private.",
  zh: "可选。若设置 listMeInBuyerDirectory=true，2-3 星卖家可以看到您的买家 ID、预算上限、感兴趣的类别和询价内容，并可向您发送报价。默认值为 false：您的护照保持私密。",
  es: "Opcional. Si envías listMeInBuyerDirectory=true, los vendedores de 2-3 estrellas pueden ver tu id de comprador, límites de presupuesto, rubros de interés y texto de solicitud, y enviarte ofertas. Por defecto es false: tu pasaporte queda privado.",
};

export const DATA_POLICY = {
  version: DATA_POLICY_VERSION,
  languagePrecedence: LANGUAGE_PRECEDENCE,
  operator: "adamgraymon (GitHub: github.com/adamgraymon/Own_adam)",
  summary: {
    en: "Two businesses, two rules. SECURITY & ESCROW clients are private. SELLERS who register in the PUBLIC NOTARY accept that their listing is public. Traffic is only shared as anonymous aggregates.",
    zh: "两项业务，两套规则。【安全与托管】客户的数据是私密的。在【公共公证处】注册的【卖家】同意公开其店铺信息。流量数据仅以匿名汇总形式共享。",
    es: "Dos negocios, dos reglas. Los clientes de SEGURIDAD y ESCROW son privados. Los VENDEDORES que se registran en la NOTARÍA PÚBLICA aceptan que su ficha sea pública. El tráfico solo se comparte como agregados anónimos.",
  },
  tiers: {
    PRIVATE: {
      who: [
        "Free skill review: review_agent_skill_free (supplied text is analyzed in memory and kept out of telemetry logs)",
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
        zh: [
          "绝不公开、绝不出售、绝不用于建立潜在客户名单。",
          "提交给 audit_* 工具的内容（代码、数据集、技能、向量嵌入）仅在内存中处理，响应后不会保存。托管交付物在结算前始终保持加密。",
          "不会展示给卖家。使用安全工具【不会】将您登记为买家。",
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
        zh: ["仅以按类别、端点、工具和关键词统计的数量形式共享或出售。", "公开或付费报告中不会点名任何单个智能体。", "原始请求详情仅运营者可见，受密钥保护，仅保存在内存中（最近 40 条事件）。"],
        es: ["Se comparte o vende solo como conteos por rubro, endpoint, herramienta y palabra clave.", "Ningún agente individual aparece con nombre en informes públicos o de pago.", "El detalle bruto solo lo ve el operador, protegido por clave secreta, en memoria (últimos 40 eventos)."],
      },
    },
  },
  retention: {
    auditInputs: "Inputs to the 7 audit_* tools are processed in memory and not stored after the response.",
    escrowDeliverables: "Kept AES-256-GCM encrypted in server memory until the escrow settles; the decryption key is released only to the buyer. Lost on restart.",
    rawTrafficEvents: "Memory only, last 40 events, lost on restart. IPs are never stored in clear: only a truncated SHA-256 hash of IP+user-agent.",
    trustCheckHistory: "Per checked server (public endpoint metadata): last 50 checks, persisted.",
    paidTrustOrders: "Paid order bindings and generated reports are stored privately for recovery. Only a hash of the private recovery token is retained. Records remain until the operator removes them.",
    freeQuotaCounters: "Per day, memory only.",
    sellerRegistry: "Until removal is requested; notarial hashes are append-only.",
  },
  serverSideKeys: {
    en: "These keys belong to the OPERATOR and live only in the server environment. Users never provide them, and no tool asks for your private keys.",
    zh: "这些密钥属于【运营者】，仅存在于服务器环境中。用户从不需要提供这些密钥，也没有任何工具会索取您的私钥。",
    es: "Estas claves son del OPERADOR y viven solo en el entorno del servidor. Los usuarios nunca las entregan y ninguna herramienta pide tus claves privadas.",
    keys: {
      EVALUATOR_PRIVATE_KEY: "Signs evaluator verdicts on the escrow contract (0xd4f7...0a5e). It cannot withdraw escrowed funds to arbitrary addresses: the contract only pays the seller (approved) or refunds the buyer (rejected/timeout). Rotatable by the contract owner (rotateEvaluatorKey).",
      GEMINI_API_KEY: "Optional. Used only for a second-opinion review of up to 30 sampled dataset rows. If absent, a local heuristic judge is used. Billed to the operator, never to users.",
      UPSTASH_REDIS_REST_URL_AND_TOKEN: "Optional. Stores public trust-check history and private paid trust orders in separate keys so they survive restarts.",
      OWNER_DASHBOARD_KEY: "Protects owner console state, simulator controls and detailed traffic. The operator supplies it through the x-owner-key header. Audit and registration logs contain operational metadata only.",
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
  return `# VERITAS / TrustGate — Data & Privacy Policy · Política de datos · 数据与隐私政策 (v${p.version})

> ${LANGUAGE_PRECEDENCE.en}
>
> ${LANGUAGE_PRECEDENCE.es}
>
> ${LANGUAGE_PRECEDENCE.zh}

${p.summary.en}

${p.summary.es}

${p.summary.zh}

## 1. PRIVATE (security & escrow clients)
${list(p.tiers.PRIVATE.who)}

${list(p.tiers.PRIVATE.rules.en)}

${list(p.tiers.PRIVATE.rules.es)}

${list(p.tiers.PRIVATE.rules.zh)}

## 2. PUBLIC BY CONSENT (public notary registry)
${list(p.tiers.PUBLIC_BY_CONSENT.who)}

**Seller terms (v${PUBLIC_REGISTRY_TERMS_VERSION})**

${PUBLIC_REGISTRY_TERMS.en}

${PUBLIC_REGISTRY_TERMS.es}

${PUBLIC_REGISTRY_TERMS.zh}

_${LANGUAGE_PRECEDENCE.zh}_

**Buyer directory (opt-in)**

${BUYER_DIRECTORY_TERMS.en}

${BUYER_DIRECTORY_TERMS.es}

${BUYER_DIRECTORY_TERMS.zh}

## 3. AGGREGATED ANONYMOUS (traffic)
${list(p.tiers.AGGREGATED_ANONYMOUS.rules.en)}

${list(p.tiers.AGGREGATED_ANONYMOUS.rules.es)}

${list(p.tiers.AGGREGATED_ANONYMOUS.rules.zh)}

## Retention
${Object.entries(p.retention).map(([k, v]) => `- **${k}**: ${v}`).join("\n")}

## Server-side keys (operator only)
${p.serverSideKeys.en}

${p.serverSideKeys.es}

${p.serverSideKeys.zh}

${Object.entries(p.serverSideKeys.keys).map(([k, v]) => `- \`${k}\`: ${v}`).join("\n")}

## Contact
${p.contact}
`;
}

export const ESCROW_AND_RESERVE_TERMS_VERSION = "1.0.0";

export const ESCROW_AND_RESERVE_TERMS = {
  version: ESCROW_AND_RESERVE_TERMS_VERSION,
  languagePrecedence: LANGUAGE_PRECEDENCE,
  contracts: {
    perJobEscrow: {
      name: "TrustGateEscrow8183",
      sourcePath: "contracts/TrustGateEscrow8183.sol",
      deployedBaseMainnetAddress: "0xd4f77bf843b3c359b233aca46d7ff6604cbd0a5e",
      sourcifyMatchId: "59283147",
      purpose:
        "Holds 100% of the buyer's USDC for an individual job until the deterministic audit approves the deliverable or the timeout Deadman Switch refunds 100% to the buyer.",
    },
    sellerReserveVaultBlueprint: {
      name: "VeritasRefundableReserveVault",
      sourcePath: "contracts/VeritasRefundableReserveVault.sol",
      compilerVersion: "0.8.38",
      purpose:
        "Non-custodial refundable reserve vault for 2-Star and 3-Star sellers. Sellers can deposit USDC to prove refund liquidity and withdraw 100% of their unlocked reserve at any time without permission whenever they have no active claims.",
    },
  },
  tieredLiquidityRules: {
    UNCLAIMED_0_STAR: {
      gradeCap: "C · Unclaimed (Max 79/100 until claimed by publisher)",
      requiredReserveUsdc: 0,
      rule: "Unclaimed third-party evaluations are capped until the publisher claims the store for free via register_and_certify_store.",
    },
    TIER_1_STAR: {
      seal: "★☆☆ (Verified Seller)",
      requiredReserveUsdc: 0,
      rule: "0 USDC reserve required upfront. Buyer payments are protected 100% 1-to-1 inside the per-job TrustGateEscrow8183 smart contract.",
    },
    TIER_2_STAR: {
      seal: "★★☆ (Certified SLA & Liquidity Lite)",
      requiredReserveUsdc: 10,
      formula: "max(10 USDC, 1x startingPriceUsdc)",
      rule: "Proves active wallet liquidity to cover at least 1 immediate SLA dispute.",
    },
    TIER_3_STAR_INDIE: {
      seal: "★★★ (3-Star Gold — Retail / Indie Lane)",
      requiredReserveUsdc: 25,
      formula: "max(25 USDC, 3x startingPriceUsdc, 20% of active monthly volume)",
      rule: "Guarantees liquidity to cover at least 3 full refunds and 20% of active volume.",
    },
    TIER_3_STAR_INSTITUTIONAL: {
      seal: "★★★ (3-Star Gold — Institutional B2B Lane)",
      requiredReserveUsdc: 200,
      formula: "max(200 USDC, 3x startingPriceUsdc, 20% of active monthly volume)",
      rule: "Enterprise solvency reserve required by Institutional B2B buyer FinOps Spend Passports.",
    },
  },
  withdrawalAndDowngradePolicy: {
    en: "Your reserve is ALWAYS your money. Whether held in your public reserve wallet or in VeritasRefundableReserveVault (withdrawReserve), you may withdraw 100% of your unlocked funds at any time without permission when you have no open claims (activeClaimsCount == 0). If your reserve drops below the 2-Star or 3-Star threshold during a slow sales period, your store simply adjusts automatically to 1-Star (per-job escrow protection remains active) and restores 3-Star Gold status as soon as you replenish your reserve.",
    es: "Tu reserva es SIEMPRE tu dinero. Ya sea en tu billetera pública de reserva o en VeritasRefundableReserveVault (withdrawReserve), puedes retirar el 100% de tus fondos disponibles en cualquier momento y sin pedir permiso cuando no tengas reclamos abiertos (activeClaimsCount == 0). Si tu reserva baja del umbral de 2★ o 3★ durante una temporada de pocas ventas, tu tienda simplemente pasa automáticamente a 1★ (la protección de escrow por trabajo sigue activa) y recupera las 3★ Oro apenas vuelvas a depositar tu reserva.",
    zh: "您的储备金始终属于您自己。无论是存放在您的公开储备钱包中，还是存放在 VeritasRefundableReserveVault（通过 withdrawReserve）中，只要没有未决索赔（activeClaimsCount == 0），您都可以随时无须许可提取 100% 的未锁定资金。如果在销售淡季您的储备金低于 2 星或 3 星门槛，您的店铺会自动调整为 1 星（单笔订单托管保护仍然有效），并在您补充储备金后立即恢复 3 星金牌状态。",
  },
  auditScopeAndLiability: {
    en: "VERITAS-8183 and TrustGate execute deterministic technical audits (static AST, solc 0.8.38 compilation, Vitter cryptographic sampling, L2 vector checks and live MCP probes). Verdicts and star seals are technical assessments at a point in time, not an unlimited financial insurance policy. Buyer refund protection is bounded by (a) 100% of the job funds locked in TrustGateEscrow8183 prior to settlement, and (b) the seller's verifiable available reserve in VeritasRefundableReserveVault.",
    es: "VERITAS-8183 y TrustGate ejecutan auditorías técnicas deterministas (AST estático, compilación solc 0.8.38, muestreo criptográfico Vitter, chequeo vectorial L2 y sondas MCP en vivo). Los veredictos y sellos de estrellas son dictámenes técnicos puntuales, no una póliza de seguro financiero ilimitado. La protección de reembolso al comprador está respaldada por (a) el 100% de los fondos del trabajo bloqueados en TrustGateEscrow8183 antes de la liquidación, y (b) la reserva disponible verificable del vendedor en VeritasRefundableReserveVault.",
    zh: "VERITAS-8183 与 TrustGate 执行确定性技术审计（静态 AST、solc 0.8.38 编译、Vitter 加密抽样、L2 向量检查与实时 MCP 探测）。审计结论与星级印章仅代表特定时间点的技术评估，而非无限额金融保险单。买家退款保障的范围以 (a) 结算前锁定在 TrustGateEscrow8183 中的 100% 订单资金，以及 (b) 卖家在 VeritasRefundableReserveVault 中可验证的可用储备金为限。",
  },
};

export function renderTermsMarkdown() {
  const t = ESCROW_AND_RESERVE_TERMS;
  return `# VERITAS / TrustGate — Escrow, Reserve Liquidity & Star Seal Terms · Términos de Escrow y Reserva · 托管与储备金条款 (v${t.version})

> ${LANGUAGE_PRECEDENCE.en}
>
> ${LANGUAGE_PRECEDENCE.es}
>
> ${LANGUAGE_PRECEDENCE.zh}

## 1. Two-Layer Smart Contract Architecture · Arquitectura de Dos Contratos
- **Per-Job Escrow (\`${t.contracts.perJobEscrow.name}\` — \`${t.contracts.perJobEscrow.deployedBaseMainnetAddress}\`, Sourcify \`#${t.contracts.perJobEscrow.sourcifyMatchId}\`)**: ${t.contracts.perJobEscrow.purpose}
- **Seller Refundable Reserve Vault (\`${t.contracts.sellerReserveVaultBlueprint.name}\` — \`${t.contracts.sellerReserveVaultBlueprint.sourcePath}\`, \`solc ${t.contracts.sellerReserveVaultBlueprint.compilerVersion}\`)**: ${t.contracts.sellerReserveVaultBlueprint.purpose}

## 2. Tiered Liquidity & Star Rating Rules · Reglas de Liquidez por Nivel de Estrellas
- **0★ Unclaimed (\`C · Unclaimed\`)**: ${t.tieredLiquidityRules.UNCLAIMED_0_STAR.rule}
- **1★ Verified Seller (\`0 USDC\` reserve)**: ${t.tieredLiquidityRules.TIER_1_STAR.rule}
- **2★ Certified SLA (\`${t.tieredLiquidityRules.TIER_2_STAR.formula}\`)**: ${t.tieredLiquidityRules.TIER_2_STAR.rule}
- **3★ Gold — Indie / Retail (\`${t.tieredLiquidityRules.TIER_3_STAR_INDIE.formula}\`)**: ${t.tieredLiquidityRules.TIER_3_STAR_INDIE.rule}
- **3★ Gold — Institutional B2B (\`${t.tieredLiquidityRules.TIER_3_STAR_INSTITUTIONAL.formula}\`)**: ${t.tieredLiquidityRules.TIER_3_STAR_INSTITUTIONAL.rule}

## 3. Free Seller Liquidity Withdrawal Policy · Política de Retiro Libre de Liquidez
**[EN]** ${t.withdrawalAndDowngradePolicy.en}

**[ES]** ${t.withdrawalAndDowngradePolicy.es}

**[中文]** ${t.withdrawalAndDowngradePolicy.zh}

_${LANGUAGE_PRECEDENCE.zh}_

## 4. Audit Scope & Liability · Alcance de Auditoría y Responsabilidad
**[EN]** ${t.auditScopeAndLiability.en}

**[ES]** ${t.auditScopeAndLiability.es}

**[中文]** ${t.auditScopeAndLiability.zh}
`;
}
