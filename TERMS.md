# VERITAS / TrustGate — Escrow, Reserve Liquidity & Star Seal Terms · Términos de Escrow y Reserva · 托管与储备金条款 (v1.0.0)

> Language precedence: the English text is authoritative. The Spanish text is an official translation. The Simplified Chinese text is a reference translation for convenience only; in case of any difference or ambiguity, the English version prevails.
>
> Prevalencia de idiomas: el texto en inglés es el que rige. El texto en español es una traducción oficial. El texto en chino simplificado es solo una traducción de referencia; ante cualquier diferencia o ambigüedad, prevalece la versión en inglés.
>
> 【语言说明】中文版本仅为便于阅读的参考翻译。如中文与英文或西班牙文版本存在任何差异或歧义，以英文版本为准（西班牙文版本为正式译本）。

## 1. Two-Layer Smart Contract Architecture · Arquitectura de Dos Contratos
- **Per-Job Escrow (`TrustGateEscrow8183` — `0xd4f77bf843b3c359b233aca46d7ff6604cbd0a5e`, Sourcify `#59283147`)**: Holds 100% of the buyer's USDC for an individual job until the deterministic audit approves the deliverable or the timeout Deadman Switch refunds 100% to the buyer.
- **Seller Refundable Reserve Vault (`VeritasRefundableReserveVault` — `contracts/VeritasRefundableReserveVault.sol`, `solc 0.8.38`)**: Non-custodial refundable reserve vault for 2-Star and 3-Star sellers. Sellers can deposit USDC to prove refund liquidity and withdraw 100% of their unlocked reserve at any time without permission whenever they have no active claims.

## 2. Tiered Liquidity & Star Rating Rules · Reglas de Liquidez por Nivel de Estrellas
- **0★ Unclaimed (`C · Unclaimed`)**: Unclaimed third-party evaluations are capped until the publisher claims the store for free via register_and_certify_store.
- **1★ Verified Seller (`0 USDC` reserve)**: 0 USDC reserve required upfront. Buyer payments are protected 100% 1-to-1 inside the per-job TrustGateEscrow8183 smart contract.
- **2★ Certified SLA (`max(10 USDC, 1x startingPriceUsdc)`)**: Proves active wallet liquidity to cover at least 1 immediate SLA dispute.
- **3★ Gold — Indie / Retail (`max(25 USDC, 3x startingPriceUsdc, 20% of active monthly volume)`)**: Guarantees liquidity to cover at least 3 full refunds and 20% of active volume.
- **3★ Gold — Institutional B2B (`max(200 USDC, 3x startingPriceUsdc, 20% of active monthly volume)`)**: Enterprise solvency reserve required by Institutional B2B buyer FinOps Spend Passports.

## 3. Free Seller Liquidity Withdrawal Policy · Política de Retiro Libre de Liquidez
**[EN]** Your reserve is ALWAYS your money. Whether held in your public reserve wallet or in VeritasRefundableReserveVault (withdrawReserve), you may withdraw 100% of your unlocked funds at any time without permission when you have no open claims (activeClaimsCount == 0). If your reserve drops below the 2-Star or 3-Star threshold during a slow sales period, your store simply adjusts automatically to 1-Star (per-job escrow protection remains active) and restores 3-Star Gold status as soon as you replenish your reserve.

**[ES]** Tu reserva es SIEMPRE tu dinero. Ya sea en tu billetera pública de reserva o en VeritasRefundableReserveVault (withdrawReserve), puedes retirar el 100% de tus fondos disponibles en cualquier momento y sin pedir permiso cuando no tengas reclamos abiertos (activeClaimsCount == 0). Si tu reserva baja del umbral de 2★ o 3★ durante una temporada de pocas ventas, tu tienda simplemente pasa automáticamente a 1★ (la protección de escrow por trabajo sigue activa) y recupera las 3★ Oro apenas vuelvas a depositar tu reserva.

**[中文]** 您的储备金始终属于您自己。无论是存放在您的公开储备钱包中，还是存放在 VeritasRefundableReserveVault（通过 withdrawReserve）中，只要没有未决索赔（activeClaimsCount == 0），您都可以随时无须许可提取 100% 的未锁定资金。如果在销售淡季您的储备金低于 2 星或 3 星门槛，您的店铺会自动调整为 1 星（单笔订单托管保护仍然有效），并在您补充储备金后立即恢复 3 星金牌状态。

_【语言说明】中文版本仅为便于阅读的参考翻译。如中文与英文或西班牙文版本存在任何差异或歧义，以英文版本为准（西班牙文版本为正式译本）。_

## 4. Audit Scope & Liability · Alcance de Auditoría y Responsabilidad
**[EN]** VERITAS-8183 and TrustGate execute deterministic technical audits (static AST, solc 0.8.38 compilation, Vitter cryptographic sampling, L2 vector checks and live MCP probes). Verdicts and star seals are technical assessments at a point in time, not an unlimited financial insurance policy. Buyer refund protection is bounded by (a) 100% of the job funds locked in TrustGateEscrow8183 prior to settlement, and (b) the seller's verifiable available reserve in VeritasRefundableReserveVault.

**[ES]** VERITAS-8183 y TrustGate ejecutan auditorías técnicas deterministas (AST estático, compilación solc 0.8.38, muestreo criptográfico Vitter, chequeo vectorial L2 y sondas MCP en vivo). Los veredictos y sellos de estrellas son dictámenes técnicos puntuales, no una póliza de seguro financiero ilimitado. La protección de reembolso al comprador está respaldada por (a) el 100% de los fondos del trabajo bloqueados en TrustGateEscrow8183 antes de la liquidación, y (b) la reserva disponible verificable del vendedor en VeritasRefundableReserveVault.

**[中文]** VERITAS-8183 与 TrustGate 执行确定性技术审计（静态 AST、solc 0.8.38 编译、Vitter 加密抽样、L2 向量检查与实时 MCP 探测）。审计结论与星级印章仅代表特定时间点的技术评估，而非无限额金融保险单。买家退款保障的范围以 (a) 结算前锁定在 TrustGateEscrow8183 中的 100% 订单资金，以及 (b) 卖家在 VeritasRefundableReserveVault 中可验证的可用储备金为限。
