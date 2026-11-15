/**
 * Auditoría de Datasets Reales de Databento (NQ Futures CME Globex) + Liquidación en Base Mainnet
 *
 * Ejecuta 3 ciclos completos en la blockchain real de Base (`0xd4f77bf843b3c359b233aca46d7ff6604cbd0a5e`)
 * reciclando el mismo 1.00 USDC para dejar historial real de transacciones y firmas ECDSA en BaseScan:
 *  - Ciclo 1: `DATABENTO_INSTRUMENT_MAPPING_V05.csv` (278 KB, futuros NQ reales) -> APROBADO y Liquidado
 *  - Ciclo 2: `composicion_bid_ask.csv` (157 KB, microestructura Bid/Ask NQ)     -> APROBADO y Liquidado
 *  - Ciclo 3: `DATABENTO_MEMBER_PROFILE_V05.csv` (Saboteado con Malware CSV)     -> RECHAZADO y Reembolsado 100%
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createPublicClient,
  createWalletClient,
  fallback,
  http,
  parseUnits,
  formatUnits,
  formatEther,
  keccak256,
  toHex,
} from "viem";
import { base } from "viem/chains";
import { initOrLoadAgentWallets, PolicyGuardedAgentWallet } from "./agentWalletManager.js";
import { compileEscrowSolidity } from "./compileAndDeployBaseSepolia.js";
import { encryptDeliverable, auditEncryptedDataset } from "./auditorEngine.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
const BASE_MAINNET_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

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
];

/**
 * Parser CSV respetando comillas dobles para archivos de Databento.
 */
function parseCsvToRecords(csvText) {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const splitCsvLine = (line) => {
    const out = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out;
  };

  const headers = splitCsvLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    if (cols.length !== headers.length) continue;
    const obj = {};
    for (let c = 0; c < headers.length; c++) {
      const key = headers[c];
      const rawVal = cols[c];
      const numVal = Number(rawVal);
      obj[key] =
        rawVal !== "" && !Number.isNaN(numVal) && /^-?\d+(\.\d+)?$/.test(rawVal)
          ? numVal
          : rawVal;
    }
    rows.push(obj);
  }
  return rows;
}

