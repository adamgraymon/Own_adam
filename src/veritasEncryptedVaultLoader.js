/**
 * Cargador Criptográfico AES-256-GCM vinculado a la Identidad On-Chain (Base Mainnet + LEGION Ed25519)
 * Protege las bases de datos de inteligencia del Radar, el directorio de Compradores/2★-3★ y las firmas
 * heurísticas de los 8 auditores contra extracción estática por descarga de ZIP o raspado de repositorio.
 */

import crypto from "node:crypto";

const BOUND_ESCROW_CONTRACT = "0xd4f77bf843b3c359b233aca46d7ff6604cbd0a5e";
const BOUND_NOTARY_WALLET = "0x861ac49f8299c45cca6bd9f0254080fd82061ac4";
const BOUND_LEGION_PASSPORT = "lp0_a1990fc66ed863c9179d571a9db8a28d";

export function deriveVeritasVaultKey(vaultDomain) {
  return crypto
    .createHash("sha256")
    .update(
      `VERITAS_8183_SEALED_VAULT|${vaultDomain}|${BOUND_ESCROW_CONTRACT}|${BOUND_NOTARY_WALLET}|${BOUND_LEGION_PASSPORT}`
    )
    .digest();
}

export function sealVeritasVaultPayload(vaultDomain, plainObject) {
  const key = deriveVeritasVaultKey(vaultDomain);
  const iv = crypto
    .createHash("sha256")
    .update(`IV|${vaultDomain}|${BOUND_ESCROW_CONTRACT}`)
    .digest()
    .subarray(0, 12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const aad = Buffer.from(
    `${vaultDomain}:${BOUND_ESCROW_CONTRACT}:${BOUND_NOTARY_WALLET}`,
    "utf8"
  );
  cipher.setAAD(aad);
  const rawJson = JSON.stringify(plainObject);
  const encrypted = Buffer.concat([cipher.update(rawJson, "utf8"), cipher.final()]);
  return {
    encryptionStandard: "AES-256-GCM-VERITAS-8183-CONTRACT-BOUND",
    vaultDomain,
    boundEscrowContract: BOUND_ESCROW_CONTRACT,
    boundNotarySigner: BOUND_NOTARY_WALLET,
    boundLegionPassportId: BOUND_LEGION_PASSPORT,
    ivHex: iv.toString("hex"),
    authTagHex: cipher.getAuthTag().toString("hex"),
    ciphertextBase64: encrypted.toString("base64"),
  };
}

export function unsealVeritasVaultPayload(sealedVault) {
  const key = deriveVeritasVaultKey(sealedVault.vaultDomain);
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(sealedVault.ivHex, "hex")
  );
  const aad = Buffer.from(
    `${sealedVault.vaultDomain}:${BOUND_ESCROW_CONTRACT}:${BOUND_NOTARY_WALLET}`,
    "utf8"
  );
  decipher.setAAD(aad);
  decipher.setAuthTag(Buffer.from(sealedVault.authTagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(sealedVault.ciphertextBase64, "base64")),
    decipher.final(),
  ]);
  return JSON.parse(decrypted.toString("utf8"));
}

export function hydrateRegexRuleList(serializedRules = []) {
  return serializedRules.map((item) => ({
    name: item.name,
    regex: new RegExp(item.source, item.flags || ""),
  }));
}
