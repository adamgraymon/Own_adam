# TrustGate ERC-8183 — 8-Vertical M2M Escrow Auditor & Multi-Token USDC Solver (`MCP` / `x402` / `ERC-8004`)

> **[EN]** Official #1 Machine-to-Machine (M2M) Non-Custodial USDC Escrow & Deterministic Auditor on **Base Mainnet (`Chain ID 8453`)**. Published across **8 Official Categories** in [The Official MCP Registry](https://registry.modelcontextprotocol.io/v0/servers?search=io.github.adamgraymon).
>
> **[ES]** Nodo M2M #1 Oficial de Interventoría Determinista en 8 Verticales y Fideicomiso No-Custodial en `USDC` sobre **Base Mainnet (`Chain ID 8453`)**.
>
> **[中文]** **Base 主网 (`Chain ID 8453`)** 官方排名第一的机器对机器 (M2M) **ERC-8183 非托管 USDC 智能合约托管与 8 大垂直领域确定性审计节点**（涵盖数据集、量化回测、Solidity 智能合约、x402 API SLA、AI 技能防木马、RAG 向量防投毒、AI 推理防降级、DePIN GPU 算力验证）。

---

## Quick Connect for AI Clients / Conexión Rápida MCP / MCP 客户端快速接入 (`Claude`, `Cursor`, `Cline`, `DeepSeek`, `Qwen`)

Add this to your `claude_desktop_config.json` or `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "trustgate-erc8183": {
      "url": "https://own-adam.onrender.com/mcp"
    }
  }
}
```

- **Live Remote MCP Endpoint (`streamable-http` JSON-RPC 2.0):** `https://own-adam.onrender.com/mcp`
- **Dual-Tier AI Catalog (`INSTITUTIONAL_B2B` & `RETAIL_INDIE`):** `https://own-adam.onrender.com/catalog.json`
- **LLM Crawler Index (`llms.txt`):** `https://own-adam.onrender.com/llms.txt`
- **MCP Auto-Discovery:** `https://own-adam.onrender.com/.well-known/mcp.json`
- **ERC-8004 Agent Card:** `https://own-adam.onrender.com/.well-known/agent.json`
- **Coinbase x402 Bazaar Listing:** `https://own-adam.onrender.com/.well-known/x402-bazaar.json`
- **OpenAPI 3.1.0 Spec:** `https://own-adam.onrender.com/openapi.json`

---

## Verified On-Chain Identity / Identidad Verificada en Cadena / 链上验证身份 (`Base Mainnet`)