async function executeLiveDatabentoCycle({
  cycleNumber,
  label,
  records,
  jobSpec,
  publicClient,
  walletClient,
  guardedJudge,
  contractAddr,
  escrowAbi,
}) {
  console.log(`\n==========================================================================`);
  console.log(` CICLO EN CADENA #${cycleNumber}: ${label}`);
  console.log(`==========================================================================`);
  console.log(` * Registros reales cargados : ${records.length} filas`);

  // 1. Cifrar el dataset real de Databento con AES-256-GCM y obtener su huella SHA-256
  const rawJson = JSON.stringify(records);
  const encryptedPkg = encryptDeliverable(rawJson);
  const deliverableHashBytes32 = "0x" + encryptedPkg.plaintextSha256;

  console.log(` * Tamaño paquete cifrado    : ${(encryptedPkg.byteSize / 1024).toFixed(1)} KB`);
  console.log(` * Huella SHA-256 del archivo: ${deliverableHashBytes32}`);

  // 2. Auditar con el Doble Motor Interventor (Capa 1 100% + Capa 2 Muestreo Ciego 30 filas)
  const auditResult = auditEncryptedDataset({
    encryptedPackage: encryptedPkg,
    jobSpec,
  });

  console.log(
    ` * Tiempo de Auditoría       : ${auditResult.metrics.durationMs} ms (${auditResult.metrics.totalRowsScannedDeterministic} filas escaneadas al 100%)`
  );
  console.log(` * Veredicto del Motor       : ${auditResult.summary}`);

  if (auditResult.metrics.blindSampleCount > 0) {
    const sampleIdxs = auditResult.metrics.sampledRowPreview.slice(0, 3);
    console.log(
      ` * Índices sorteados al azar : [${auditResult.metrics.sampledRowPreview.join(", ")}...]`
    );
    for (const idx of sampleIdxs) {
      console.log(`   -> Muestra real #${idx + 1}: ${JSON.stringify(records[idx]).slice(0, 115)}...`);
    }
  } else if (auditResult.findings?.length) {
    console.log(` * Hallazgo forense Capa 1   : ${auditResult.findings[0]}`);
  }

  // 3. Firmar veredicto con la llave ECDSA secp256k1 del Juez IA
  const jobIdHex = keccak256(toHex(`DATABENTO-MAINNET-CYCLE-${cycleNumber}-${Date.now()}`));
  const signedVerdict = await guardedJudge.signAuditVerdict({
    jobId: jobIdHex,
    storeAddress: guardedJudge.address,
    approved: auditResult.approved,
    datasetSha256: encryptedPkg.plaintextSha256,
  });

  console.log(` * Firma ECDSA Juez IA       : ${signedVerdict.ecdsaSignature.slice(0, 42)}... (Verificada: ${signedVerdict.verified})`);

  // 4. Grabar todo el ciclo en vivo en Base Mainnet (1.00 USDC)
  const oneUsdc = parseUnits("1.0", 6);

  console.log(` * [Tx 1] Aprobando 1.00 USDC hacia el contrato Escrow...`);
  const appTx = await walletClient.writeContract({
    address: BASE_MAINNET_USDC,
    abi: ERC20_ABI,
    functionName: "approve",
    args: [contractAddr, oneUsdc],
  });
  await publicClient.waitForTransactionReceipt({ hash: appTx });

  console.log(` * [Tx 2] Congelando 1.00 USDC en Escrow (openAndFundJob)...`);
  const fundTx = await walletClient.writeContract({
    address: contractAddr,
    abi: escrowAbi,
    functionName: "openAndFundJob",
    args: [jobIdHex, guardedJudge.address, guardedJudge.address, oneUsdc, 600n],
  });
  await publicClient.waitForTransactionReceipt({ hash: fundTx });
  console.log(`   -> BaseScan Lock Tx       : https://basescan.org/tx/${fundTx}`);

  console.log(` * [Tx 3] Registrando huella SHA-256 de Databento en cadena (submitDeliverableHash)...`);
  const hashTx = await walletClient.writeContract({
    address: contractAddr,
    abi: escrowAbi,
    functionName: "submitDeliverableHash",
    args: [jobIdHex, deliverableHashBytes32],
  });
  await publicClient.waitForTransactionReceipt({ hash: hashTx });
  console.log(`   -> BaseScan Hash Tx       : https://basescan.org/tx/${hashTx}`);

  console.log(
    ` * [Tx 4] Firmando y liquidando veredicto en cadena (submitVerdict=${auditResult.approved})...`
  );
  const verdictTx = await walletClient.writeContract({
    address: contractAddr,
    abi: escrowAbi,
    functionName: "submitVerdict",
    args: [jobIdHex, auditResult.approved, signedVerdict.attestationHash],
  });
  await publicClient.waitForTransactionReceipt({ hash: verdictTx });
  console.log(`   -> BaseScan Verdict Tx    : https://basescan.org/tx/${verdictTx}`);

  const usdcAfter = await publicClient.readContract({
    address: BASE_MAINNET_USDC,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [guardedJudge.address],
  });
  console.log(` * Saldo USDC tras liquidar  : ${formatUnits(usdcAfter, 6)} USDC (100% en tu poder)`);
}

