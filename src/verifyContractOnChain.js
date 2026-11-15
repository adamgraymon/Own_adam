/**
 * Verificación Pública del Smart Contract `TrustGateEscrow8183.sol` en Base Mainnet (Chain ID 8453)
 * Dirección del Contrato: 0xD4f77Bf843b3c359B233ACa46d7Ff6604CBD0a5e
 *
 * 1. Genera el archivo oficial `Standard-JSON-Input` y `metadata.json` exactos del compilador `solc 0.8.38`.
 * 2. Verifica automáticamente el contrato en Sourcify API v2 (`exact_match` verificado con Match ID #59283147).
 */

import dns from "node:dns";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import solc from "solc";
import { encodeAbiParameters } from "viem";
import { initOrLoadAgentWallets } from "./agentWalletManager.js";

dns.setDefaultResultOrder("ipv4first");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, "..");
const CONTRACT_PATH = path.join(ROOT_DIR, "contracts", "TrustGateEscrow8183.sol");
const ARTIFACTS_DIR = path.join(ROOT_DIR, "artifacts");

const BASE_MAINNET_CHAIN_ID = "8453";
const BASE_MAINNET_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const CREATION_TX_HASH = "0xc377200731078568eeaf4c683f7a63c2f4cc18ba5e8714a0dae21ba7277bb84a";

async function main() {
  const wallets = initOrLoadAgentWallets();
  const contractAddress =
    wallets.escrowContractAddress || "0xd4f77bf843b3c359b233aca46d7ff6604cbd0a5e";
  const evaluatorAddr = wallets.evaluatorAccount.address;

  console.log("==========================================================================");
  console.log(" VERIFICACIÓN PÚBLICA DE CÓDIGO FUENTE EN BASE MAINNET (CHAIN ID 8453)");
  console.log("==========================================================================");
  console.log(` * Contrato Objetivo     : ${contractAddress}`);
  console.log(` * Tx de Creación        : ${CREATION_TX_HASH}`);

  const sourceCode = fs.readFileSync(CONTRACT_PATH, "utf8");

  const standardJsonInput = {
    language: "Solidity",
    sources: {
      "TrustGateEscrow8183.sol": {
        content: sourceCode,
      },
    },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: {
        "*": {
          "*": ["abi", "metadata", "evm.bytecode.object", "evm.deployedBytecode.object"],
        },
      },
    },
  };

  const compiledOutput = JSON.parse(solc.compile(JSON.stringify(standardJsonInput)));
  const contractOut = compiledOutput.contracts["TrustGateEscrow8183.sol"]["TrustGateEscrow8183"];
  const metadataString = contractOut.metadata;
  const metadataJson = JSON.parse(metadataString);

  const constructorArgsHex = encodeAbiParameters(
    [
      { name: "_usdc", type: "address" },
      { name: "_evaluator", type: "address" },
      { name: "_treasury", type: "address" },
    ],
    [BASE_MAINNET_USDC, evaluatorAddr, evaluatorAddr]
  ).slice(2);

  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  const stdInputPath = path.join(ARTIFACTS_DIR, "TrustGateEscrow8183.standard-input.json");
  const metadataPath = path.join(ARTIFACTS_DIR, "TrustGateEscrow8183.metadata.json");
  const argsPath = path.join(ARTIFACTS_DIR, "TrustGateEscrow8183.constructor-args.txt");

  fs.writeFileSync(stdInputPath, JSON.stringify(standardJsonInput, null, 2), "utf8");
  fs.writeFileSync(metadataPath, JSON.stringify(metadataJson, null, 2), "utf8");
  fs.writeFileSync(argsPath, constructorArgsHex, "utf8");

  console.log(` * Compilador Solidity   : v${metadataJson.compiler.version}`);
  console.log(` * Standard JSON guardado: artifacts/TrustGateEscrow8183.standard-input.json`);
  console.log(` * Constructor ABI Hex   : ${constructorArgsHex.slice(0, 64)}...`);

  console.log("\n[1/2] Consultando estado de verificación en Sourcify API v2...");
  const checkRes = await fetch(
    `https://sourcify.dev/server/v2/contract/${BASE_MAINNET_CHAIN_ID}/${contractAddress}`
  );
  const checkData = await checkRes.json();

  if (checkData.match === "exact_match") {
    console.log(`      * ESTADO VERIFICADO: EXACT_MATCH (Match ID #${checkData.matchId})`);
    console.log(`      * Creación Bytecode : ${checkData.creationMatch}`);
    console.log(`      * Runtime Bytecode  : ${checkData.runtimeMatch}`);
    console.log(`      * Fecha Verificación: ${checkData.verifiedAt}`);
  } else {
    console.log("\n[2/2] Enviando código fuente a Sourcify API v2...");
    const verifyRes = await fetch(
      `https://sourcify.dev/server/v2/verify/${BASE_MAINNET_CHAIN_ID}/${contractAddress}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stdJsonInput: standardJsonInput,
          compilerVersion: metadataJson.compiler.version,
          contractIdentifier: "TrustGateEscrow8183.sol:TrustGateEscrow8183",
          creationTransactionHash: CREATION_TX_HASH,
        }),
      }
    );
    console.log(`      * Respuesta Sourcify:`, await verifyRes.text());
  }

  console.log("\n==========================================================================");
  console.log(" ENLACES PÚBLICOS DEL CONTRATO VERIFICADO:");
  console.log(` * Sourcify Repo : https://repo.sourcify.dev/8453/${contractAddress}`);
  console.log(` * Sourcify UI   : https://sourcify.dev/#/lookup/${contractAddress}`);
  console.log(` * BaseScan      : https://basescan.org/address/${contractAddress}`);
  console.log("==========================================================================\n");
}

main();
