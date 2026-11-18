import { createHash } from "node:crypto";
import { authorizationTypes } from "@x402/evm";
import { maxUint256, verifyTypedData } from "viem";

const CHAIN_ID = 84532;
export const X402_SANDBOX_NETWORK = "eip155:84532";
export const X402_SANDBOX_ASSET = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
export const X402_SANDBOX_RECIPIENT = "0x000000000000000000000000000000000000dead";
export const X402_SANDBOX_TOKEN_NAME = "USDC";
export const X402_SANDBOX_TOKEN_VERSION = "2";

const ADDRESS = /^0x[0-9a-f]{40}$/i;
const NONCE = /^0x[0-9a-f]{64}$/i;
const SIGNATURE = /^0x[0-9a-f]{130}$/i;
const UINT256 = /^(0|[1-9][0-9]{0,77})$/;
const CLOCK_SKEW_SECONDS = 5n;

function sha256Hex(...values) {
  return "0x" + createHash("sha256").update(JSON.stringify(values)).digest("hex");
}

function isUint256(value) {
  return typeof value === "string" && UINT256.test(value) && BigInt(value) <= maxUint256;
}

function isMatchingHex(value, expected) {
  return typeof value === "string" && value.toLowerCase() === expected.toLowerCase();
}

function isSepoliaRequirements(requirements, recipient) {
  return requirements?.scheme === "exact" &&
    requirements.network === X402_SANDBOX_NETWORK &&
    isMatchingHex(requirements.asset, X402_SANDBOX_ASSET) &&
    isMatchingHex(requirements.payTo, recipient) &&
    isUint256(requirements.amount) && requirements.amount !== "0" &&
    Number.isSafeInteger(requirements.maxTimeoutSeconds) && requirements.maxTimeoutSeconds > 0 &&
    requirements.extra?.name === X402_SANDBOX_TOKEN_NAME &&
    requirements.extra?.version === X402_SANDBOX_TOKEN_VERSION &&
    (requirements.extra.assetTransferMethod ?? "eip3009") === "eip3009";
}

export function parseSepoliaAuthorization(paymentPayload, requirements, recipient = X402_SANDBOX_RECIPIENT) {
  const accepted = paymentPayload?.accepted;
  const { authorization, signature } = paymentPayload?.payload ?? {};
  if (paymentPayload?.x402Version !== 2 ||
      !isSepoliaRequirements(requirements, recipient) || !isSepoliaRequirements(accepted, recipient) ||
      accepted.amount !== requirements.amount ||
      accepted.maxTimeoutSeconds !== requirements.maxTimeoutSeconds ||
      typeof signature !== "string" || !SIGNATURE.test(signature) ||
      typeof authorization?.from !== "string" || !ADDRESS.test(authorization.from) ||
      !isMatchingHex(authorization.to, recipient) ||
      authorization.value !== requirements.amount ||
      !isUint256(authorization.validAfter) || !isUint256(authorization.validBefore) ||
      typeof authorization.nonce !== "string" || !NONCE.test(authorization.nonce)) {
    return null;
  }

  const from = authorization.from.toLowerCase();
  const nonce = authorization.nonce.toLowerCase();
  return {
    id: sha256Hex(X402_SANDBOX_NETWORK, X402_SANDBOX_ASSET.toLowerCase(), from, nonce),
    signature,
    message: {
      from,
      to: recipient,
      value: BigInt(authorization.value),
      validAfter: BigInt(authorization.validAfter),
      validBefore: BigInt(authorization.validBefore),
      nonce,
    },
  };
}

async function verifyAuthorization(parsed, requirements) {
  if (!parsed) return { isValid: false, invalidReason: "invalid_exact_evm_payload" };

  const { message, signature } = parsed;
  const payer = message.from;
  const now = BigInt(Math.floor(Date.now() / 1000));
  if (message.validAfter >= now) {
    return { isValid: false, invalidReason: "invalid_exact_evm_payload_authorization_valid_after", payer };
  }
  if (message.validBefore <= now || message.validBefore > now + BigInt(requirements.maxTimeoutSeconds) + CLOCK_SKEW_SECONDS) {
    return { isValid: false, invalidReason: "invalid_exact_evm_payload_authorization_valid_before", payer };
  }

  let isValid;
  try {
    isValid = await verifyTypedData({
      address: payer,
      domain: {
        name: X402_SANDBOX_TOKEN_NAME,
        version: X402_SANDBOX_TOKEN_VERSION,
        chainId: CHAIN_ID,
        verifyingContract: X402_SANDBOX_ASSET,
      },
      types: authorizationTypes,
      primaryType: "TransferWithAuthorization",
      message,
      signature,
    });
  } catch {
    isValid = false;
  }
  return isValid ? { isValid, payer } : { isValid, invalidReason: "invalid_exact_evm_signature", payer };
}

// The sandbox checks a genuine EIP-712 signature, but has no RPC or access to funds.
export function createX402SandboxFacilitator({ read, insert }) {
  async function getSettlement(authorizationId) {
    return read("settlement", authorizationId);
  }

  return {
    async getSupported() {
      return {
        kinds: [{ x402Version: 2, scheme: "exact", network: X402_SANDBOX_NETWORK }],
        extensions: [],
        signers: {},
      };
    },

    getAuthorizationId(paymentPayload, requirements) {
      return parseSepoliaAuthorization(paymentPayload, requirements)?.id ?? null;
    },

    getSettlement,

    async verify(paymentPayload, requirements) {
      const parsed = parseSepoliaAuthorization(paymentPayload, requirements);
      const result = await verifyAuthorization(parsed, requirements);
      if (result.isValid && await getSettlement(parsed.id)) {
        return { isValid: false, invalidReason: "invalid_exact_evm_nonce_already_used", payer: result.payer };
      }
      return result;
    },

    async settle(paymentPayload, requirements) {
      const parsed = parseSepoliaAuthorization(paymentPayload, requirements);
      // The resource server checks the original authorization digest before retrying.
      const existing = parsed && await getSettlement(parsed.id);
      if (existing) return existing;

      const result = await verifyAuthorization(parsed, requirements);
      if (!result.isValid) {
        return {
          success: false,
          errorReason: result.invalidReason,
          payer: result.payer,
          network: X402_SANDBOX_NETWORK,
          transaction: "",
        };
      }
      return insert("settlement", parsed.id, {
        success: true,
        transaction: sha256Hex("trustgate:x402:sandbox", parsed.id),
        payer: result.payer,
        network: X402_SANDBOX_NETWORK,
      });
    },
  };
}
