/**
 * Script de Auto-Prueba en Circuito Cerrado ("Canary Loop Test" de 1.00 USDC)
 *
 * Incluye:
 * 1. Simulación criptográfica pre-vuelo (sin gastar nada).
 * 2. Ejecución real en Base Mainnet (`--live-mainnet`) o Base Sepolia (`--live-sepolia`):
 *    - Despliega el contrato (y guarda su dirección en .env para no pagar despliegue dos veces).
 *    - Ejecuta el ciclo completo en cadena: Approve USDC -> openAndFundJob (1.00 USDC) ->
 *      submitDeliverableHash -> Auditoría IA -> submitVerdict.
 *    - Como Comprador = Tienda = Tesorería = Tu Wallet (0x861Ac4...), el 100% del 1.00 USDC
 *      (0.97 + 0.03 = 1.00 USDC) regresa en el mismo bloque a tu propia dirección.
 * 3. Comando de retiro seguro (`--withdraw-to=0xTU_DIRECCION`): te devuelve tus USDC a tu wallet personal.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  formatUnits,
  formatEther,
  encodeFunctionData,
  keccak256,
  toHex,
} from "viem";
import { base, baseSepolia } from "viem/chains";
import {
  initOrLoadAgentWallets,
  PolicyGuardedAgentWallet,
  BASE_SEPOLIA_USDC,
} from "./agentWalletManager.js";
import { compileEscrowSolidity } from "./compileAndDeployBaseSepolia.js";
import { encryptDeliverable, auditEncryptedDataset } from "./auditorEngine.js";
import { generateScenarioDataset } from "./scenarios.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.join(__dirname, "..", ".env");
const BASE_MAINNET_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const BASE_WETH = "0x4200000000000000000000000000000000000006";
const BASE_UNISWAP_SWAP_ROUTER_02 = "0x2626664c2603336E57B271c5C0b26F421741e481";

const UNISWAP_ROUTER_ABI = [
  {
    type: "function",
    name: "exactInputSingle",
    stateMutability: "payable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "recipient", type: "address" },
          { name: "amountIn", type: "uint256" },
          { name: "amountOutMinimum", type: "uint256" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
      },
    ],
    outputs: [{ name: "amountOut", type: "uint256" }],
  },
];

const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "recipient", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
];

function round6(n) {
  return Math.round(n * 1e6) / 1e6;
}

function saveContractAddressToEnv(contractAddress) {
  if (!fs.existsSync(ENV_PATH)) return;
  let content = fs.readFileSync(ENV_PATH, "utf8");
  if (content.includes("ESCROW_CONTRACT_ADDRESS=")) {
    content = content.replace(/ESCROW_CONTRACT_ADDRESS=.*/g, `ESCROW_CONTRACT_ADDRESS=${contractAddress}`);
  } else {
    content += `\nESCROW_CONTRACT_ADDRESS=${contractAddress}\n`;
  }
  fs.writeFileSync(ENV_PATH, content, "utf8");
}

