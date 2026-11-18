/**
 * Public-key (Ed25519) signing and verification for TrustGate MCP Trust Dossiers.
 *
 * Covers the final report content (server, checkedAt, trustScore, verdict, findingsCount, answers),
 * the order identifier (orderId), and the payment reference (paymentTxHash).
 * Any independent client can verify the signature with the public key (`publicKeyHex`) and detect
 * any alteration to the report, orderId, or paymentTxHash.
 */

import crypto from "node:crypto";
import { readFileSync } from "node:fs";

export const TRUST_REPORT_SIGNATURE_FORMAT = "MCP_TRUST_V1";
let cachedSigner;

function loadSigner() {
  const filename = process.env.TRUST_REPORT_SIGNING_KEY_FILE?.trim();
  if (!filename) return null;
  if (cachedSigner?.filename === filename) return cachedSigner;

  let privateKey;
  try {
    privateKey = crypto.createPrivateKey({ key: readFileSync(filename), format: "pem" });
    if (privateKey.asymmetricKeyType !== "ed25519") throw new Error("Unexpected key type.");
  } catch {
    throw new Error("TRUST_REPORT_SIGNING_KEY_FILE must point to a readable Ed25519 private PEM.");
  }
  const { x } = crypto.createPublicKey(privateKey).export({ format: "jwk" });
  const publicKeyHex = Buffer.from(x, "base64url").toString("hex");
  cachedSigner = { filename, privateKey, publicKeyHex };
  return cachedSigner;
}

export function getTrustReportPublicKeyHex() {
  return loadSigner()?.publicKeyHex ?? null;
}

export function getTrustReportSigningMetadata() {
  const publicKeyHex = getTrustReportPublicKeyHex();
  return publicKeyHex ? {
    reportSigning: { algorithm: "Ed25519", publicKeyHex, format: TRUST_REPORT_SIGNATURE_FORMAT },
  } : {};
}

export function computeTrustReportSha256(report) {
  const payload = {
    server: report?.server ?? null,
    checkedAt: report?.checkedAt ?? null,
    trustScore: report?.trustScore ?? null,
    verdict: report?.verdict ?? null,
    findingsCount: report?.findingsCount ?? null,
    answers: report?.answers ?? null,
  };
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function buildCanonicalTrustSealMessage({ serverUrl, reportSha256, orderId = "", paymentTxHash = "" }) {
  const normTx = String(paymentTxHash || "").toLowerCase();
  const normOrder = String(orderId || "");
  return Buffer.from(`${TRUST_REPORT_SIGNATURE_FORMAT}|${serverUrl}|${reportSha256}|${normOrder}|${normTx}`, "utf8");
}

function attachTrustReportSeal(report, { secretMaterial, signerAddress, paymentTxHash } = {}, signer) {
  const effectiveTxHash = paymentTxHash !== undefined ? paymentTxHash : report?.notarySeal?.paymentTxHash ?? null;
  const effectiveSigner =
    signerAddress || report?.notarySeal?.signer || "0x861Ac49F8299C45Cca6bD9F0254080Fd82061Ac4";
  const serverUrl = report?.server?.url || "";
  const orderId = report?.orderId || "";
  const reportSha256 = computeTrustReportSha256(report);
  const message = buildCanonicalTrustSealMessage({
    serverUrl,
    reportSha256,
    orderId,
    paymentTxHash: effectiveTxHash,
  });
  const signatureHmacSha256 = crypto
    .createHmac("sha256", secretMaterial || "veritas")
    .update(message)
    .digest("hex");

  report.notarySeal = {
    reportSha256,
    ...(signer && {
      algorithm: "Ed25519",
      publicKeyHex: signer.publicKeyHex,
      signatureEd25519Hex: crypto.sign(null, message, signer.privateKey).toString("hex"),
    }),
    signatureHmacSha256,
    signer: effectiveSigner,
    paymentTxHash: effectiveTxHash,
  };
  return report;
}

export function prepareTrustReportSeal(report, options) {
  return attachTrustReportSeal(report, options);
}

export function sealFinalPaidTrustReport(report, options) {
  const signer = loadSigner();
  if (!signer) throw new Error("Dedicated TrustGate report signing key is not configured.");
  return attachTrustReportSeal(report, options, signer);
}

/**
 * Verifies the signature using the public key obtained from the trusted service.
 */
export function verifyTrustReportEd25519(report, expectedPublicKeyHex) {
  const expectedKey = String(expectedPublicKeyHex || "").toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(expectedKey)) {
    return { valid: false, reason: "Expected Ed25519 public key is required." };
  }
  try {
    const seal = report?.notarySeal;
    const serverUrl = report?.server?.url;
    if (!seal || !serverUrl || !report?.answers || !report?.checkedAt) {
      return { valid: false, reason: "Missing required report or notarySeal fields." };
    }
    const recomputedHash = computeTrustReportSha256(report);
    if (recomputedHash !== seal.reportSha256) {
      return { valid: false, reason: "Report content does not match notarySeal.reportSha256." };
    }
    const pubHex = String(seal.publicKeyHex || "").toLowerCase();
    const sigHex = String(seal.signatureEd25519Hex || "").toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(pubHex) || !/^[0-9a-f]{128}$/.test(sigHex)) {
      return { valid: false, reason: "Invalid Ed25519 public key or signature format." };
    }
    if (pubHex !== expectedKey) {
      return { valid: false, reason: "Report publicKeyHex does not match expected signer public key." };
    }
    const publicKey = crypto.createPublicKey({
      key: { kty: "OKP", crv: "Ed25519", x: Buffer.from(expectedKey, "hex").toString("base64url") },
      format: "jwk",
    });
    const message = buildCanonicalTrustSealMessage({
      serverUrl,
      reportSha256: seal.reportSha256,
      orderId: report?.orderId || "",
      paymentTxHash: seal.paymentTxHash || "",
    });
    const ok = crypto.verify(null, message, publicKey, Buffer.from(sigHex, "hex"));
    return ok
      ? { valid: true, publicKeyHex: pubHex, reportSha256: recomputedHash }
      : { valid: false, reason: "Ed25519 signature verification failed." };
  } catch (err) {
    return { valid: false, reason: err.message };
  }
}
