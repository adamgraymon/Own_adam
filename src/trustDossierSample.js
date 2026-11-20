import {
  buildMcpTrustReport,
  EXTRA_CHECK_PRICE_USDC,
  FULL_DOSSIER_PRICE_USDC,
  PUBLIC_BASE_URL,
} from "./freeTrustCheck.js";
import { getTrustReportPublicKeyHex, prepareTrustReportSeal } from "./reportSignature.js";
import { getLaunchDossierPromo } from "./launchDossierPromo.js";
import { GOLD_MONTHLY_LIMIT } from "./goldMonthlyCreditStore.js";
import { buildGoldCreditAuthorizationMessage } from "./goldSellerEligibility.js";

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
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
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
    {
      name: "lookup_supplier",
      description: "Look up a supplier record in the public inventory.",
      inputSchema: { type: "object", properties: { supplierId: { type: "string" } } },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
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
  prepareTrustReportSeal(example, {
    secretMaterial: ledger.evaluatorSecretKey,
    signerAddress: "0x" + "0".repeat(40),
    paymentTxHash: "0x" + "0".repeat(64),
  });

  Object.assign(example.notarySeal, {
    algorithm: "Ed25519",
    publicKeyHex: "0".repeat(64),
    signatureEd25519Hex: "0".repeat(128),
  });

  const promo = getLaunchDossierPromo();
  const standardPrice = { amount: FULL_DOSSIER_PRICE_USDC, currency: "USDC", network: "Base Mainnet", chainId: 8453 };
  const launchPromotion = promo && getTrustReportPublicKeyHex() ? {
    ...promo,
    description: "Get the complete signed dossier at 0 USDC within the promotional quota. Call with only serverUrl.",
    exampleCall: {
      method: "tools/call",
      params: { name: "check_mcp_server_trust", arguments: { serverUrl: "https://inventory.example/mcp" } },
    },
  } : null;
  const goldAuthorizationExample = {
    action: "redeem",
    storeId: "example-gold-store",
    requestId: "00000000-0000-4000-8000-000000000001",
    expiresAt: "2026-01-16T10:05:00.000Z",
  };

  return {
    ok: true,
    sample: true,
    description: "Fictional preview. The server, order, transaction and seal fields are illustrative. Viewing this sample is free.",
    price: launchPromotion ? { amount: launchPromotion.priceUsdc, currency: "USDC" } : standardPrice,
    ...(launchPromotion && { launchPromotion, standardPrice }),
    goldMonthlyCredit: {
      limit: GOLD_MONTHLY_LIMIT,
      period: "UTC calendar month",
      appliesTo: "Full signed dossier for the approved endpoint of a verified Gold store.",
      actions: {
        balance: "Check remaining uses and the UTC reset time.",
        redeem: "Use one credit for a new dossier. Retain the request ID to recover the same report.",
      },
      signatureScheme: "EIP-191",
      audience: PUBLIC_BASE_URL,
      exampleServerUrl: probe.serverUrl,
      exampleAuthorization: goldAuthorizationExample,
      exampleMessageToSign: buildGoldCreditAuthorizationMessage({
        ...goldAuthorizationExample, audience: PUBLIC_BASE_URL, serverUrl: probe.serverUrl,
      }),
      instructions: "Replace the fictional fields and sign with the approved store wallet. Use an expiry up to 10 minutes ahead. Pass serverUrl and goldCredit with the signed fields and signature. After expiry, sign again with the same request ID to recover a completed report.",
    },
    delivery: {
      mcpTool: "check_mcp_server_trust",
      resultPath: "result.structuredContent",
      contentType: "application/json",
    },
    mcpPaymentFlow: {
      network: "Base Mainnet",
      chainId: 8453,
      usdcTokenContract: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      usdcDecimals: 6,
      recipientWallet: "0x861Ac49F8299C45Cca6bD9F0254080Fd82061Ac4",
      fullDossierPriceUsdc: FULL_DOSSIER_PRICE_USDC,
      fullDossierAtomicUnits: "250000",
      extraCheckPriceUsdc: EXTRA_CHECK_PRICE_USDC,
      extraCheckAtomicUnits: "20000",
      steps: [
        "1. Generate a private random 32-byte token as 64 hex characters (paymentRecoveryToken) and keep it before sending your first paid request.",
        "2. Transfer 0.25 USDC (250000 atomic units of 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 on Base Mainnet, chainId 8453) to 0x861Ac49F8299C45Cca6bD9F0254080Fd82061Ac4 and record the confirmed 0x... transaction hash (paymentTxHash).",
        "3. Call MCP tool check_mcp_server_trust at https://own-adam.onrender.com/mcp with { serverUrl, paymentTxHash, paymentRecoveryToken }.",
        "4. If the network drops or the target server is temporarily unreachable (503 PAID_CHECK_RETRYABLE), call check_mcp_server_trust again with the exact same { serverUrl, paymentTxHash, paymentRecoveryToken } to recover or retry your paid report without sending another transfer.",
      ],
      exampleCall: {
        method: "tools/call",
        params: {
          name: "check_mcp_server_trust",
          arguments: {
            serverUrl: "https://inventory.example/mcp",
            paymentTxHash: "0x" + "a".repeat(64),
            paymentRecoveryToken: "b".repeat(64),
          },
        },
      },
    },
    example,
  };
}