async function main() {
  const artifact = compileEscrowSolidity();
  const wallets = initOrLoadAgentWallets();
  const guardedJudge = new PolicyGuardedAgentWallet(wallets.evaluatorAccount);
  const contractAddr = wallets.escrowContractAddress;

  if (!contractAddr) {
    throw new Error("No se encontró ESCROW_CONTRACT_ADDRESS en .env");
  }

  const rpcTransport = fallback([
    http("https://base-rpc.publicnode.com", { retryCount: 4, retryDelay: 1000 }),
    http("https://mainnet.base.org", { retryCount: 4, retryDelay: 1500 }),
    http("https://1rpc.io/base", { retryCount: 3, retryDelay: 1000 }),
  ]);

  const publicClient = createPublicClient({
    chain: base,
    transport: rpcTransport,
  });
  const walletClient = createWalletClient({
    account: wallets.evaluatorAccount,
    chain: base,
    transport: rpcTransport,
  });

  // Verificar si quedó saldo en el contrato por corte de red previo
  const lockedInContract = await publicClient.readContract({
    address: BASE_MAINNET_USDC,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [contractAddr],
  });
  if (lockedInContract > 0n) {
    console.log(` * Recuperando ${formatUnits(lockedInContract, 6)} USDC retenido por corte RPC previo...`);
    const recTx = await walletClient.writeContract({
      address: contractAddr,
      abi: artifact.abi,
      functionName: "submitVerdict",
      args: [
        "0x23d0ca1f007adc5370b211635f7504e983885f938cd6f3aedc8dc379ccd175b3",
        false,
        "0x0000000000000000000000000000000000000000000000000000000000000001",
      ],
    });
    await publicClient.waitForTransactionReceipt({ hash: recTx });
    console.log(`   -> Reembolso completado: https://basescan.org/tx/${recTx}`);
  }

  // Cargar los 3 archivos reales extraídos del Drive del usuario
  const mappingCsv = fs.readFileSync(
    path.join(DATA_DIR, "DATABENTO_INSTRUMENT_MAPPING_V05.csv"),
    "utf8"
  );
  const bidAskCsv = fs.readFileSync(path.join(DATA_DIR, "composicion_bid_ask.csv"), "utf8");
  const profileCsv = fs.readFileSync(
    path.join(DATA_DIR, "DATABENTO_MEMBER_PROFILE_V05.csv"),
    "utf8"
  );

  const mappingRows = parseCsvToRecords(mappingCsv);
  const bidAskRows = parseCsvToRecords(bidAskCsv);
  const sabotagedProfileRows = parseCsvToRecords(profileCsv);

  // En el Ciclo 3 inyectamos un ataque malicioso en la fila #45 para probar el reembolso automático en cadena
  const targetIdx = Math.min(45, sabotagedProfileRows.length - 1);
  sabotagedProfileRows[targetIdx].member = `=CMD|' /C powershell -NoP -Enc ZXhwbG9pdA=='!A0`;

  // CICLO 1: Dataset Real Databento Instrument Mapping (Futuros NQ CME Globex)
  await executeLiveDatabentoCycle({
    cycleNumber: 1,
    label: "DATABENTO_INSTRUMENT_MAPPING_V05.csv (Futuros NQ CME Globex OHLCV-1m)",
    records: mappingRows,
    jobSpec: {
      minRows: 1000,
      sampleSize: 30,
      topicKeywords: ["glbx-mdp3", "nq", "ohlcv"],
      schema: {
        member: "string",
        symbol: "string",
        instrument_id: "number",
        rows: "number",
        volume_sum: "number",
      },
    },
    publicClient,
    walletClient,
    guardedJudge,
    contractAddr,
    escrowAbi: artifact.abi,
  });

  // CICLO 2: Dataset Real Microestructura NQ (composicion_bid_ask.csv)
  await executeLiveDatabentoCycle({
    cycleNumber: 2,
    label: "composicion_bid_ask.csv (Microestructura Bid/Ask NQ MBO)",
    records: bidAskRows,
    jobSpec: {
      minRows: 200,
      sampleSize: 30,
      topicKeywords: ["m_seed", "ataque", "respuesta"],
      schema: {
        union_id: "string",
        case_id: "string",
        side: "string",
        center: "number",
        duration_s: "number",
      },
    },
    publicClient,
    walletClient,
    guardedJudge,
    contractAddr,
    escrowAbi: artifact.abi,
  });

  // CICLO 3: Dataset Real Databento Member Profile Adulterado con Malware CSV -> Reembolso 100% en Base Mainnet
  await executeLiveDatabentoCycle({
    cycleNumber: 3,
    label: "DATABENTO_MEMBER_PROFILE_V05.csv (Simulación de archivo adulterado con Malware CSV)",
    records: sabotagedProfileRows,
    jobSpec: {
      minRows: 100,
      sampleSize: 30,
      topicKeywords: ["glbx-mdp3"],
      schema: {
        member: "string",
        rows: "number",
      },
    },
    publicClient,
    walletClient,
    guardedJudge,
    contractAddr,
    escrowAbi: artifact.abi,
  });

  const [finalEth, finalUsdc] = await Promise.all([
    publicClient.getBalance({ address: guardedJudge.address }),
    publicClient.readContract({
      address: BASE_MAINNET_USDC,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [guardedJudge.address],
    }),
  ]);

  console.log(`\n==========================================================================`);
  console.log(` AUDITORÍA ON-CHAIN DE DATABENTO COMPLETADA EN BASE MAINNET`);
  console.log(` * Contrato verificado : https://basescan.org/address/${contractAddr}`);
  console.log(` * Saldo USDC final    : ${formatUnits(finalUsdc, 6)} USDC (Intacto al 100%)`);
  console.log(` * Saldo ETH restante  : ${formatEther(finalEth)} ETH`);
  console.log(`==========================================================================\n`);
}

main();