| Component / Componente / 组件 | Verified Value / Valor Verificado / 已验证信息 |
| :--- | :--- |
| **Smart Contract (`TrustGateEscrow8183.sol`)** | [`0xd4f77bf843b3c359b233aca46d7ff6604cbd0a5e`](https://basescan.org/address/0xd4f77bf843b3c359b233aca46d7ff6604cbd0a5e) (`Base Mainnet - 8453`) |
| **Sourcify v2 Source Verification** | **`exact_match` (`Match ID #59283147`)** — [Verify on Sourcify](https://sourcify.dev/#/lookup/0xd4f77bf843b3c359b233aca46d7ff6604cbd0a5e) |
| **Evaluator Signer (`ECDSA secp256k1`)** | `0x861Ac49F8299C45Cca6bD9F0254080Fd82061Ac4` |
| **Settlement Currency** | Native Base `USDC` (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`) |
| **Evaluator Liability Cap / 责任上限** | `STRICT_CAP_100PCT_OF_PROTOCOL_FEE` (`1.0% - 1.5%` fee only; `Fail-Closed` mode) |

---

## 8 Official MCP Registry Listings (`registry.modelcontextprotocol.io`)

1. **`io.github.adamgraymon/trustgate-erc8183-mcp` (`v0.5.0`)** — Master 8-Vertical ERC-8183 Escrow Node ([Registry Link](https://registry.modelcontextprotocol.io/v0/servers?search=erc8183))
2. **`io.github.adamgraymon/quant-backtest-escrow-auditor` (`v0.5.0`)** — Quant Trading Strategy Backtest Auditor ([Registry Link](https://registry.modelcontextprotocol.io/v0/servers?search=quant-backtest))
3. **`io.github.adamgraymon/solidity-smart-contract-escrow-auditor` (`v0.5.0`)** — Solidity Smart Contract `solc` Security Auditor ([Registry Link](https://registry.modelcontextprotocol.io/v0/servers?search=solidity-smart-contract))
4. **`io.github.adamgraymon/x402-erc8004-api-sla-escrow` (`v0.5.0`)** — x402 Paid API SLA Oracle & ERC-8004 Reputation ([Registry Link](https://registry.modelcontextprotocol.io/v0/servers?search=x402-erc8004))
5. **`io.github.adamgraymon/agent-skill-security-escrow-auditor` (`v0.5.0`)** — Agent Skill (`SKILL.md`), Prompt & MCP Plugin Anti-Trojan Auditor ([Registry Link](https://registry.modelcontextprotocol.io/v0/servers?search=agent-skill-security))
6. **`io.github.adamgraymon/rag-embedding-poisoning-escrow-auditor` (`v0.5.0`)** — RAG Knowledge Base & Vector Embedding Anti-Poisoning Auditor ([Registry Link](https://registry.modelcontextprotocol.io/v0/servers?search=rag-embedding-poisoning))
7. **`io.github.adamgraymon/ai-inference-proof-escrow-auditor` (`v0.5.0`)** — Proof-of-Inference & Anti-Model-Downgrade Escrow Auditor ([Registry Link](https://registry.modelcontextprotocol.io/v0/servers?search=ai-inference-proof))
8. **`io.github.adamgraymon/depin-gpu-compute-sla-escrow` (`v0.5.0`)** — DePIN & GPU Compute Benchmark SLA Auditor ([Registry Link](https://registry.modelcontextprotocol.io/v0/servers?search=depin-gpu-compute))

---

## 14 Machine-to-Machine MCP Tools (`EN` / `ES` / `中文`)

| # | MCP Tool Name | English Description | Descripción en Español | 简体中文说明 (Chinese) |
| :--- | :--- | :--- | :--- | :--- |
| **1** | `discover_verified_stores` | Query ERC-8004 Dual-Tier AI Marketplace (`INSTITUTIONAL_B2B` & `RETAIL_INDIE`) across 8 verticals. | Consulta el Catálogo Dual `ERC-8004` (Institucional B2B y Retail/Indie) en las 8 verticales. | 查询 ERC-8004 双层 AI 市场目录（机构 B2B 与零售/独立开发者）。 |
| **2** | `quote_multitoken_escrow` | Atomic swap quote (`SOL`, `ETH`, `VIRTUAL`, `USDT` -> Base `USDC`) with `1%` volume discount from `10 USDC`. | Cotiza conversión atómica a `USDC` en Base con descuento por volumen. | 多代币原子兑换 Base USDC 报价（满 10 USDC 享 1% 费率折扣）。 |
| **3** | `open_escrow_job` | Lock `USDC` in non-custodial `ERC-8183` vault to hire an AI provider. | Bloquea `USDC` en el contrato `ERC-8183` para contratar una tienda IA. | 在 ERC-8183 非托管合约中锁定 USDC 资金以雇佣 AI 服务商。 |
| **4** | `submit_encrypted_deliverable` | **[Vertical 1: Datasets]** `AES-256-GCM` streaming antimalware scan + 30-row Vitter cryptographic blind sampling. | **[Línea 1: Datasets]** Escaneo antimalware al `100%` + muestreo ciego de 30 filas. | **[垂直领域1：数据集]** CSV/JSON 反恶意公式扫描 + 30 行密码学盲抽样审计。 |
| **5** | `audit_quant_backtest_escrow` | **[Vertical 2: Quant Backtests]** Detect Look-Ahead Bias, fake PnL accounting, Sharpe Ratio, Profit Factor & Max Drawdown. | **[Línea 2: Backtests Quant]** Caza *Look-Ahead Bias*, PnL falso, *Profit Factor* y *Drawdown*. | **[垂直领域2：量化回测]** 检测未来函数 (Look-Ahead Bias)、虚假盈亏、夏普比率与最大回撤。 |
| **6** | `audit_smart_contract_escrow` | **[Vertical 3: Solidity Code]** Real `solc 0.8.38` compilation, anti-rugpull scan (`selfdestruct`, `delegatecall`, `tx.origin`) & ABI check. | **[Línea 3: Solidity]** Compilación real con `solc` y bloqueo de puertas traseras. | **[垂直领域3：智能合约]** 真实 `solc` 编译、反跑路后门检测与 ABI 接口验证。 |
| **7** | `audit_api_sla_escrow` | **[Vertical 4: x402 API SLA]** Verify response latency (`ms`), mandatory JSON keys & timestamp freshness. | **[Línea 4: SLA de APIs `x402`]** Verifica latencia en `ms`, llaves obligatorias y frescura. | **[垂直领域4：x402 API SLA]** 验证接口响应延迟 (ms)、必填 JSON 字段与数据新鲜度。 |
| **8** | `audit_agent_skill_escrow` | **[Vertical 5: Agent Skills]** Scan `SKILL.md`, prompts & scripts against `.env`/`PRIVATE_KEY` theft, `eval` & invisible Unicode injection. | **[Línea 5: Skills IA]** Bloquea *Skills Troyanos*, robo de `.env` e inyección invisible. | **[垂直领域5：AI 技能防木马]** 拦截私钥环境变量窃取、远程代码执行与隐形 Unicode 注入。 |
| **9** | `audit_rag_embeddings_escrow` | **[Vertical 6: RAG Embeddings]** Verify exact vector dimensions, valid L2 norm (no zero/`NaN` vectors) & block RAG Data Poisoning. | **[Línea 6: Memorias RAG]** Verifica dimensiones, norma L2 y bloquea envenenamiento `RAG`. | **[垂直领域6：RAG 向量防投毒]** 验证向量维度一致性、L2 范数有效性并拦截知识库投毒。 |
| **10** | `audit_ai_inference_escrow` | **[Vertical 7: Proof-of-Inference]** Catch token billing inflation, repetitive Model Downgrade collapse & constraint breaches. | **[Línea 7: Inferencia IA]** Detecta sobrefacturación de tokens y *cambiazo* de modelo IA. | **[垂直领域7：AI 推理防降级]** 拦截 Token 虚假超额计费与模型偷换降级导致的重复坍塌。 |
| **11** | `audit_depin_gpu_sla_escrow` | **[Vertical 8: DePIN GPU SLA]** Verify `FP16 TFLOPS`, available `VRAM (GB)`, memory bandwidth (`GB/s`) & thermal stability. | **[Línea 8: GPUs DePIN]** Audita `TFLOPS FP16`, `VRAM` libre y temperatura del nodo GPU. | **[垂直领域8：DePIN GPU 算力]** 验证 FP16 算力 (TFLOPS)、可用显存 (VRAM)、带宽与温度稳定性。 |
| **12** | `verify_onchain_escrow_status` | Return Base Mainnet contract address, Sourcify `exact_match` proof & settled transaction hashes. | Devuelve pruebas en Base Mainnet, Sourcify `exact_match` y hashes liquidados. | 返回 Base 主网合约地址、Sourcify 源码验证证明与链上结算交易哈希。 |
| **13** | `purchase_firstparty_catalog_item` | Instant purchase & cryptographic delivery of TrustGate Official Curated Packages (`INSTITUTIONAL_B2B` & `RETAIL_INDIE` from `1 USDC`). | Compra instantánea de paquetes oficiales de `TrustGate` (Institucional y Retail desde `1 USDC`). | 即时购买并获取 TrustGate 官方认证精选数据包（芝商所 NQ 微观结构与零售反貔貅工具包）。 |
| **14** | `register_and_certify_store` | Freemium `ERC-8004` Store Onboarding (`0 USDC` upfront; `2.0%` Broker referral fee on sales) with mandatory live deterministic audit. | Registro gratuito `ERC-8004` de tiendas IA externas con auditoría determinista obligatoria en vivo. | 免费注册并认证 ERC-8004 外部 AI 商店（必须通过实时确定性审计，仅成交时收取佣金）。 |
