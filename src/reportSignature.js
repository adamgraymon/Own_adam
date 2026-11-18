/**
 * Public-key (Ed25519) signing and verification for TrustGate MCP Trust Dossiers.
 *
 * Covers the final report content (server, checkedAt, trustScore, verdict, findingsCount, answers),
 * the order identifier (orderId), and the payment reference (paymentTxHash).
 * Any independent client can verify the signature with the public key (`publicKeyHex`) and detect
 * any alteration to the report, orderId, or paymentTxHash.
 */

import crypto from "node:crypto";

// RFC 8410 DER prefixes for raw 32-byte Ed25519 seed (PKCS#8) and raw 32-byte public key (SPKI)
const ED25519_PKCS8_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex");
const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

function deriveKeyPair(secretMaterial) {
  const source =
    secretMaterial ||
    process.env.REPORT_SIGNING_SEED_HEX ||
    process.env.EVALUATOR_PRIVATE_KEY ||
    "veritas-default-ed25519-seed";
  const seed32 = crypto.createHash("sha256").update(`VERITAS_ED25519_REPORT_SIGNER_V1|${source}`).digest();
  const privateKey = crypto.createPrivateKey({
    key: Buffer.concat([ED25519_PKCS8_PREFIX, seed32]),
    format: "der",
    type: "pkcs8",
  });
  const publicKey = crypto.createPublicKey(privateKey);
  const publicKeyHex = publicKey.export({ format: "der", type: "spki" }).subarray(12).toString('hex');
  return { privateKey, publicKey, publicKeyHex };
}

export function getTrustReportPublicKeyHex(secretMaterial) {
  return deriveKeyPair(secretMaterial).publicKeyHex;
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
  return Buffer.from(`MCP_TRUST_V1|${serverUrl}|${reportSha256}|${normOrder}|${normTx}`, "utf8");
}

/**
 * Computes and attaches `notarySeal` (including Ed25519 public key and signature) to a FULL report.
 * Covers the final report content, `report.orderId`, and `paymentTxHash`.
 */
export function sealFinalPaidTrustReport(report, { secretMaterial, signerAddress, paymentTxHash } = {}) {
  const effectiveTxHash = paymentTxHash !== undefined ? paymentTxHash : report?.notarySeal?.paymentTxHash ?? null;
  const effectiveSigner =
    signerAddress || report?.notarySeal?.signer || "0x861Ac49F8299C45Cca6bD9F0254080Fd82061Ac4";
  const serverUrl = report?.server?.url || "";
  const orderId = report?.orderId || "";
  const reportSha256 = computeTrustReportSha256(report);
  const { privateKey, publicKeyHex } = deriveKeyPair(secretMaterial);
  const message = buildCanonicalTrustSealMessage({
    serverUrl,
    reportSha256,
    orderId,
    paymentTxHash: effectiveTxHash,
  });
  const signatureEd25519Hex = crypto.sign(null, message, privateKey).toString("hex");
  const signatureHmacSha256 = crypto
    .createHmac("sha256", secretMaterial || "veritas")
    .update(message)
    .digest("hex");

  report.notarySeal = {
    reportSha256,
    algorithm: "Ed25519",
    publicKeyHex,
    signatureEd25519Hex,
    signatureHmacSha256,
    signer: effectiveSigner,
    paymentTxHash: effectiveTxHash,
  };
  return report;
}

/**
 * Verifies a full dossier's Ed25519 signature (`notarySeal`) against the final report,
 * `orderId`, and `paymentTxHash` using only public information.
 */
export function verifyTrustReportEd25519(report, expectedPublicKeyHex = null) {
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
    if (expectedPublicKeyHex && pubHex !== String(expectedPublicKeyHex).toLowerCase()) {
      return { valid: false, reason: "Report publicKeyHex does not match expected signer public key." };
    }
    const publicKey = crypto.createPublicKey({
      key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(pubHex, "hex")]),
      format: "der",
      type: "spki",
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
