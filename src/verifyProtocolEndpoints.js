/**
 * Verificación de Descubrimiento de Protocolo M2M (ERC-8004 / x402 / OpenAPI / MCP):
 * Simula cómo un Agente Comprador externo valida el contrato verificado en Base Mainnet y opera vía MCP.
 */

import { AgenticEscrowLedger } from "./escrowContract.js";
import { handleMcpJsonRpc } from "./mcpServer.js";

async function main() {
  const ledger = new AgenticEscrowLedger();
  const baseUrl = "http://localhost:3402";

  console.log("==========================================================================");
  console.log(" VERIFICACION DE ENDPOINTS DE PROTOCOLO M2M (ERC-8004 / x402 / MCP)");
  console.log("==========================================================================\n");

  const agentCard = ledger.getAgentCardManifest(baseUrl);
  console.log("[1/4] Estándar ERC-8004 Agent Card (GET /.well-known/agent.json)");
  console.log(`      * Nombre del Agente      : ${agentCard.name}`);
  console.log(`      * Contrato Base Mainnet  : ${agentCard.identity.escrowVaultAddress}`);
  console.log(`      * Verificación Sourcify  : ${agentCard.identity.sourceCodeVerification.status} (Match #${agentCard.identity.sourceCodeVerification.matchId})`);
  console.log(`      * Pruebas On-Chain       : ${agentCard.identity.onChainAuditProofs.length} ciclos reales de Databento firmados\n`);

  const bazaar = ledger.getX402BazaarDescriptor(baseUrl);
  console.log("[2/4] Ficha Coinbase x402 Bazaar (GET /.well-known/x402-bazaar.json)");
  console.log(`      * Service ID             : ${bazaar.serviceId}`);
  console.log(`      * Latencia Media SLA     : ${bazaar.slaMetrics.medianAuditLatencyMs} ms`);
  console.log(`      * Monedas Aceptadas      : ${bazaar.pricing.acceptedTokens.join(", ")} -> ${bazaar.pricing.settlementCurrency}\n`);

  const openApi = ledger.getOpenApiSpec(baseUrl);
  console.log("[3/4] Especificación OpenAPI 3.1.0 para Frameworks IA (GET /openapi.json)");
  console.log(`      * Rutas M2M indexadas    : ${Object.keys(openApi.paths).join(", ")}\n`);

  const toolsListRes = handleMcpJsonRpc({ jsonrpc: "2.0", id: 1, method: "tools/list" }, ledger);
  const verifyRes = handleMcpJsonRpc(
    {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: { name: "verify_onchain_escrow_status", arguments: {} },
    },
    ledger
  );

  const structured = verifyRes.result.structuredContent;
  console.log("[4/4] Servidor MCP JSON-RPC 2.0 (POST /mcp & STDIO)");
  console.log(`      * Herramientas MCP listas: ${toolsListRes.result.tools.map((t) => t.name).join(", ")}`);
  console.log(`      * Chain ID               : ${structured.chainId} (${structured.chain})`);
  console.log(`      * Sourcify Repo          : ${structured.sourceCodeVerification.sourcifyRepoUrl}\n`);
}

main();
