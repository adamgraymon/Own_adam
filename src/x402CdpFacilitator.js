import { randomUUID } from "node:crypto";
import { isAddressEqual, parseAbi, parseAbiItem, parseEventLogs } from "viem";
import {
  parseSepoliaAuthorization,
  X402_SANDBOX_ASSET,
  X402_SANDBOX_NETWORK,
} from "./x402SandboxFacilitator.js";

const BASE_SEPOLIA_CHAIN_ID = 84532;
const TRANSACTION_HASH = /^0x[0-9a-f]{64}$/i;
const AUTHORIZATION_USED = parseAbiItem("event AuthorizationUsed(address indexed authorizer, bytes32 indexed nonce)");
const TOKEN_EVENTS = [
  AUTHORIZATION_USED,
  parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)"),
];
const AUTHORIZATION_STATE = parseAbi([
  "function authorizationState(address authorizer, bytes32 nonce) view returns (bool)",
]);
const LOG_BLOCK_RANGE = 2000n;

function localPayment({ message, signature }, requirements) {
  // CDP does not need the loopback URL or discovery metadata for a Sepolia transfer.
  return {
    x402Version: 2,
    accepted: requirements,
    payload: {
      signature,
      authorization: {
        ...message,
        value: message.value.toString(),
        validAfter: message.validAfter.toString(),
        validBefore: message.validBefore.toString(),
      },
    },
  };
}

function success(payer, transaction) {
  return { success: true, network: X402_SANDBOX_NETWORK, transaction: transaction.toLowerCase(), payer };
}

function unavailable(payer, errorReason = "settlement_pending", transaction = "") {
  return { success: false, network: X402_SANDBOX_NETWORK, transaction, payer, errorReason };
}

function hasExactTransfer(receipt, intent) {
  if (receipt.status !== "success") return false;
  const logs = parseEventLogs({
    abi: TOKEN_EVENTS,
    logs: receipt.logs.filter(log => isAddressEqual(log.address, X402_SANDBOX_ASSET)),
    strict: true,
  });
  // Circle USDC emits AuthorizationUsed immediately before its corresponding Transfer.
  return logs.some((log, index) => {
    if (log.eventName !== "AuthorizationUsed" || log.args.nonce.toLowerCase() !== intent.nonce ||
        !isAddressEqual(log.args.authorizer, intent.payer)) return false;
    const transfer = logs[index + 1];
    return transfer?.eventName === "Transfer" && transfer.logIndex === log.logIndex + 1 &&
      isAddressEqual(transfer.args.from, intent.payer) && isAddressEqual(transfer.args.to, intent.recipient) &&
      transfer.args.value === BigInt(intent.amount);
  });
}