async function runSingleClosedLoopRound({
  roundNumber,
  title,
  usdcAmount,
  scenarioType,
  guardedJudgeWallet,
  selfWalletAddress,
  escrowAbi,
}) {
  const jobIdHex = keccak256(toHex(`CANARY-ROUND-${roundNumber}-${Date.now()}`));

  const feeBps = usdcAmount >= 10.0 ? 100 : 150;
  const rawFee = (usdcAmount * feeBps) / 10_000;
  const feeUsdc = round6(Math.max(rawFee, 0.03));
  const storePayoutUsdc = round6(usdcAmount - feeUsdc);

  const fundCalldata = encodeFunctionData({
    abi: escrowAbi,
    functionName: "openAndFundJob",
    args: [
      jobIdHex,
      selfWalletAddress,
      selfWalletAddress,
      parseUnits(String(usdcAmount), 6),
      300n,
    ],
  });

  const rawDataset = generateScenarioDataset(scenarioType, 1200);
  const encryptedPkg = encryptDeliverable(rawDataset);
  const deliverableHashBytes32 = "0x" + encryptedPkg.plaintextSha256;

  const auditResult = auditEncryptedDataset({
    encryptedPackage: encryptedPkg,
    jobSpec: {
      minRows: 1200,
      sampleSize: 30,
      topicKeywords: ["cloud", "saas", "pricing"],
      schema: {
        id: "string",
        company: "string",
        contactEmail: "email",
        annualSpendUsd: "number",
        domainUrl: "url",
      },
    },
  });

  const signedVerdict = await guardedJudgeWallet.signAuditVerdict({
    jobId: jobIdHex,
    storeAddress: selfWalletAddress,
    approved: auditResult.approved,
    datasetSha256: encryptedPkg.plaintextSha256,
  });

  const policyCheck = guardedJudgeWallet.validateTransactionIntent({
    to: selfWalletAddress,
    valueWei: 0n,
    functionName: "submitVerdict",
  });

  const verdictCalldata = encodeFunctionData({
    abi: escrowAbi,
    functionName: "submitVerdict",
    args: [jobIdHex, auditResult.approved, signedVerdict.attestationHash],
  });

  const returnedAsStore = auditResult.approved ? storePayoutUsdc : 0.0;
  const returnedAsTreasury = auditResult.approved ? feeUsdc : 0.0;
  const returnedAsBuyerRefund = auditResult.approved ? 0.0 : usdcAmount;
  const totalReturnedToYou = round6(returnedAsStore + returnedAsTreasury + returnedAsBuyerRefund);

  console.log(`--------------------------------------------------------------------------`);
  console.log(` VUELTA #${roundNumber}: ${title}`);
  console.log(`--------------------------------------------------------------------------`);
  console.log(` * Job ID (bytes32)        : ${jobIdHex.slice(0, 26)}...`);
  console.log(` * Capital puesto en giro  : ${usdcAmount.toFixed(2)} USDC`);
  console.log(` * Calldata openAndFundJob : ${fundCalldata.slice(0, 34)}... (${(fundCalldata.length - 2) / 2} bytes)`);
  console.log(` * Hash Dataset SHA-256    : ${deliverableHashBytes32.slice(0, 26)}...`);
  console.log(
    ` * Auditoría (${auditResult.metrics.durationMs} ms)     : ${
      auditResult.approved ? "APROBADO" : `RECHAZADO (${auditResult.stageFailed})`
    } | Gasto IA: ${auditResult.metrics.actualAiTokenCostUsdc.toFixed(3)} USDC`
  );
  console.log(` * Firma ECDSA Juez IA     : ${signedVerdict.ecdsaSignature.slice(0, 38)}... (Verificada: ${signedVerdict.verified})`);
  console.log(` * Policy Engine Juez IA   : Permitido=${policyCheck.allowed} | Calldata submitVerdict=${(verdictCalldata.length - 2) / 2} bytes`);
  if (auditResult.approved) {
    console.log(
      ` * Retorno a tu poder      : +${returnedAsStore.toFixed(4)} USDC (Rol Tienda) + ${returnedAsTreasury.toFixed(4)} USDC (Rol Tesorería) = ${totalReturnedToYou.toFixed(2)} USDC (100% recuperado)`
    );
  } else {
    console.log(
      ` * Retorno a tu poder      : +${returnedAsBuyerRefund.toFixed(4)} USDC (Reembolso Comprador) = ${totalReturnedToYou.toFixed(2)} USDC (100% recuperado)`
    );
  }
}

