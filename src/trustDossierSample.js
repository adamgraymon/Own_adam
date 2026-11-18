import {
  buildMcpTrustReport,
  FULL_DOSSIER_PRICE_USDC,
  sealFinalPaidTrustReport,
} from "./freeTrustCheck.js";

export function getTrustDossierSample() {
  const ledger = { evaluatorSecretKey: "synthetic-trust-dossier-sample" };
  const tools = [
    {
      name: "lookup_item",
      description: "Look up an item in the public inventory.",
      inputSchema: {
        type: "object",
        properties: { sku: { type: "string" } },
        required: ["sku"],
      },
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
  ];
  const probe = {
    ok: true,
    checkedAt: "2026-01-15T10:00:00.000Z",
    serverUrl: "https://inventory.example/mcp",
    serverInfo: { name: "example-inventory", version: "1.0.0" },
    protocolVersion: "2025-06-18",
    initLatencyMs: 67,
    toolsListLatencyMs: 49,
    tools,
    secondToolsList: tools,
  };
  buildMcpTrustReport({ ledger, probe });

  // A second fixture illustrates both version drift and a metadata finding.
  const currentTools = [
    ...tools,
    { name: "lookup_supplier", annotations: { readOnlyHint: true, destructiveHint: false } },
  ];
  const example = buildMcpTrustReport({
    ledger,
    probe: {
      ...probe,
      checkedAt: "2026-01-16T10:00:00.000Z",
      serverInfo: { ...probe.serverInfo, version: "1.1.0" },
      tools: currentTools,
      secondToolsList: currentTools,
    },
    mode: "FULL",
    paymentTxHash: "0x" + "0".repeat(64),
    orderId: "00000000-0000-4000-8000-000000000000",
  });
  sealFinalPaidTrustReport(example, {
    secretMaterial: ledger.evaluatorSecretKey,
    signerAddress: "0x" + "0".repeat(40),
    paymentTxHash: "0x" + "0".repeat(64),
  });

  return {
    ok: true,
    sample: true,
    description: "Fictional preview. The server, order, transaction and HMAC seal are illustrative. Viewing this sample is free.",
    price: { amount: FULL_DOSSIER_PRICE_USDC, currency: "USDC", network: "Base Mainnet", chainId: 8453 },
    delivery: {
      mcpTool: "check_mcp_server_trust",
      resultPath: "result.structuredContent",
      contentType: "application/json",
    },
    example,
  };
}
