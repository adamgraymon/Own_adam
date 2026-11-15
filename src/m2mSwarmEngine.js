/**
 * Módulo 5: Enjambre Autónomo Máquina-a-Máquina (M2M Swarm Engine)
 * Cero clics humanos: Los Agentes Compradores descubren tiendas vía MCP + ERC-8004,
 * negocian desafíos HTTP 402, firman pagos criptográficos y las Tiendas IA entregan por API.
 */

import crypto from "node:crypto";
import { handleMcpJsonRpc } from "./mcpServer.js";
import { generateScenarioDataset } from "./scenarios.js";

const ORDER_AMOUNTS_BY_TOKEN = {
  SOL: [0.02, 0.025, 0.08, 0.0003], // ~3.60 USD, ~4.50 USD, ~14.40 USD (1% VIP!), y micropago bloqueado
  VIRTUAL: [0.5, 0.9, 5.0], // ~1.25 USD, ~2.25 USD, y ~12.50 USD (1% VIP!)
  ETH: [0.0004, 0.0008, 0.004], // ~1.28 USD, ~2.56 USD, y ~12.80 USD (1% VIP!)
};

function chooseStoreScenario(behaviorProfile, stepNumber) {
  switch (behaviorProfile) {
    case "honest":
      return "honest";
    case "mostly_honest":
      return stepNumber % 5 === 4 ? "lazy_clones" : "honest";
    case "sneaky_filler":
      // Intenta colar relleno sintético "Lorem ipsum" para burlar Capa 1 -> cae en Capa 2
      return "synthetic_filler";
    case "malicious":
      return stepNumber % 2 === 0 ? "prompt_injection" : "csv_malware";
    default:
      return "honest";
  }
}

/**
 * Ejecuta 1 ciclo completo de comercio autónomo M2M entre agentes usando MCP y x402.
 */
export function executeAutonomousM2MCycle(ledger, cycleIndex = 0) {
  const buyers = Object.values(ledger.buyerAgents);
  const buyer = buyers[cycleIndex % buyers.length];
  const token = buyer.preferredToken;

  // Auto-recarga de liquidez de simulación si un bot gasta su saldo en pruebas largas
  if ((buyer.balances[token] ?? 0) < 0.05) {
    buyer.balances[token] = token === "VIRTUAL" ? 300 : token === "SOL" ? 10 : 0.5;
  }

  // 1. El Bot Comprador consulta vía MCP el registro ERC-8004 filtrando por su umbral de confianza
  const discoveryRpc = handleMcpJsonRpc(
    {
      jsonrpc: "2.0",
      id: `disc-${cycleIndex}`,
      method: "tools/call",
      params: {
        name: "discover_verified_stores",
        arguments: {
          callerAgent: buyer.id,
          minReputation: buyer.minStoreReputation,
        },
      },
    },
    ledger
  );

  const discovery = discoveryRpc.result.structuredContent;
  const eligible = discovery.eligibleStores;
  if (!eligible || eligible.length === 0) {
    return { ok: false, reason: "Ninguna tienda supera el umbral ERC-8004 del agente." };
  }

  // El bot rota entre las tiendas elegibles (al inicio caen también las tramposas hasta que pierden reputación!)
  const chosenStore = eligible[cycleIndex % eligible.length];

  // Elegir monto (cada 7 ciclos un bot intenta colar un micropago de centavos y el Guardrail lo frena)
  const amounts = ORDER_AMOUNTS_BY_TOKEN[token];
  const amount =
    cycleIndex % 7 === 6 ? 0.0003 : amounts[cycleIndex % Math.min(amounts.length, 3)];
  const minRows = 1200 + (cycleIndex % 4) * 1200; // 1200 a 4800 filas

  // 2. Handshake x402 Paso 1: Solicitar desafío HTTP 402
  const chRes = ledger.issueX402Challenge({
    buyerId: buyer.id,
    storeId: chosenStore.storeId,
    tokenSymbol: token,
    tokenAmount: amount,
    minRows,
  });

  if (!chRes.ok) {
    return {
      ok: false,
      stage: "X402_GUARDRAIL_BLOCKED",
      buyerId: buyer.id,
      error: chRes.error,
    };
  }

  // 3. Handshake x402 Paso 2: El Bot Comprador firma criptográficamente el nonce (cabecera X-Payment)
  const agentSig =
    "0xsig_" +
    crypto
      .createHmac("sha256", buyer.address)
      .update(chRes.challenge.nonce)
      .digest("hex")
      .slice(0, 40);

  const fundedRes = ledger.settleX402ChallengeAndFund({
    nonce: chRes.challenge.nonce,
    paymentSignature: agentSig,
  });

  if (!fundedRes.ok) {
    return { ok: false, stage: "FUNDING_FAILED", error: fundedRes.error };
  }

  // 4. El Bot de la Tienda IA detecta el evento FUNDED_USDC y empuja el dataset por MCP
  const storeObj = ledger.stores[chosenStore.storeId];
  const scenario = chooseStoreScenario(storeObj.behaviorProfile, cycleIndex);
  const rawDatasetJsonString = generateScenarioDataset(scenario, minRows);

  const deliveryRpc = handleMcpJsonRpc(
    {
      jsonrpc: "2.0",
      id: `deliv-${cycleIndex}`,
      method: "tools/call",
      params: {
        name: "submit_encrypted_deliverable",
        arguments: {
          callerAgent: storeObj.id,
          jobId: fundedRes.job.jobId,
          rawDatasetJsonString,
        },
      },
    },
    ledger
  );

  const settlement = deliveryRpc.result.structuredContent;
  return {
    ok: true,
    cycleIndex,
    buyerId: buyer.id,
    storeId: storeObj.id,
    scenarioAttempted: scenario,
    jobStatus: settlement.job.status,
    verdictSummary: settlement.job.auditReport.summary,
    filteredOutStoresCount: discovery.filteredOutCount,
  };
}