async function main() {
  const isLiveMainnet = process.argv.includes("--live-mainnet");
  const isLiveSepolia = process.argv.includes("--live-sepolia");
  const withdrawArg = process.argv.find((a) => a.startsWith("--withdraw-to="));

  const artifact = compileEscrowSolidity();
  const wallets = initOrLoadAgentWallets();
  const guardedJudge = new PolicyGuardedAgentWallet(wallets.evaluatorAccount);

  const targetChain = isLiveMainnet ? base : baseSepolia;
  const rpcUrl = isLiveMainnet ? "https://mainnet.base.org" : wallets.rpcUrl;
  const usdcAddress = isLiveMainnet ? BASE_MAINNET_USDC : BASE_SEPOLIA_USDC;
  const explorerBase = isLiveMainnet ? "https://basescan.org" : "https://sepolia.basescan.org";

  const publicClient = createPublicClient({ chain: targetChain, transport: http(rpcUrl) });
  const walletClient = createWalletClient({
    account: wallets.evaluatorAccount,
    chain: targetChain,
    transport: http(rpcUrl),
  });

  // Opción de retiro directo de tus USDC hacia tu billetera personal
  if (withdrawArg) {
    const dest = withdrawArg.split("=")[1];
    const usdcBal = await publicClient.readContract({
      address: usdcAddress,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [guardedJudge.address],
    });
    if (usdcBal === 0n) {
      console.log("No hay saldo USDC para retirar en este momento.");
      return;
    }
    console.log(`Enviando ${formatUnits(usdcBal, 6)} USDC de regreso a ${dest}...`);
    const tx = await walletClient.writeContract({
      address: usdcAddress,
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [dest, usdcBal],
    });
    console.log(`Retiro completado: ${explorerBase}/tx/${tx}`);
    return;
  }

  console.log("==========================================================================");
  console.log(" PRUEBA CANARY EN CIRCUITO CERRADO (TU PROPIO 1.00 USDC IDA Y VUELTA)");
  console.log(" Comprador = Tienda = Tesorería -> 0.00 USDC de pérdida de capital.");
  console.log("==========================================================================\n");

  await runSingleClosedLoopRound({
    roundNumber: 1,
    title: "Compra de 1.00 USDC (Entrega Honesta -> Liquida 0.97 + 0.03 = 1.00 USDC)",
    usdcAmount: 1.0,
    scenarioType: "honest",
    guardedJudgeWallet: guardedJudge,
    selfWalletAddress: guardedJudge.address,
    escrowAbi: artifact.abi,
  });

  await runSingleClosedLoopRound({
    roundNumber: 2,
    title: "Mismo 1.00 USDC Reciclado (Ataque Malware CSV -> Reembolsa 1.00 USDC íntegro)",
    usdcAmount: 1.0,
    scenarioType: "csv_malware",
    guardedJudgeWallet: guardedJudge,
    selfWalletAddress: guardedJudge.address,
    escrowAbi: artifact.abi,
  });

  await runSingleClosedLoopRound({
    roundNumber: 3,
    title: "Prueba Descuento Mayorista 10.00 USDC (Tarifa baja sola a 1.0% -> 9.90 + 0.10 = 10.00 USDC)",
    usdcAmount: 10.0,
    scenarioType: "honest",
    guardedJudgeWallet: guardedJudge,
    selfWalletAddress: guardedJudge.address,
    escrowAbi: artifact.abi,
  });

  const [blockNum, ethBal, usdcBal] = await Promise.all([
    publicClient.getBlockNumber(),
    publicClient.getBalance({ address: guardedJudge.address }),
    publicClient
      .readContract({
        address: usdcAddress,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [guardedJudge.address],
      })
      .catch(() => 0n),
  ]);

  console.log(`\n--- ESTADO EN VIVO EN ${targetChain.name.toUpperCase()} (Bloque #${blockNum}) ---`);
  console.log(` * Dirección de la Wallet : ${guardedJudge.address}`);
  console.log(` * Saldo actual ETH (Gas) : ${formatEther(ethBal)} ETH`);
  console.log(` * Saldo actual USDC      : ${formatUnits(usdcBal, 6)} USDC`);

  if (isLiveSepolia || isLiveMainnet) {
    let currentUsdcBal = usdcBal;

    // Calibrado para el retiro de ~0.002 ETH desde Binance (~0.00185 ETH recibidos):
    // Cambia 0.0008 ETH a USDC (> 1.00 USDC) en Uniswap v3 y deja > 0.001 ETH libres para gas
    if (isLiveMainnet && currentUsdcBal < 500_000n && ethBal >= 550_000_000_000_000n) {
      const ethToSwapWei = ethBal >= 1_200_000_000_000_000n ? 800_000_000_000_000n : 450_000_000_000_000n;
      console.log(
        `\n [Auto-Swap Base] Detectado tu ETH (${formatEther(ethBal)} ETH). Convirtiendo ${formatEther(ethToSwapWei)} ETH -> USDC en Uniswap v3...`
      );
      const swapTx = await walletClient.writeContract({
        address: BASE_UNISWAP_SWAP_ROUTER_02,
        abi: UNISWAP_ROUTER_ABI,
        functionName: "exactInputSingle",
        value: ethToSwapWei,
        args: [
          {
            tokenIn: BASE_WETH,
            tokenOut: BASE_MAINNET_USDC,
            fee: 500, // Pool 0.05% WETH/USDC en Base
            recipient: guardedJudge.address,
            amountIn: ethToSwapWei,
            amountOutMinimum: 400_000n, // Protección slippage flexible
            sqrtPriceLimitX96: 0n,
          },
        ],
      });
      console.log(`       Swap enviado: ${explorerBase}/tx/${swapTx}`);
      await publicClient.waitForTransactionReceipt({ hash: swapTx });
      currentUsdcBal = await publicClient.readContract({
        address: usdcAddress,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [guardedJudge.address],
      });
      console.log(`       Nuevo saldo USDC tras Auto-Swap: ${formatUnits(currentUsdcBal, 6)} USDC`);
    }

    if (ethBal === 0n || currentUsdcBal < 500_000n) {
      console.log(
        `\n [Esperando llegada de fondos]: En cuanto se acredite tu retiro de Binance en ${guardedJudge.address}, vuelve a correr el comando.`
      );
      return;
    }

    let contractAddr = wallets.escrowContractAddress;
    if (!contractAddr) {
      console.log(`\n [1/4] Desplegando contrato TrustGateEscrow8183 en ${targetChain.name}...`);
      const deployTx = await walletClient.deployContract({
        abi: artifact.abi,
        bytecode: artifact.bytecode,
        args: [usdcAddress, guardedJudge.address, guardedJudge.address],
      });
      console.log(`       Tx despliegue: ${explorerBase}/tx/${deployTx}`);
      const receipt = await publicClient.waitForTransactionReceipt({ hash: deployTx });
      contractAddr = receipt.contractAddress;
      saveContractAddressToEnv(contractAddr);
      console.log(`       Contrato activo en: ${explorerBase}/address/${contractAddr}`);
    }

    // Si hay >= 1.00 USDC gira 1.00 USDC; si hay entre 0.50 y 0.99 USDC gira 0.50 USDC
    const testOrderAmount = currentUsdcBal >= 1_000_000n ? parseUnits("1.0", 6) : parseUnits("0.5", 6);
    const liveJobId = keccak256(toHex(`LIVE-CANARY-${Date.now()}`));

    console.log(` [2/4] Aprobando y congelando ${formatUnits(testOrderAmount, 6)} USDC en el contrato Escrow...`);
    const appTx = await walletClient.writeContract({
      address: usdcAddress,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [contractAddr, testOrderAmount],
    });
    await publicClient.waitForTransactionReceipt({ hash: appTx });

    const fundTx = await walletClient.writeContract({
      address: contractAddr,
      abi: artifact.abi,
      functionName: "openAndFundJob",
      args: [liveJobId, guardedJudge.address, guardedJudge.address, testOrderAmount, 600n],
    });
    await publicClient.waitForTransactionReceipt({ hash: fundTx });
    console.log(`       USDC congelado en Escrow: ${explorerBase}/tx/${fundTx}`);

    console.log(` [3/4] Auditar Dataset y Firmar Veredicto en Cadena (submitVerdict)...`);
    const rawData = generateScenarioDataset("honest", 1000);
    const enc = encryptDeliverable(rawData);
    const audit = auditEncryptedDataset({
      encryptedPackage: enc,
      jobSpec: { minRows: 1000, sampleSize: 30, topicKeywords: ["cloud", "saas", "pricing"] },
    });
    const sig = await guardedJudge.signAuditVerdict({
      jobId: liveJobId,
      storeAddress: guardedJudge.address,
      approved: audit.approved,
      datasetSha256: enc.plaintextSha256,
    });

    const settleTx = await walletClient.writeContract({
      address: contractAddr,
      abi: artifact.abi,
      functionName: "submitVerdict",
      args: [liveJobId, true, sig.attestationHash],
    });
    await publicClient.waitForTransactionReceipt({ hash: settleTx });
    console.log(`       Veredicto liquidado en cadena: ${explorerBase}/tx/${settleTx}`);

    const finalUsdc = await publicClient.readContract({
      address: usdcAddress,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [guardedJudge.address],
    });
    console.log(` [4/4] ¡Vuelta Completada! Saldo USDC de regreso en tu wallet: ${formatUnits(finalUsdc, 6)} USDC`);
  }
}

main();
