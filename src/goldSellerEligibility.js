import { getAddress, isAddress, verifyMessage } from "viem";
import { parsePublicMcpUrl } from "./freeTrustCheck.js";
import { executeUpstashCommand } from "./trustStore.js";

const MAX_AUTHORIZATION_MS = 10 * 60 * 1000;
const STORE_ID = /^[a-z0-9_-]+$/;
const REQUEST_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const ISO_TIMESTAMP = /^(\d{4}-\d{2}-\d{2})T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/;

const NOT_ELIGIBLE = Object.freeze({
  ok: false,
  status: "GOLD_CREDIT_NOT_ELIGIBLE",
  reason: "Gold credit requires a current verified grant for an active public seller, wallet and endpoint.",
});
const AUTH_REQUIRED = Object.freeze({
  ok: false,
  status: "GOLD_CREDIT_AUTH_REQUIRED",
  reason: "Sign a current Gold-credit authorization with the registered seller wallet.",
});

function canonicalPublicUrl(value) {
  if (typeof value !== "string") return null;
  const parsed = parsePublicMcpUrl(value);
  if (!parsed.ok || parsed.url.hash) return null;
  const { url } = parsed;
  if (url.hostname.endsWith(".")) {
    url.hostname = url.hostname.slice(0, -1);
    if (!parsePublicMcpUrl(url.href).ok) return null;
  }
  const host = url.hostname;
  if (host.startsWith("[")) {
    if (!/^\[[23][0-9a-f]{3}:/i.test(host)) return null;
  } else if (!host.includes(".") || host.endsWith(".localhost")) {
    return null;
  }
  url.hash = "";
  return url.href;
}

function parseTimestamp(value) {
  const parts = typeof value === "string" && ISO_TIMESTAMP.exec(value);
  if (!parts) return NaN;
  const date = Date.parse(`${parts[1]}T00:00:00Z`);
  if (!Number.isFinite(date) || new Date(date).toISOString().slice(0, 10) !== parts[1]) return NaN;
  return Date.parse(value);
}

function jsonObject(raw) {
  if (typeof raw !== "string") return null;
  try {
    const value = JSON.parse(raw);
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

function canonicalWalletAddress(value) {
  return typeof value === "string" && isAddress(value, { strict: false }) ? getAddress(value.toLowerCase()) : null;
}

export function buildGoldCreditAuthorizationMessage({ audience, action, storeId, requestId, serverUrl, expiresAt }) {
  const service = canonicalPublicUrl(audience);
  const endpoint = canonicalPublicUrl(serverUrl);
  const expiry = parseTimestamp(expiresAt);
  if (!service || !endpoint || !Number.isFinite(expiry) || (action !== "balance" && action !== "redeem") ||
      typeof storeId !== "string" || !STORE_ID.test(storeId) || typeof requestId !== "string" || !REQUEST_ID.test(requestId)) {
    throw new TypeError("Invalid Gold-credit authorization fields");
  }
  return "TrustGate Gold credit authorization v1\n" + JSON.stringify({
    audience: service,
    action,
    storeId,
    requestId,
    serverUrl: endpoint,
    expiresAt: new Date(expiry).toISOString(),
  });
}

export async function verifyGoldSellerEligibility({ grantRaw, authorization, serverUrl, audience, now = Date.now() }) {
  const { action, storeId, requestId, expiresAt, signature } = authorization ?? {};
  const authExpiry = parseTimestamp(expiresAt);
  if (!(authExpiry > now && authExpiry - now <= MAX_AUTHORIZATION_MS) ||
      typeof signature !== "string" || !/^0x[0-9a-fA-F]{130}$/.test(signature)) {
    return AUTH_REQUIRED;
  }

  const endpoint = canonicalPublicUrl(serverUrl);
  if (!endpoint) return NOT_ELIGIBLE;

  let message;
  try {
    message = buildGoldCreditAuthorizationMessage({ audience, action, storeId, requestId, serverUrl: endpoint, expiresAt });
  } catch {
    return AUTH_REQUIRED;
  }

  const grant = jsonObject(grantRaw);
  const walletAddress = canonicalWalletAddress(grant?.walletAddress);
  if (grant?.starLevel !== 3 || grant.storeId !== storeId || !walletAddress ||
      canonicalPublicUrl(grant.serverUrl) !== endpoint ||
      !(parseTimestamp(grant.verifiedAt) <= now && parseTimestamp(grant.expiresAt) > now)) {
    return NOT_ELIGIBLE;
  }

  try {
    if (!await verifyMessage({ address: walletAddress, message, signature })) return AUTH_REQUIRED;
  } catch {
    return AUTH_REQUIRED;
  }

  const registryKey = process.env.SELLER_REGISTRY_REDIS_KEY || "veritas:seller-registry:v1";
  const seller = jsonObject(await executeUpstashCommand(["HGET", registryKey, storeId]));
  if (seller?.id !== storeId || seller.withdrawn || seller.isDemo || seller.publicRegistryConsent?.accepted !== true ||
      canonicalWalletAddress(seller.address) !== walletAddress || canonicalPublicUrl(seller.endpoint) !== endpoint) {
    return NOT_ELIGIBLE;
  }

  return { ok: true, walletAddress, serverUrl: endpoint };
}