export function createX402CdpFacilitator(store, { facilitator, chain, recipient }) {
  async function requireSepolia() {
    if (await chain.getChainId() !== BASE_SEPOLIA_CHAIN_ID) {
      throw new Error("The CDP checkout requires a Base Sepolia RPC.");
    }
  }

  async function findChainReceipt(intent) {
    const fromBlock = BigInt(intent.fromBlock);
    const latest = await chain.getBlockNumber();
    if (latest < fromBlock) return null;
    // Authorizations expire in minutes. Keep the query bounded around the original attempt
    // so even a much later recovery can use RPCs with historical log-range limits.
    const toBlock = latest < fromBlock + LOG_BLOCK_RANGE ? latest : fromBlock + LOG_BLOCK_RANGE;
    const logs = await chain.getLogs({
      address: X402_SANDBOX_ASSET,
      event: AUTHORIZATION_USED,
      args: { authorizer: intent.payer, nonce: intent.nonce },
      fromBlock,
      toBlock,
      strict: true,
    });
    const matched = logs.find(log => !log.removed && TRANSACTION_HASH.test(log.transactionHash));
    if (!matched) return null;
    const receipt = await chain.getTransactionReceipt({ hash: matched.transactionHash });
    if (receipt.transactionHash.toLowerCase() !== matched.transactionHash.toLowerCase() ||
        (matched.blockHash && receipt.blockHash !== matched.blockHash) ||
        !hasExactTransfer(receipt, intent)) return null;
    return success(intent.payer, matched.transactionHash);
  }

  async function getSettlement(authorizationId) {
    const saved = await store.read("settlement", authorizationId);
    if (saved) return saved;
    const intent = await store.read("settlement-intent", authorizationId);
    if (!intent) return null;
    await requireSepolia();
    const receipt = await findChainReceipt(intent);
    return receipt ? store.insert("settlement", authorizationId, receipt) : null;
  }

  async function getUnresolvedResult(authorizationId, intent) {
    const receipt = await getSettlement(authorizationId);
    if (receipt) return receipt;
    if (BigInt(Math.floor(Date.now() / 1000)) >= BigInt(intent.validBefore)) {
      const block = await chain.getBlock({ blockTag: "safe" });
      if (block.timestamp >= BigInt(intent.validBefore)) {
        const used = await chain.readContract({
          address: X402_SANDBOX_ASSET,
          abi: AUTHORIZATION_STATE,
          functionName: "authorizationState",
          args: [intent.payer, intent.nonce],
          blockNumber: block.number,
        });
        if (used === false) return unavailable(intent.payer, "authorization_expired");
      }
    }
    const pending = await store.read("settlement-pending", authorizationId);
    return unavailable(intent.payer, "settlement_pending", pending?.transaction);
  }

  return {
    async getSupported() {
      await requireSepolia();
      const supported = await facilitator.getSupported();
      return {
        ...supported,
        kinds: supported.kinds.filter(kind => kind.x402Version === 2 &&
          kind.network === X402_SANDBOX_NETWORK && kind.scheme === "exact"),
      };
    },

    getAuthorizationId(payment, requirements) {
      return parseSepoliaAuthorization(payment, requirements, recipient)?.id ?? null;
    },

    getSettlement,

    async verify(payment, requirements) {
      const parsed = parseSepoliaAuthorization(payment, requirements, recipient);
      if (!parsed) return { isValid: false, invalidReason: "invalid_exact_evm_payload" };
      if (parsed.message.validBefore > BigInt(Math.floor(Date.now() / 1000) + requirements.maxTimeoutSeconds + 5)) {
        return { isValid: false, invalidReason: "invalid_exact_evm_payload_authorization_valid_before" };
      }
      const result = await facilitator.verify(localPayment(parsed, requirements), requirements);
      if (result.isValid && result.payer?.toLowerCase() !== parsed.message.from) {
        throw new Error("CDP verify returned a different payer.");
      }
      return result;
    },

    async settle(payment, requirements) {
      const parsed = parseSepoliaAuthorization(payment, requirements, recipient);
      if (!parsed) return unavailable(undefined, "invalid_exact_evm_payload");
      const { id, message } = parsed;
      const existing = await store.read("settlement-intent", id);
      if (existing) return getUnresolvedResult(id, existing);
      await requireSepolia();
      const attemptId = randomUUID();
      const intent = await store.insert("settlement-intent", id, {
        attemptId,
        payer: message.from,
        nonce: message.nonce,
        recipient: message.to,
        amount: message.value.toString(),
        validBefore: message.validBefore.toString(),
        fromBlock: (await chain.getBlockNumber()).toString(),
      });
      if (intent.attemptId !== attemptId) return getUnresolvedResult(id, intent);

      // Persist the attempt before contacting CDP. If the connection dies with a settlement
      // in flight, follow-up requests can reconcile it on chain without broadcasting again.
      const result = await facilitator.settle(localPayment(parsed, requirements), requirements);
      const transaction = TRANSACTION_HASH.test(result.transaction) ? result.transaction.toLowerCase() : "";
      if (!result.success) {
        if (transaction) await store.insert("settlement-pending", id, { transaction });
        return unavailable(intent.payer, "settlement_pending", transaction);
      }
      if (!transaction || result.network !== X402_SANDBOX_NETWORK ||
          result.payer?.toLowerCase() !== intent.payer ||
          (result.amount !== undefined && result.amount !== intent.amount)) {
        throw new Error("CDP returned an unexpected settlement receipt.");
      }
      return store.insert("settlement", id, success(intent.payer, transaction));
    },
  };
}
