import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import {
  buildMcpTrustReport,
  EXTRA_CHECK_PRICE_USDC,
  FULL_DOSSIER_PRICE_USDC,
  parsePublicMcpUrl,
  probeMcpServerLive,
} from "./freeTrustCheck.js";
import { verifyOnChainBaseMainnetUsdcPayment } from "./premiumCatalogBroker.js";
import {
  readTrustPaymentOrder,
  readTrustPaymentReport,
  reserveTrustPaymentOrder,
  saveTrustPaymentReport,
} from "./trustOrderStore.js";

const inProgress = new Map();

function paymentError(status, reason, httpStatus) {
  return { ok: false, tool: "check_mcp_server_trust", httpStatus, status, reason };
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function fulfillOrder({ ledger, txHash, serverUrl, serverUrlHash, tokenHash }) {
  let order = await readTrustPaymentOrder(txHash);
  if (!order) {
    const pay = await verifyOnChainBaseMainnetUsdcPayment({
      paymentTxHash: txHash,
      requiredAmountUsdc: EXTRA_CHECK_PRICE_USDC,
    });
    if (pay.verified) {
      order = await reserveTrustPaymentOrder(txHash, {
        orderId: randomUUID(),
        serverUrlHash,
        tokenHash,
        mode: pay.verifiedUsdcPaid + 1e-6 >= FULL_DOSSIER_PRICE_USDC ? "FULL" : "FREE",
      });
    } else {
      // Another process may have reserved the payment during verification.
      order = await readTrustPaymentOrder(txHash);
      if (!order) return paymentError("PAYMENT_NOT_VERIFIED", pay.reason, 402);
    }
  }

  if (
    order.serverUrlHash !== serverUrlHash ||
    !/^[a-f0-9]{64}$/.test(order.tokenHash) ||
    !timingSafeEqual(Buffer.from(order.tokenHash, "hex"), Buffer.from(tokenHash, "hex"))
  ) {
    return paymentError("PAYMENT_ORDER_MISMATCH", "Use the server URL and private recovery token from the original paid request.", 409);
  }

  const savedReport = await readTrustPaymentReport(txHash);
  if (savedReport) return savedReport;

  const probe = await probeMcpServerLive(serverUrl);
  if (!probe.ok) {
    return {
      ...paymentError("PAID_CHECK_RETRYABLE", "The check did not complete. Retry with the same arguments and payment, without sending another transfer.", 503),
      orderId: order.orderId,
      stage: probe.stage,
    };
  }

  const report = buildMcpTrustReport({ ledger, probe, mode: order.mode, paymentTxHash: txHash, orderId: order.orderId });
  // Commit the result before replying. Retrying a lost response returns this exact report.
  return saveTrustPaymentReport(txHash, report);
}

export async function runPaidTrustCheck({ ledger, serverUrl, paymentTxHash, paymentRecoveryToken }) {
  const txHash = typeof paymentTxHash === "string" ? paymentTxHash.trim().toLowerCase() : "";
  if (!/^0x[a-f0-9]{64}$/.test(txHash)) {
    return paymentError("PAYMENT_NOT_VERIFIED", "Provide a valid Base transaction hash.", 402);
  }
  if (typeof paymentRecoveryToken !== "string" || !/^[a-f0-9]{64}$/i.test(paymentRecoveryToken)) {
    return paymentError("PAYMENT_RECOVERY_TOKEN_REQUIRED", "Provide a private random 32-byte token as 64 hex characters and retain it for retries.", 400);
  }

  // Syntax-only validation lets clients recover a saved report when its target is offline.
  const parsed = parsePublicMcpUrl(serverUrl);
  if (!parsed.ok) return { ...paymentError("INVALID_SERVER_URL", parsed.reason, 400), stage: "url_validation" };

  parsed.url.hash = "";
  const target = parsed.url.toString();
  const serverUrlHash = sha256(target);
  const tokenHash = sha256(Buffer.from(paymentRecoveryToken, "hex"));
  const key = `${txHash}:${serverUrlHash}:${tokenHash}`;
  const existing = inProgress.get(key);
  if (existing) return existing;

  const request = fulfillOrder({ ledger, txHash, serverUrl: target, serverUrlHash, tokenHash })
    .catch(() => paymentError("PAID_CHECK_TEMPORARILY_UNAVAILABLE", "The order could not be read or saved. Retry with the same arguments and payment.", 503))
    .finally(() => inProgress.delete(key));
  inProgress.set(key, request);
  return request;
}
