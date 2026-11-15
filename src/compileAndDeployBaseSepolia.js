/**
 * Paso 2.1, 2.2 y 2.3 en un solo comando:
 * 1. Compila el contrato Solidity `TrustGateEscrow8183.sol` a Bytecode EVM + ABI real.
 * 2. Inicializa la Wallet de IA (`secp256k1`) con su Policy Engine y prueba una firma ECDSA real.
 * 3. Conecta al RPC real de Base Sepolia (Chain ID 84532), lee el bloque actual y verifica gas para desplegar.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import solc from "solc";
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import {
  BASE_SEPOLIA_USDC,
  initOrLoadAgentWallets,
  PolicyGuardedAgentWallet,
  fetchBaseSepoliaLiveStatus,
} from "./agentWalletManager.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, "..");
const CONTRACT_PATH = path.join(ROOT_DIR, "contracts", "TrustGateEscrow8183.sol");
const ARTIFACTS_DIR = path.join(ROOT_DIR, "artifacts");
const ARTIFACT_FILE = path.join(ARTIFACTS_DIR, "TrustGateEscrow8183.json");

export function compileEscrowSolidity() {
  const source = fs.readFileSync(CONTRACT_PATH, "utf8");
  const input = {
    language: "Solidity",
    sources: {
      "TrustGateEscrow8183.sol": { content: source },
    },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode.object"],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const errors = (output.errors || []).filter((e) => e.severity === "error");
  if (errors.length > 0) {
    throw new Error(
      "Errores de compilación Solidity:\n" + errors.map((e) => e.formattedMessage).join("\n")
    );
  }

  const compiled = output.contracts["TrustGateEscrow8183.sol"]["TrustGateEscrow8183"];
  const artifact = {
    contractName: "TrustGateEscrow8183",
    compilerVersion: solc.version(),
    abi: compiled.abi,
    bytecode: "0x" + compiled.evm.bytecode.object,
    compiledAt: new Date().toISOString(),
  };

  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  fs.writeFileSync(ARTIFACT_FILE, JSON.stringify(artifact, null, 2), "utf8");
  return artifact;
}

async function main() {
  console.log("==========================================================================");
  console.log(" FASE 2: COMPILACIÓN SOLIDITY + WALLET DE IA REAL + CONEXIÓN BASE SEPOLIA");
  console.log("==========================================================================\n");

  // 1. Compilar Smart Contract
  const artifact = compileEscrowSolidity();
  const bytecodeBytes = (artifact.bytecode.length - 2) / 2;
  console.log(`[1/4] Smart Contract compilado con éxito (${artifact.compilerVersion})`);
  console.log(`      * Archivo ABI/Bytecode : artifacts/TrustGateEscrow8183.json`);
  console.log(`      * Tamaño Bytecode EVM  : ${bytecodeBytes} bytes (${artifact.abi.length} entradas ABI)\n`);

  // 2. Cargar / Crear Wallets Reales
  const wallets = initOrLoadAgentWallets();
  const guardedAiWallet = new PolicyGuardedAgentWallet(wallets.evaluatorAccount);

  console.log(`[2/4] Identidades Criptográficas EVM (${wallets.createdNew ? "Creadas en .env" : "Cargadas de .env"})`);
  console.log(`      * Wallet Juez IA (Solo Firma) : ${guardedAiWallet.address}`);
  console.log(`      * Tu Tesorería (Solo Recibe)  : ${wallets.treasuryAddress}\n`);

  // 3. Demostración de Firma ECDSA real y Policy Engine ("Control Parental")
  const sampleVerdict = await guardedAiWallet.signAuditVerdict({
    jobId: "JOB-1001",
    storeAddress: "0x00000000000000000000000000000000000011A0",
    approved: true,
    datasetSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  });

  const hackCheck = guardedAiWallet.validateTransactionIntent({
    to: "0x000000000000000000000000000000000000dEaD",
    valueWei: 1_000_000_000_000_000n,
    functionName: "transfer",
  });

  console.log(`[3/4] Prueba de Firma Real ECDSA secp256k1 & Policy Engine de la IA`);
  console.log(`      * Hash Attestation Keccak256 : ${sampleVerdict.attestationHash}`);
  console.log(`      * Firma ECDSA del Juez IA    : ${sampleVerdict.ecdsaSignature.slice(0, 42)}...`);
  console.log(`      * Firma verificada (EIP-191) : ${sampleVerdict.verified}`);
  console.log(`      * Intento envío de dinero IA : BLOQUEADO -> "${hackCheck.reason}"\n`);

  // 4. Conectar en vivo a Base Sepolia RPC
  try {
    const live = await fetchBaseSepoliaLiveStatus({
      rpcUrl: wallets.rpcUrl,
      evaluatorAddress: guardedAiWallet.address,
      treasuryAddress: wallets.treasuryAddress,
    });

    console.log(`[4/4] Conexión en Vivo a Blockchain: ${live.network}`);
    console.log(`      * Último bloque en Base Sepolia : #${live.liveBlockNumber}`);
    console.log(`      * Saldo Gas Juez IA (ETH Test)  : ${live.evaluatorWallet.ethForGas} ETH`);
    console.log(`      * Saldo Tesorería (USDC Test)   : ${live.treasuryWallet.usdcBalance} USDC`);
    console.log(`      * Explorador BaseScan Juez IA   : ${live.evaluatorWallet.explorerUrl}\n`);

    if (process.argv.includes("--deploy")) {
      if (Number(live.evaluatorWallet.ethForGas) === 0) {
        console.log(" [!] Para desplegar en cadena necesitas pedir ETH gratis de prueba (0.001 ETH basta)");
        console.log(`     pegando esta dirección en el Faucet de Alchemy o Coinbase: ${guardedAiWallet.address}`);
        process.exit(0);
      }

      console.log(" Desplegando TrustGateEscrow8183 en Base Sepolia...");
      const walletClient = guardedAiWallet.createBaseSepoliaWalletClient(wallets.rpcUrl);
      const publicClient = createPublicClient({ chain: baseSepolia, transport: http(wallets.rpcUrl) });

      const txHash = await walletClient.deployContract({
        abi: artifact.abi,
        bytecode: artifact.bytecode,
        args: [BASE_SEPOLIA_USDC, guardedAiWallet.address, wallets.treasuryAddress],
      });

      console.log(` * Transacción enviada: https://sepolia.basescan.org/tx/${txHash}`);
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      console.log(` * CONTRATO DESPLEGADO EN: ${receipt.contractAddress}`);
    }
  } catch (rpcErr) {
    console.log(`[4/4] Nota RPC: No se pudo consultar Base Sepolia en este instante (${rpcErr.message}).`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
