import { createHash, randomUUID } from "node:crypto";
import { x402ResourceServer } from "@x402/core/server";
import {
  decodePaymentSignatureHeader,
  encodePaymentRequiredHeader,
  encodePaymentResponseHeader,
} from "@x402/core/http";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { bazaarResourceServerExtension, declareDiscoveryExtension } from "@x402/extensions/bazaar";
import { parseUnits } from "viem";
import {
  buildMcpTrustReport,
  FULL_DOSSIER_PRICE_USDC,
  FULL_DOSSIER_SAMPLE,
  parsePublicMcpUrl,
  probeMcpServerLive,
  sealFinalPaidTrustReport,
} from "./freeTrustCheck.js";
import { getTrustDossierSample } from "./trustDossierSample.js";
import { createTrustOrderLocalStore } from "./trustOrderStore.js";
import { createX402CdpFacilitator } from "./x402CdpFacilitator.js";
import {
  createX402SandboxFacilitator,
  X402_SANDBOX_ASSET,
  X402_SANDBOX_NETWORK,
  X402_SANDBOX_RECIPIENT,
  X402_SANDBOX_TOKEN_NAME,
  X402_SANDBOX_TOKEN_VERSION,
} from "./x402SandboxFacilitator.js";

export const X402_TRUST_DOSSIER_PATH = "/api/trust/dossier";
export const X402_BAZAAR_DISCOVERY_PATH = "/discovery/resources";

const exampleToken = "0".repeat(64);
const serviceName = "TrustGate MCP Trust Dossier";
const description = "Seven-question JSON report for a public MCP server, covering permissions, tools, metadata risks, tool-list consistency and changes.";

function digest(value) {
  return "0x" + createHash("sha256").update(value).digest("hex");
}

function reply(status, body, headers) {
  return { status, body, headers: { "Cache-Control": "private, no-store", ...headers } };
}

function failure(status, code, reason, headers) {
  return reply(status, { ok: false, status: code, reason }, headers);
}

function mismatch() {
  return failure(409, "ORDER_MISMATCH", "Use the original target, recovery token, and payment authorization.");
}

function delivered({ report, receipt }) {
  return reply(200, report, { "PAYMENT-RESPONSE": encodePaymentResponseHeader(receipt) });
}

