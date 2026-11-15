/**
 * Módulo 1: Pasarela Multi-Moneda + Guardrail Económico de Doble Carril y Descuento por Volumen
 * - Carril Base (USDC, ETH, VIRTUAL): Mínimo 1.00 USDC
 * - Carril Puente Cross-Chain (SOL, USDT Arbitrum): Mínimo 3.00 USDC
 * - Tarifa Escalonada para atraer IAs:
 *     * De 1.00 a 9.99 USDC -> 1.5% (con piso de 0.03 USDC)
 *     * De 10.00 USDC en adelante -> 1.0% (Descuento automático por volumen)
 */

export const SUPPORTED_TOKENS = {
  USDC: {
    symbol: "USDC",
    chain: "Base",
    isCrossChain: false,
    minOrderUsdc: 1.0,
    priceUsd: 1.0,
    swapSpreadPct: 0.0,
    bridgeGasUsd: 0.001,
    aggregator: "Directo (Base Native)",
  },
  ETH: {
    symbol: "ETH",
    chain: "Base",
    isCrossChain: false,
    minOrderUsdc: 1.0,
    priceUsd: 3200.0,
    swapSpreadPct: 0.05,
    bridgeGasUsd: 0.002,
    aggregator: "0x / Uniswap v3 (Base)",
  },
  VIRTUAL: {
    symbol: "VIRTUAL",
    chain: "Base",
    isCrossChain: false,
    minOrderUsdc: 1.0,
    priceUsd: 2.5,
    swapSpreadPct: 0.25,
    bridgeGasUsd: 0.002,
    aggregator: "Aerodrome / 0x (Base)",
  },
  SOL: {
    symbol: "SOL",
    chain: "Solana -> Base",
    isCrossChain: true,
    minOrderUsdc: 3.0, // Carril Cross-Chain exige >= 3.00 USDC
    priceUsd: 180.0,
    swapSpreadPct: 0.15,
    bridgeGasUsd: 0.025,
    aggregator: "LI.FI / Mayan Cross-Chain Solver",
  },
  USDT: {
    symbol: "USDT",
    chain: "Arbitrum -> Base",
    isCrossChain: true,
    minOrderUsdc: 3.0,
    priceUsd: 1.0,
    swapSpreadPct: 0.04,
    bridgeGasUsd: 0.015,
    aggregator: "Across / LI.FI Solver",
  },
};

export const ECONOMIC_RULES = {
  minOrderBaseLaneUsdc: 1.0, // Foco en el grueso del mercado (1 a 3 USDC en Base)
  minOrderCrossChainLaneUsdc: 3.0, // Piso cuando viene desde otra blockchain
  standardFeePct: 1.5, // 1.5% para tickets de 1.00 a 9.99 USDC
  volumeDiscountThresholdUsdc: 10.0, // A partir de 10.00 USDC baja la comisión
  discountedFeePct: 1.0, // 1.0% para animar a las IAs en tickets >= 10 USDC
  minFeeUsdc: 0.03, // Piso mínimo de 0.03 USDC (3 centavos) -> garantiza >80% margen en 1 USDC
  estimatedBaseGasUsdc: 0.002,
  estimatedAiSampleCostUsdc: 0.003,
};

function round6(num) {
  return Math.round(num * 1e6) / 1e6;
}

/**
 * Cotiza la conversión instantánea a USDC aplicando Doble Carril + Descuento a 1% desde 10 USDC.
 */
export function quoteSwapAndEscrow({ tokenSymbol, tokenAmount }) {
  const token = SUPPORTED_TOKENS[tokenSymbol];
  if (!token) {
    return {
      viable: false,
      reason: `Moneda no soportada (${tokenSymbol}). Soportadas: ${Object.keys(SUPPORTED_TOKENS).join(", ")}`,
    };
  }

  const parsedAmount = Number(tokenAmount);
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    return {
      viable: false,
      reason: "El monto debe ser un número mayor a cero.",
    };
  }

  const grossUsd = parsedAmount * token.priceUsd;
  const dexSlippageUsdc = grossUsd * (token.swapSpreadPct / 100);
  const netUsdcLocked = round6(grossUsd - dexSlippageUsdc - token.bridgeGasUsd);

  const requiredMinUsdc = token.minOrderUsdc;

  // Costo operativo fijo de nuestro nodo interventor (0.005 USDC total)
  const auditorOperatingCostUsdc = round6(
    ECONOMIC_RULES.estimatedBaseGasUsdc + ECONOMIC_RULES.estimatedAiSampleCostUsdc
  );

  // Determinar tramo tarifario (1.5% estándar vs 1.0% desde 10 USDC)
  const volumeDiscountApplied = netUsdcLocked >= ECONOMIC_RULES.volumeDiscountThresholdUsdc;
  const appliedFeePct = volumeDiscountApplied
    ? ECONOMIC_RULES.discountedFeePct
    : ECONOMIC_RULES.standardFeePct;

  const rawFee = netUsdcLocked * (appliedFeePct / 100);
  const protocolFeeUsdc = round6(Math.max(rawFee, ECONOMIC_RULES.minFeeUsdc));
  const auditorNetProfitUsdc = round6(protocolFeeUsdc - auditorOperatingCostUsdc);
  const sellerPayoutIfApprovedUsdc = round6(netUsdcLocked - protocolFeeUsdc);

  // Guardrail 1: Piso por carril (1.00 USDC en Base, 3.00 USDC en Cross-Chain)
  if (netUsdcLocked < requiredMinUsdc) {
    const laneName = token.isCrossChain ? "Carril Puente Externo" : "Carril Rápido Base";
    return {
      viable: false,
      code: "BELOW_MIN_TICKET",
      reason: `Guardrail Económico (${laneName}): El valor neto convertido (${netUsdcLocked.toFixed(4)} USDC) es menor al mínimo de ${requiredMinUsdc.toFixed(2)} USDC para ${tokenSymbol}.`,
      metrics: {
        inputToken: tokenSymbol,
        lane: laneName,
        inputAmount: parsedAmount,
        grossUsd: round6(grossUsd),
        netUsdcLocked,
        minRequiredUsdc: requiredMinUsdc,
        auditorOperatingCostUsdc,
      },
    };
  }

  if (auditorNetProfitUsdc <= 0 || sellerPayoutIfApprovedUsdc <= 0) {
    return {
      viable: false,
      code: "NEGATIVE_MARGIN",
      reason: "Operación rechazada: margen neto negativo tras costos operativos.",
    };
  }

  const profitMarginPct = round6((auditorNetProfitUsdc / protocolFeeUsdc) * 100);

  return {
    viable: true,
    route: {
      fromToken: tokenSymbol,
      fromChain: token.chain,
      isCrossChain: token.isCrossChain,
      toToken: "USDC",
      toChain: "Base",
      aggregator: token.aggregator,
      inputAmount: parsedAmount,
      tokenPriceUsd: token.priceUsd,
      grossUsd: round6(grossUsd),
      dexSlippageUsdc: round6(dexSlippageUsdc),
      bridgeGasUsdc: token.bridgeGasUsd,
    },
    escrowBreakdown: {
      usdcLockedInContract: netUsdcLocked,
      appliedFeePct,
      volumeDiscountApplied,
      protocolFeeUsdc,
      sellerPayoutIfApprovedUsdc,
      auditorOperatingCostUsdc,
      auditorNetProfitUsdc,
      auditorProfitMarginPct: profitMarginPct,
    },
  };
}
