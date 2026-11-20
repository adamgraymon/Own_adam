import { buildMcpTrustReport, parsePublicMcpUrl, probeMcpServerLive, PUBLIC_BASE_URL } from "./freeTrustCheck.js";
import {
  GOLD_MONTHLY_LIMIT, readGoldCreditAccount, saveGoldCreditResult,
} from "./goldMonthlyCreditStore.js";
import { verifyGoldSellerEligibility } from "./goldSellerEligibility.js";
import { getTrustReportPublicKeyHex, sealFinalTrustReport } from "./reportSignature.js";

const inProgress = new Map();
const tool = "check_mcp_server_trust";
const mode = "GOLD_MONTHLY_CREDIT";
const storeIdPattern = /^[a-z0-9][a-z0-9_-]{0,95}$/;
const requestIdPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;

function failure(status, reason, httpStatus) {
  return { ok: false, tool, mode, status, reason, httpStatus };
}

function balance(account) {
  return {
    limit: GOLD_MONTHLY_LIMIT, used: account.used, remaining: GOLD_MONTHLY_LIMIT - account.used,
    month: account.month, resetsAt: account.resetsAt,
  };
}

function entitlementError(eligibility) {
  const httpStatus = eligibility.status === "GOLD_CREDIT_AUTH_REQUIRED" ? 401 : 403;
  return failure(eligibility.status, eligibility.reason, httpStatus);
}

function monthlyLimit(account) {
  return {
    ...failure("GOLD_CREDIT_MONTHLY_LIMIT", "The five monthly uses have been redeemed.", 429),
    balance: balance(account),
  };
}

function completed(account, authorization, seller, recovered) {
  const { requestId } = authorization;
  const record = account.saved;
  if (record?.walletAddress !== seller.walletAddress || record?.serverUrl !== seller.serverUrl ||
      record?.report?.server?.url !== seller.serverUrl || record?.report?.issuance?.type !== mode ||
      record.report.issuance.storeId !== authorization.storeId || record.report.issuance.requestId !== requestId) {
    return failure("GOLD_CREDIT_REQUEST_MISMATCH", "Use the original endpoint and wallet for this request ID.", 409);
  }
  return { ok: true, tool, mode, requestId, report: record.report, balance: balance(account), recovered };
}

function storageUnavailable() {
  return {
    ...failure("GOLD_CREDIT_STORAGE_UNAVAILABLE", "The balance or receipt could not be confirmed. Retry with the same request ID.", 503),
    retryable: true,
  };
}

async function issueDossier({ ledger, authorization, account, seller }) {
  if (!getTrustReportPublicKeyHex()) {
    return failure("REPORT_SIGNING_UNAVAILABLE", "The dedicated report signer is temporarily unavailable.", 503);
  }
  const { storeId, requestId } = authorization;
  const probe = await probeMcpServerLive(seller.serverUrl);
  if (!probe.ok) {
    return {
      ...failure("GOLD_CREDIT_CHECK_RETRYABLE", "The check did not complete. Retry with the same request ID.", 503),
      stage: probe.stage,
      retryable: true,
    };
  }

  const eligibility = await verifyGoldSellerEligibility({
    grantRaw: account.grantRaw, authorization, serverUrl: seller.serverUrl, audience: PUBLIC_BASE_URL,
  });
  if (!eligibility.ok) return entitlementError(eligibility);

  const report = buildMcpTrustReport({
    ledger, probe, mode: "FULL", issuance: { type: mode, priceUsdc: 0, storeId, requestId },
  });
  sealFinalTrustReport(report, { secretMaterial: ledger.evaluatorSecretKey });
  const saved = await saveGoldCreditResult({
    storeId, requestId, grantRaw: account.grantRaw,
    record: { walletAddress: seller.walletAddress, serverUrl: seller.serverUrl, report },
  });
  if (saved.status === "grant_changed") {
    return failure("GOLD_CREDIT_NOT_ELIGIBLE", "The Gold approval changed while checking this endpoint.", 403);
  }
  if (saved.status === "limit") return monthlyLimit(saved);
  return completed(saved, authorization, seller, saved.status === "recovered");
}

export async function runGoldMonthlyTrustCheck({ ledger, serverUrl, authorization }) {
  const { storeId, requestId, action } = authorization || {};
  if (!["balance", "redeem"].includes(action) ||
      typeof storeId !== "string" || !storeIdPattern.test(storeId) ||
      typeof requestId !== "string" || !requestIdPattern.test(requestId)) {
    return failure("GOLD_CREDIT_INVALID_REQUEST", "Provide a Gold action, an exact store ID and a lowercase UUID request ID.", 400);
  }

  const parsed = parsePublicMcpUrl(serverUrl);
  if (!parsed.ok) return failure("INVALID_SERVER_URL", parsed.reason, 400);
  parsed.url.hash = "";
  const target = parsed.url.toString();

  try {
    const account = await readGoldCreditAccount({ storeId, requestId: action === "redeem" ? requestId : undefined });
    const seller = await verifyGoldSellerEligibility({
      grantRaw: account.grantRaw, authorization, serverUrl: target, audience: PUBLIC_BASE_URL,
    });
    if (!seller.ok) return entitlementError(seller);
    if (action === "balance") return { ok: true, tool, mode, requestId, balance: balance(account) };
    if (account.saved) return completed(account, authorization, seller, true);
    if (account.used >= GOLD_MONTHLY_LIMIT) return monthlyLimit(account);

    const pending = inProgress.get(storeId);
    if (pending) {
      if (pending.requestId === requestId && pending.grantRaw === account.grantRaw) return pending.result;
      return {
        ...failure("GOLD_CREDIT_CHECK_IN_PROGRESS", "A different Gold request is in progress for this store.", 409),
        retryable: true,
      };
    }
    const result = issueDossier({ ledger, authorization, account, seller })
      .catch(storageUnavailable)
      .finally(() => inProgress.delete(storeId));
    inProgress.set(storeId, { requestId, grantRaw: account.grantRaw, result });
    return result;
  } catch {
    return storageUnavailable();
  }
}