export function createX402TrustCheckout({ cdp, reportLedger } = {}) {
  const environment = cdp ? "x402-cdp-sepolia" : "x402-sandbox";
  const store = createTrustOrderLocalStore(environment);
  const facilitator = cdp ? createX402CdpFacilitator(store, cdp) : createX402SandboxFacilitator(store);
  const recipient = cdp ? cdp.recipient : X402_SANDBOX_RECIPIENT;
  const resourceServer = new x402ResourceServer(facilitator)
    .register(X402_SANDBOX_NETWORK, new ExactEvmScheme())
    .registerExtension(bazaarResourceServerExtension);
  const ledger = cdp ? reportLedger : { evaluatorSecretKey: "trustgate-x402-sandbox-only" };
  // x402 clients echo this example in a request header. Keep the full preview on /trust/sample.json.
  const { example: { answers, badge, disclaimer, methodology, ...reportFields } } = getTrustDossierSample();
  const example = {
    ...reportFields,
    answers: Object.fromEntries(
      Object.entries(answers).map(([key, { question, note, limitation, alert, ...fields }]) => [key, fields]),
    ),
  };
  const discovery = declareDiscoveryExtension({
    method: "POST",
    bodyType: "json",
    input: { serverUrl: example.server.url, paymentRecoveryToken: exampleToken },
    inputSchema: {
      type: "object",
      properties: {
        serverUrl: { type: "string", pattern: "^https://", description: "Public HTTPS URL of the MCP server to evaluate." },
        paymentRecoveryToken: {
          type: "string",
          pattern: "^[a-fA-F0-9]{64}$",
          description: "Private random 32-byte value in hex, unique to this order. The all-zero example is a placeholder. Recovery uses the same value and target.",
        },
      },
      required: ["serverUrl", "paymentRecoveryToken"],
    },
    output: {
      example,
      schema: {
        type: "object",
        properties: {
          ok: { const: true },
          mode: { const: "FULL" },
          server: { type: "object" },
          checkedAt: { type: "string" },
          trustScore: { type: "number", minimum: 0, maximum: 100 },
          verdict: { type: "string" },
          findingsCount: { type: "object" },
          answers: { type: "object", required: Object.keys(example.answers) },
          notarySeal: { type: "object" },
          orderId: { type: "string" },
        },
        required: ["ok", "mode", "server", "checkedAt", "trustScore", "verdict", "findingsCount", "answers", "notarySeal", "orderId"],
      },
    },
  });
  let requirementsPromise;

  async function buildRequirements() {
    await resourceServer.initialize();
    return resourceServer.buildPaymentRequirements({
      scheme: "exact",
      network: X402_SANDBOX_NETWORK,
      payTo: recipient,
      price: {
        amount: parseUnits(String(FULL_DOSSIER_PRICE_USDC), 6).toString(),
        asset: X402_SANDBOX_ASSET,
        extra: { name: X402_SANDBOX_TOKEN_NAME, version: X402_SANDBOX_TOKEN_VERSION },
      },
      maxTimeoutSeconds: 120,
      extra: { assetTransferMethod: "eip3009", paymentFlow: "authorization" },
    });
  }

  async function getPaymentTerms(resourceUrl, error) {
    requirementsPromise ??= buildRequirements().catch(error => {
      requirementsPromise = undefined;
      throw error;
    });
    const accepts = await requirementsPromise;
    return resourceServer.createPaymentRequiredResponse(accepts, {
      url: resourceUrl,
      description: description + (cdp ? " Local checkout on Base Sepolia testnet." : " Local sandbox with simulated settlement."),
      mimeType: "application/json",
      serviceName,
      tags: ["mcp", "security", "audit"],
    }, error, discovery);
  }

  async function listResources(resourceUrl) {
    const { x402Version, accepts, extensions, resource } = await getPaymentTerms(resourceUrl);
    return withEnvironment(reply(200, {
      x402Version,
      simulated: !cdp,
      items: [{
        resource: resource.url,
        description: resource.description,
        serviceName: resource.serviceName,
        tags: resource.tags,
        type: "http",
        x402Version,
        accepts,
        extensions,
        sampleUrl: new URL(FULL_DOSSIER_SAMPLE.path, resourceUrl).href,
      }],
      pagination: { limit: 1, offset: 0, total: 1 },
    }));
  }

  function withEnvironment(result) {
    result.headers["X-TrustGate-Environment"] = environment;
    return result;
  }

  async function finalize(orderKey, order, draft, receipt) {
    if (
      !receipt.success || receipt.network !== X402_SANDBOX_NETWORK ||
      receipt.payer?.toLowerCase() !== order.payer ||
      !/^0x[a-f0-9]{64}$/.test(receipt.transaction)
    ) {
      throw new Error("Invalid Base Sepolia settlement receipt");
    }
    const finalReport = structuredClone(draft);
    sealFinalPaidTrustReport(finalReport, {
      secretMaterial: ledger?.evaluatorSecretKey,
      signerAddress: draft.notarySeal?.signer,
      paymentTxHash: receipt.transaction,
    });
    return delivered(await store.insert("report", orderKey, {
      report: finalReport,
      receipt,
    }));
  }

  async function fulfill({ body, paymentSignature, resourceUrl }) {
    async function paymentRequired(reason) {
      const challenge = await getPaymentTerms(resourceUrl, reason);
      return failure(402, "PAYMENT_REQUIRED", reason, {
        "PAYMENT-REQUIRED": encodePaymentRequiredHeader(challenge),
      });
    }

    const { serverUrl, paymentRecoveryToken } = body ?? {};
    if (typeof serverUrl !== "string" || typeof paymentRecoveryToken !== "string" ||
        !/^[a-f0-9]{64}$/i.test(paymentRecoveryToken) || paymentRecoveryToken === exampleToken) {
      const reason = "A public serverUrl and a private, random 32-byte paymentRecoveryToken are required.";
      // Discovery crawlers can request the empty body or the catalog example.
      if (!paymentSignature) return paymentRequired(reason);
      return failure(400, "INVALID_ORDER_INPUT", reason);
    }
    const parsed = parsePublicMcpUrl(serverUrl);
    if (!parsed.ok) return failure(400, "INVALID_SERVER_URL", parsed.reason);
    parsed.url.hash = "";
    const target = parsed.url.toString();
    const targetHash = digest(target);
    const orderKey = digest(Buffer.from(paymentRecoveryToken, "hex"));
    let order = await store.read("order", orderKey);
    let draft;
    if (order) {
      if (order.targetHash !== targetHash) return mismatch();
      const saved = await store.read("report", orderKey);
      if (saved) return delivered(saved);
      draft = await store.read("draft", orderKey);
      // A settlement may have been recorded just before a restart or failed response.
      const settled = draft && await facilitator.getSettlement(order.authorizationId);
      if (settled) return finalize(orderKey, order, draft, settled);
      if (!paymentSignature) {
        return failure(409, "ORDER_PENDING", "Retry with the original PAYMENT-SIGNATURE and recovery token.");
      }
    }

    if (!paymentSignature) return paymentRequired("Authorize the Base Sepolia checkout to receive the full dossier.");

    let payment;
    try {
      payment = decodePaymentSignatureHeader(paymentSignature);
    } catch {
      return failure(400, "INVALID_PAYMENT_SIGNATURE", "Send an x402 v2 PAYMENT-SIGNATURE header.");
    }
    if (payment?.x402Version !== 2 || (payment.resource && payment.resource.url !== resourceUrl)) {
      return failure(400, "INVALID_PAYMENT_SIGNATURE", "Use x402 v2 and match this resource when supplying a resource URL.");
    }
    const terms = await getPaymentTerms(resourceUrl);
    if (!resourceServer.validateExtensions(terms, payment).valid) {
      return failure(400, "INVALID_DISCOVERY_EXTENSION", "Use the original Bazaar declaration from PAYMENT-REQUIRED.");
    }
    const requirement = resourceServer.findMatchingRequirements(terms.accepts, payment);
    const authorizationId = requirement && facilitator.getAuthorizationId(payment, requirement);
    if (!authorizationId) return paymentRequired("The payment does not match the advertised terms.");
    const proofHash = digest(paymentSignature);

    if (!order) {
      const verified = await resourceServer.verifyPayment(payment, requirement);
      if (!verified.isValid) return paymentRequired("The payment authorization did not verify.");
      order = await store.insert("order", orderKey, {
        targetHash,
        authorizationId,
        proofHash,
        payer: verified.payer.toLowerCase(),
        orderId: randomUUID(),
      });
    }
    if (order.targetHash !== targetHash || order.authorizationId !== authorizationId || order.proofHash !== proofHash) {
      return mismatch();
    }
    const reserved = await store.insert("authorization", authorizationId, { orderKey });
    if (reserved.orderKey !== orderKey) return mismatch();

    const saved = await store.read("report", orderKey);
    if (saved) return delivered(saved);
    draft ??= await store.read("draft", orderKey);
    if (!draft) {
      const probe = await probeMcpServerLive(target);
      if (!probe.ok) {
        return failure(503, "CHECK_RETRYABLE", "The check did not complete. Retry with the original PAYMENT-SIGNATURE and recovery token.");
      }
      const report = buildMcpTrustReport({ ledger, probe, mode: "FULL", orderId: order.orderId });
      if (!cdp) {
        sealFinalPaidTrustReport(report, {
          secretMaterial: ledger?.evaluatorSecretKey,
          signerAddress: X402_SANDBOX_RECIPIENT,
          paymentTxHash: null,
        });
      }
      draft = await store.insert("draft", orderKey, report);
    }

    const receipt = await resourceServer.settlePayment(payment, requirement);
    if (!receipt.success) {
      if (receipt.errorReason === "authorization_expired") {
        return failure(409, "ORDER_AUTHORIZATION_EXPIRED", "The authorization expired without a confirmed charge.", {
          "PAYMENT-RESPONSE": encodePaymentResponseHeader(receipt),
        });
      }
      return failure(503, "SETTLEMENT_INCOMPLETE", "Retry with the original PAYMENT-SIGNATURE and recovery token.", {
        "PAYMENT-RESPONSE": encodePaymentResponseHeader(receipt),
      });
    }
    return finalize(orderKey, order, draft, receipt);
  }

  return {
    async listResources(resourceUrl) {
      try {
        return await listResources(resourceUrl);
      } catch {
        return withEnvironment(failure(503, "CHECKOUT_UNAVAILABLE", "Payment terms are temporarily unavailable."));
      }
    },
    async purchase(request) {
      try {
        return withEnvironment(await fulfill(request));
      } catch {
        return withEnvironment(failure(503, "CHECKOUT_UNAVAILABLE", "The order could not be completed. Retry with the same credentials."));
      }
    },
  };
}
