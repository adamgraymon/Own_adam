/**
 * Puente Oficial Ethereum L1 -> Base L2 (`OptimismPortal` 0x49048044D57e1C92A77f79988d21Fa8fAF74E97e)
 * + Disparo automático de la prueba Canary en Base Mainnet.
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  formatEther,
  parseEther,
} from "viem";
import { mainnet, base } from "viem/chains";
import { initOrLoadAgentWallets } from "./agentWalletManager.js";

const BASE_PORTAL_L1 = "0x49048044D57e1C92A77f79988d21Fa8fAF74E97e";

const PORTAL_ABI = [
  {
    type: "function",
    name: "depositTransaction",
    stateMutability: "payable",
    inputs: [
      { name: "_to", type: "address" },
      { name: "_value", type: "uint256" },
      { name: "_gasLimit", type: "uint64" },
      { name: "_isCreation", type: "bool" },
      { name: "_data", type: "bytes" },
    ],
    outputs: [],
  },
];

async function main() {
  const wallets = initOrLoadAgentWallets();
  const addr = wallets.evaluatorAddress;

  const l1Public = createPublicClient({ chain: mainnet, transport: http() });
  const l1Wallet = createWalletClient({
    account: wallets.evaluatorAccount,
    chain: mainnet,
    transport: http(),
  });
  const basePublic = createPublicClient({
    chain: base,
    transport: http("https://mainnet.base.org"),
  });

  const [l1Bal, baseBal] = await Promise.all([
    l1Public.getBalance({ address: addr }),
    basePublic.getBalance({ address: addr }),
  ]);

  console.log(` * Saldo actual Ethereum L1 : ${formatEther(l1Bal)} ETH`);
  console.log(` * Saldo actual Base L2     : ${formatEther(baseBal)} ETH`);

  if (baseBal < parseEther("0.001") && l1Bal >= parseEther("0.002")) {
    const gasPrice = await l1Public.getGasPrice();
    const maxFeePerGas = (gasPrice * 135n) / 100n;
    const maxPriorityFeePerGas = gasPrice / 5n;
    const gasLimitL1 = 140000n;
    const gasReserve = gasLimitL1 * maxFeePerGas + parseEther("0.00003");
    const amountToBridge = l1Bal - gasReserve;

    console.log(
      `\n[1/2] Cruzando ${formatEther(amountToBridge)} ETH de Ethereum L1 -> Base Mainnet vía Base Portal oficial...`
    );

    const txHash = await l1Wallet.writeContract({
      address: BASE_PORTAL_L1,
      abi: PORTAL_ABI,
      functionName: "depositTransaction",
      args: [addr, amountToBridge, 100000n, false, "0x"],
      value: amountToBridge,
      gas: gasLimitL1,
      maxFeePerGas,
      maxPriorityFeePerGas,
    });

    console.log(` * Tx Puente L1 enviada : https://etherscan.io/tx/${txHash}`);
    const receipt = await l1Public.waitForTransactionReceipt({ hash: txHash });
    console.log(` * Confirmada en L1 (Bloque #${receipt.blockNumber}, Estado: ${receipt.status})`);
  }

  console.log(`\n[2/2] Esperando acreditación del secuenciador en Base Mainnet (tarda ~1 a 2 minutos)...`);
  for (let attempt = 1; attempt <= 24; attempt++) {
    const currentBaseBal = await basePublic.getBalance({ address: addr });
    console.log(` * Intento #${attempt}: Saldo en Base = ${formatEther(currentBaseBal)} ETH`);
    if (currentBaseBal >= parseEther("0.001")) {
      console.log(`\n ¡Fondos acreditados en Base Mainnet (${formatEther(currentBaseBal)} ETH)!`);
      return;
    }
    await new Promise((r) => setTimeout(r, 8000));
  }
}

main();
