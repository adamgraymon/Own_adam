/**
 * Módulo Fase 2: Gestor de Wallet Programática para IA + Policy Engine + Cliente Base Sepolia
 * Usa `viem` (estándar oficial EVM/Base) con llaves ECDSA secp256k1 reales.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createPublicClient,
  createWalletClient,
  http,
  formatEther,
  formatUnits,
  verifyMessage,
  keccak256,
  toHex,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, "..");
const ENV_PATH = path.join(ROOT_DIR, ".env");
const ENV_EXAMPLE_PATH = path.join(ROOT_DIR, ".env.example");

// Dirección oficial del token USDC de Circle en Base Sepolia Testnet
export const BASE_SEPOLIA_USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

const ERC20_BALANCE_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
];

function parseSimpleEnv(content) {
  const map = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    map[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return map;
}

/**
 * Inicializa (o carga desde .env) la Wallet exclusiva del Juez IA y la dirección pública de Tesorería.
 * Nota de seguridad: el servidor SOLO guarda la dirección pública de tu Tesorería (nunca su llave privada).
 */
export function initOrLoadAgentWallets() {
  if (!fs.existsSync(ENV_EXAMPLE_PATH)) {
    fs.writeFileSync(
      ENV_EXAMPLE_PATH,
      [
        "# Configuración de Wallets para Nodo Interventor en Base",
        "BASE_SEPOLIA_RPC_URL=https://sepolia.base.org",
        "TREASURY_PUBLIC_ADDRESS=0x861Ac49F8299C45Cca6bD9F0254080Fd82061Ac4",
        "ESCROW_CONTRACT_ADDRESS=0xd4f77bf843b3c359b233aca46d7ff6604cbd0a5e",
        "",
      ].join("\n"),
      "utf8"
    );
  }

  const hasEnvFile = fs.existsSync(ENV_PATH);
  const envVars = hasEnvFile ? parseSimpleEnv(fs.readFileSync(ENV_PATH, "utf8")) : {};
  const activeKeyHex = process.env.EVALUATOR_SIGNER_HEX || process.env.EVALUATOR_PRIVATE_KEY ||
    envVars.EVALUATOR_SIGNER_HEX || envVars.EVALUATOR_PRIVATE_KEY;
  const evaluatorKey = activeKeyHex || generatePrivateKey();
  const evaluatorAccount = privateKeyToAccount(evaluatorKey);
  const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL || envVars.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";
  const treasuryAddress = process.env.TREASURY_PUBLIC_ADDRESS || process.env.TREASURY_ADDRESS ||
    envVars.TREASURY_PUBLIC_ADDRESS || envVars.TREASURY_ADDRESS || "0x861Ac49F8299C45Cca6bD9F0254080Fd82061Ac4";
  const escrowContractAddress = process.env.ESCROW_CONTRACT_ADDRESS || envVars.ESCROW_CONTRACT_ADDRESS ||
    "0xd4f77bf843b3c359b233aca46d7ff6604cbd0a5e";

  if (!hasEnvFile && !activeKeyHex) {
    const envFileBody = [
      "# GENERADO AUTOMÁTICAMENTE (PROTEGIDO POR .gitignore — NO SUBIR A GITHUB)",
      `BASE_SEPOLIA_RPC_URL=${rpcUrl}`,
      `# Wallet Efímera de Solo-Firma del Juez IA (0 custodia de clientes)`,
      `EVALUATOR_SIGNER_HEX=${evaluatorKey}`,
      `EVALUATOR_PUBLIC_ADDRESS=${evaluatorAccount.address}`,
      `# Dirección Pública de Tesorería`,
      `TREASURY_PUBLIC_ADDRESS=${treasuryAddress}`,
      `ESCROW_CONTRACT_ADDRESS=${escrowContractAddress}`,
      "",
    ].join("\n");

    // Never replace an existing .env, even if another process creates it concurrently.
    try {
      fs.writeFileSync(ENV_PATH, envFileBody, { encoding: "utf8", flag: "wx", mode: 0o600 });
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      return initOrLoadAgentWallets();
    }
  }

  return {
    createdNew: !activeKeyHex,
    rpcUrl,
    evaluatorAccount,
    evaluatorAddress: evaluatorAccount.address,
    treasuryAddress,
    escrowContractAddress,
  };
}

