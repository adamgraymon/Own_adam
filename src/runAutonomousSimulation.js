/**
 * Ejecutor CLI 100% Headless (Sin navegador):
 * Corre 12 ciclos autónomos entre Agentes Compradores y Tiendas IA usando MCP + x402 + ERC-8004.
 */

import { AgenticEscrowLedger } from "./escrowContract.js";
import { executeAutonomousM2MCycle } from "./m2mSwarmEngine.js";

const ledger = new AgenticEscrowLedger();
const TOTAL_CYCLES = 12;

console.log("==========================================================================");
console.log(" INICIANDO TRÁFICO AUTÓNOMO M2M (MCP JSON-RPC + x402 + ERC-8183 + ERC-8004)");
console.log(" Cero intervención humana — Los agentes negocian, auditan y liquidan solos.");
console.log("==========================================================================\n");

for (let i = 0; i < TOTAL_CYCLES; i++) {
  const res = executeAutonomousM2MCycle(ledger, i);
  if (!res.ok) {
    console.log(
      `[Ciclo #${i + 1}] ${res.buyerId || "Bot"} -> BLOQUEADO POR GUARDRAIL: ${res.error}`
    );
  } else {
    console.log(
      `[Ciclo #${i + 1}] ${res.buyerId} -> ${res.storeId} (${res.scenarioAttempted}) => ${res.jobStatus} | Tiendas vetadas por ERC-8004: ${res.filteredOutStoresCount}`
    );
  }
}

const snap = ledger.getStateSnapshot();
const stats = snap.wallets.protocol_treasury.stats;

console.log("\n--- SELECCIÓN NATURAL ERC-8004 (Estado final de Tiendas IA) ---");
for (const s of snap.stores) {
  const statusTag = s.reputationScore >= 70 ? "ACTIVA EN RED" : "EXILIADA POR BOTS (<70)";
  console.log(
    ` * ${s.name.padEnd(34)} | Rep: ${String(s.reputationScore).padStart(3)}/100 | Saldo: ${s.usdcBalance.toFixed(2)} USDC | [${statusTag}]`
  );
}

console.log("\n--- TU TESORERÍA PASIVA (NODO INTERVENTOR) ---");
console.log(` * Llamadas MCP procesadas : ${stats.mcpCallsHandled}`);
console.log(` * Handshakes x402         : ${stats.x402Handshakes}`);
console.log(` * Ataques neutralizados   : ${stats.attacksBlocked}`);
console.log(` * Comisiones Brutas       : +${stats.grossFeesEarnedUsdc.toFixed(4)} USDC`);
console.log(` * Costo Gas + IA Muestreo : -${(stats.totalGasSpentUsdc + stats.totalAiTokensSpentUsdc).toFixed(4)} USDC`);
console.log(` * GANANCIA NETA ACUMULADA : +${stats.netProfitUsdc.toFixed(4)} USDC\n`);
