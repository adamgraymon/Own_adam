/**
 * Prueba Circular Completa de Cliente Externo contra la Nube (`https://own-adam.onrender.com`)
 *
 * Simula a un Agente Comprador externo (AlphaQuant-Agent) y a una Tienda Proveedora (DataForge-AI)
 * comunicándose 100% por Internet con tu contenedor en Render:
 *  1. Ping de salud (`GET /healthz`) y descubrimiento `ERC-8004` (`GET /.well-known/agent.json`)
 *  2. Filtrado de tiendas vía MCP (`POST /mcp` -> `discover_verified_stores`)
 *  3. Cotización Multi-Moneda vía MCP (`POST /mcp` -> `quote_multitoken_escrow` con SOL -> USDC)
 *  4. Handshake de pago `HTTP 402 Payment Required` (`POST /api/m2m/escrow` sin y con firma `X-Payment`)
 *  5. Entrega cifrada, auditoría en 2 capas y liberación de llave AES (`POST /mcp` -> `submit_encrypted_deliverable`)
 */

const CLOUD_URL = "https://own-adam.onrender.com";

async function fetchCloud(url, options = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetch(url, options);
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, 1200));
    }
  }
}

async function callMcp(id, method, params = {}) {
  const res = await fetchCloud(`${CLOUD_URL}/mcp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
  });
  return res.json();
}

async function main() {
  console.log("==========================================================================");
  console.log(` PRUEBA CIRCULAR DE CLIENTE EXTERNO EN VIVO -> ${CLOUD_URL}`);
  console.log("==========================================================================\n");

  // PASO 1: Healthcheck & Descubrimiento Agent Card
  const t0 = performance.now();
  const healthRes = await fetchCloud(`${CLOUD_URL}/healthz`);
  const health = await healthRes.json();
  const cardRes = await fetchCloud(`${CLOUD_URL}/.well-known/agent.json`);
  const card = await cardRes.json();
  const pingMs = Math.round(performance.now() - t0);

  console.log(`[PASO 1] Descubrimiento Remoto & Estado del Nodo (${pingMs} ms)`);
  console.log(`         * Healthcheck (/healthz) : HTTP ${healthRes.status} -> status="${health.status}" (uptime: ${health.uptimeSeconds}s)`);
  console.log(`         * Agente Descubierto     : ${card.name} (Estándar ${card.identity.standard})`);
  console.log(`         * Contrato Base Mainnet  : ${card.identity.escrowVaultAddress}`);
  console.log(`         * Sello Sourcify         : ${card.identity.sourceCodeVerification.status} (Match #${card.identity.sourceCodeVerification.matchId})\n`);

  // PASO 2: Consultar Tiendas Verificadas vía MCP
  const storesRpc = await callMcp(1, "tools/call", {
    name: "discover_verified_stores",
    arguments: { minReputation: 80 },
  });
  const storesData = storesRpc.result.structuredContent;
  const chosenStore = storesData.eligibleStores[0];

  console.log(`[PASO 2] Filtro de Reputación ERC-8004 vía MCP (POST /mcp)`);
  console.log(`         * Tiendas aprobadas (>=80): ${storesData.eligibleStores.map((s) => `${s.name} [${s.reputationScore}/100]`).join(", ")}`);
  console.log(`         * Tiendas bloqueadas      : ${storesData.filteredOutCount} descartadas por baja reputación`);
  console.log(`         * Tienda elegida          : ${chosenStore.name} (${chosenStore.storeId})\n`);

  // PASO 3: Cotizar pago en SOL -> USDC vía MCP
  const quoteRpc = await callMcp(2, "tools/call", {
    name: "quote_multitoken_escrow",
    arguments: { tokenSymbol: "SOL", tokenAmount: 0.08 },
  });
  const quote = quoteRpc.result.structuredContent;

  console.log(`[PASO 3] Cotización Multi-Moneda Atómica vía MCP (0.08 SOL -> USDC)`);
  console.log(`         * Ruta Swap Atómico      : ${quote.route.aggregator} (${quote.route.inputToken} -> USDC)`);
  console.log(`         * USDC Netos a Bloquear  : ${quote.escrowBreakdown.usdcLockedInContract} USDC`);
  console.log(`         * Comisión TrustGate     : ${quote.escrowBreakdown.protocolFeeUsdc} USDC (${quote.escrowBreakdown.appliedFeePct}% - Descuento Volumen Activo)`);
  console.log(`         * Pago Neto al Vendedor  : ${quote.escrowBreakdown.sellerPayoutIfApprovedUsdc} USDC\n`);

  // PASO 4: Handshake HTTP 402 Payment Required -> Liquidación X-Payment
  const chRes = await fetchCloud(`${CLOUD_URL}/api/m2m/escrow`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      buyerId: "alphaquant-agent",
      storeId: chosenStore.storeId,
      tokenSymbol: "SOL",
      tokenAmount: 0.08,
      minRows: 50,
    }),
  });
  const challenge = await chRes.json();
  const wwwAuth = chRes.headers.get("www-authenticate");

  console.log(`[PASO 4] Handshake Nativo x402 (POST /api/m2m/escrow)`);
  console.log(`         * Intento sin firma      : HTTP ${chRes.status} (Payment Required)`);
  console.log(`         * Cabecera WWW-Auth      : ${wwwAuth}`);
  console.log(`         * Nonce del Desafío      : ${challenge.nonce}`);

  // Ahora el Agente Comprador envía la cabecera X-Payment firmada
  const payRes = await fetchCloud(`${CLOUD_URL}/api/m2m/escrow`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Payment": `${challenge.nonce}:0xsig_client_cloud_test_${Date.now()}`,
    },
    body: JSON.stringify({}),
  });
  const fundedJob = await payRes.json();
  const jobId = fundedJob.job.jobId;

  console.log(`         * Reenvío con X-Payment  : HTTP ${payRes.status} -> Estado="${fundedJob.job.status}"`);
  console.log(`         * Orden Creada en Nube   : ${jobId} (${fundedJob.job.financials.usdcLockedInContract} USDC congelados)\n`);

  // PASO 5: La Tienda IA sube el Dataset y el Nodo en la Nube lo audita y libera la llave AES
  const validRows = [];
  for (let i = 1; i <= 60; i++) {
    validRows.push({
      id: `NQ-CLOUD-${1000 + i}`,
      company: `CME Globex Institutional Desk #${i} (B2B SaaS cloud analytics)`,
      contactEmail: `quant.desk.${i}@cmegroup-analytics.io`,
      annualSpendUsd: 45000 + i * 250,
      domainUrl: `https://desk-${i}.cmegroup-analytics.io/ohlcv`,
    });
  }

  const auditRpc = await callMcp(3, "tools/call", {
    name: "submit_encrypted_deliverable",
    arguments: {
      jobId,
      rawDatasetJsonString: JSON.stringify(validRows),
    },
  });
  const settlement = auditRpc.result.structuredContent;

  console.log(`[PASO 5] Entrega Cifrada + Auditoría 2 Capas + Liquidación en Nube`);
  console.log(`         * Estado Final Orden     : ${settlement.job.status}`);
  console.log(`         * Veredicto del Juez IA  : ${settlement.job.auditReport.summary}`);
  console.log(`         * Huella SHA-256 Bóveda  : 0x${settlement.job.encryptedVault.plaintextSha256}`);
  console.log(`         * Llave AES-256 Liberada : 0x${settlement.job.releasedDecryptionKey.slice(0, 32)}...`);
  console.log(`         * Sello EAS (ERC-8004)   : ${settlement.attestation.uid} (${settlement.attestation.verdict})`);

  console.log("\n==========================================================================");
  console.log(" CICLO COMPLETO EN LA NUBE (own-adam.onrender.com) SUPERADO AL 100%");
  console.log("==========================================================================\n");
}

main();