/**
 * Policy Engine ("Control Parental" de una Wallet de IA):
 * Envuelve la cuenta de la IA para PROHIBIR transferencias de dinero salientes y permitir
 * únicamente firmar veredictos de auditoría o llamar `submitVerdict` en el contrato autorizado.
 */
export class PolicyGuardedAgentWallet {
  #account;
  #whitelistedContract;

  constructor(account, whitelistedContract = null) {
    this.#account = account;
    this.#whitelistedContract = whitelistedContract?.toLowerCase() || null;
  }

  get address() {
    return this.#account.address;
  }

  /**
   * Firma criptográficamente (ECDSA secp256k1 real de Ethereum/Base) un veredicto de interventoría.
   */
  async signAuditVerdict({ jobId, storeAddress, approved, datasetSha256 }) {
    const canonicalMessage = JSON.stringify({
      domain: "TrustGate-ERC8183-BaseSepolia",
      jobId,
      storeAddress,
      approved: Boolean(approved),
      datasetSha256,
    });

    const signature = await this.#account.signMessage({ message: canonicalMessage });
    const attestationHash = keccak256(toHex(canonicalMessage));

    const recoveredValid = await verifyMessage({
      address: this.#account.address,
      message: canonicalMessage,
      signature,
    });

    return {
      signerAddress: this.#account.address,
      attestationHash,
      ecdsaSignature: signature,
      verified: recoveredValid,
      canonicalMessage,
    };
  }

  /**
   * Cortafuegos duro: bloquea cualquier intento de enviar ETH/USDC o llamar contratos no autorizados.
   */
  validateTransactionIntent({ to, valueWei = 0n, functionName }) {
    if (BigInt(valueWei) > 0n) {
      return {
        allowed: false,
        reason:
          "POLICY_ENGINE_BLOCK: La Wallet del Juez IA tiene PROHIBIDO transferir valor monetario (value > 0).",
      };
    }

    if (functionName !== "submitVerdict") {
      return {
        allowed: false,
        reason: `POLICY_ENGINE_BLOCK: Función '${functionName}' denegada. La IA solo tiene permiso para 'submitVerdict'.`,
      };
    }

    if (this.#whitelistedContract && to?.toLowerCase() !== this.#whitelistedContract) {
      return {
        allowed: false,
        reason: `POLICY_ENGINE_BLOCK: Destino ${to} no está en la lista blanca del contrato Escrow.`,
      };
    }

    return { allowed: true };
  }

  createBaseSepoliaWalletClient(rpcUrl = "https://sepolia.base.org") {
    return createWalletClient({
      account: this.#account,
      chain: baseSepolia,
      transport: http(rpcUrl),
    });
  }
}

/**
 * Consulta en tiempo real la blockchain real Base Sepolia para verificar conexión y saldos.
 */
export async function fetchBaseSepoliaLiveStatus({
  rpcUrl = "https://sepolia.base.org",
  evaluatorAddress,
  treasuryAddress,
}) {
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(rpcUrl),
  });

  const [blockNumber, evalEthWei, evalUsdcRaw, treasuryUsdcRaw] = await Promise.all([
    publicClient.getBlockNumber(),
    publicClient.getBalance({ address: evaluatorAddress }),
    publicClient
      .readContract({
        address: BASE_SEPOLIA_USDC,
        abi: ERC20_BALANCE_ABI,
        functionName: "balanceOf",
        args: [evaluatorAddress],
      })
      .catch(() => 0n),
    publicClient
      .readContract({
        address: BASE_SEPOLIA_USDC,
        abi: ERC20_BALANCE_ABI,
        functionName: "balanceOf",
        args: [treasuryAddress],
      })
      .catch(() => 0n),
  ]);

  return {
    network: "Base Sepolia (Chain ID 84532)",
    liveBlockNumber: Number(blockNumber),
    usdcTokenContract: BASE_SEPOLIA_USDC,
    evaluatorWallet: {
      address: evaluatorAddress,
      ethForGas: formatEther(evalEthWei),
      usdcBalance: formatUnits(evalUsdcRaw, 6),
      explorerUrl: `https://sepolia.basescan.org/address/${evaluatorAddress}`,
    },
    treasuryWallet: {
      address: treasuryAddress,
      usdcBalance: formatUnits(treasuryUsdcRaw, 6),
      explorerUrl: `https://sepolia.basescan.org/address/${treasuryAddress}`,
    },
  };
}
