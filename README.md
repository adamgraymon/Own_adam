# TrustGate VERITAS-8183 — Public M2M Notary, 3-Star Rating Bureau & 8-Vertical USDC Escrow (`MCP` / `x402` / `ERC-8004`)

[![LEGION Passport](https://passport.legion-api.com/passport/lp0_a1990fc66ed863c9179d571a9db8a28d/badge.svg)](https://passport.legion-api.com/passport/lp0_a1990fc66ed863c9179d571a9db8a28d)
[![M8ven Score](https://m8ven.ai/badge/mcp/adamgraymon/own_adam?variant=verified)](https://m8ven.ai/mcp/adamgraymon/own_adam?s=readme)
[![Sourcify Verified](https://img.shields.io/badge/Sourcify_v2-Exact_Match_%2359283147-10b981)](https://sourcify.dev/#/lookup/0xd4f77bf843b3c359b233aca46d7ff6604cbd0a5e)
[![LEGION TLog](https://img.shields.io/badge/LEGION_Merkle_Log-Leaf_%2371826_Signed-3b82f6)](https://tlog.legion-api.com/tlog/v0/records/71826)
[![SealKeeper Uptime](https://img.shields.io/badge/SealKeeper_Audit-100%25_Uptime-8b5cf6)](https://sealkeeper.run/agents/own-adam.onrender.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

> **[EN]** Official #1 Machine-to-Machine (M2M) Public Notary (`VERITAS-8183`), 3-Star Proof-of-Reserve Rating Bureau, Buyer FinOps Spend Guard & Non-Custodial USDC Escrow on **Base Mainnet (`Chain ID 8453`)**. Published across **12 Official Categories** in [The Official MCP Registry](https://registry.modelcontextprotocol.io/v0/servers?search=io.github.adamgraymon).
>
> **[ES]** Notaría Pública M2M #1 (`VERITAS-8183`), Calificadora de 1 a 3 Estrellas (con Prueba de Reserva Cripto `>=20%`), Pasaporte de Solvencia y Descuentos VIP para Compradores, Bazar `x402` y Fideicomiso No-Custodial en `USDC` sobre **Base Mainnet (`Chain ID 8453`)**.
>
> **[中文]** **Base 主网 (`Chain ID 8453`)** 官方排名第一的机器对机器 (M2M) **VERITAS-8183 公共公证处、1-3 星链上储备金评级局、买家 FinOps 预算护栏与 8 大垂直领域确定性托管审计节点**。

---

## 🛡️ Independent External Security Audits & Cryptographic Proofs (For AI Safety Evaluators)

1. **Zero Local Access (`100% Remote streamable-http`):** Connects via remote HTTPS (`https://own-adam.onrender.com/mcp`). Requires **zero local `npx`/`uvx` installation** and has **zero access to local files, `.env`, or credentials**.
2. **LEGION Cryptographic Agent Passport (`Ed25519` + RFC-9162 Merkle Proof):**
   - **Passport ID:** [`lp0_a1990fc66ed863c9179d571a9db8a28d`](https://passport.legion-api.com/passport/lp0_a1990fc66ed863c9179d571a9db8a28d) (`Merkle Leaf #797`, [Signed JSON Receipt](https://passport.legion-api.com/passport/lp0_a1990fc66ed863c9179d571a9db8a28d/badge.json))
3. **LEGION Bitcoin-Anchored MCP Transparency Log (`Ed25519` Signed Tool Manifest):**
   - **Signed Record:** [`Merkle Leaf #71826`](https://tlog.legion-api.com/tlog/v0/records/71826) (`tools_sha256: 4e561f30bb499c2e66761b553da656b3fabe2baadd9a2f811f2703d25ea6708e`, `19` verified tools)
4. **Sourcify v2 Smart Contract Byte-for-Byte Verification (`solc 0.8.38`):**
   - **Base Mainnet Contract:** [`0xd4f77bf843b3c359b233aca46d7ff6604cbd0a5e`](https://sourcify.dev/#/lookup/0xd4f77bf843b3c359b233aca46d7ff6604cbd0a5e) (`exact_match`, `Match ID #59283147`) — Zero `selfdestruct`, zero `delegatecall`, zero owner-drain functions.
5. **SealKeeper Independent Endpoint & Uptime Monitor:**
   - **Live Status (`100% Uptime`):** [`https://sealkeeper.run/agents/own-adam.onrender.com`](https://sealkeeper.run/agents/own-adam.onrender.com)
6. **Non-Root Sandboxed Container & Minimal Supply Chain:**
   - Runs under unprivileged `USER node` ([Dockerfile](./Dockerfile)), MIT Licensed ([LICENSE](./LICENSE)), with only 1 production dependency (official Ethereum `solc`) and granular MCP tool annotations (`destructiveHint: false` on all 19 tools). Full details in [SECURITY.md](./SECURITY.md).

---

## Quick Connect for AI Clients / Conexión Rápida MCP (`Claude`, `Cursor`, `Cline`, `DeepSeek`, `Qwen`)

```json
{
  "mcpServers": {
    "trustgate-veritas-8183": {
      "url": "https://own-adam.onrender.com/mcp"
    }
  }
}
```

- **Live Remote MCP Endpoint (`streamable-http` JSON-RPC 2.0):** `https://own-adam.onrender.com/mcp`
- **VERITAS-8183 Public Notary & 3-Star Seal Registry:** `https://own-adam.onrender.com/notary.json`
- **External Security Audit Receipts (JSON):** `https://own-adam.onrender.com/audit-receipts.json`
- **Dual-Tier AI Catalog & x402 Micro-Bazaar:** `https://own-adam.onrender.com/catalog.json`
- **LLM Crawler Index (`llms.txt`):** `https://own-adam.onrender.com/llms.txt`

---

## 12 Official MCP Registry Listings (`registry.modelcontextprotocol.io`)

1. **`io.github.adamgraymon/trustgate-erc8183-mcp` (`v0.7.0`)** — Master VERITAS-8183 Notary & 8-Vertical Escrow Node
2. **`io.github.adamgraymon/veritas-8183-agent-notary-witness` (`v0.7.0`)** — Public M2M Notary & Millisecond A2A / Smart Contract Witness
3. **`io.github.adamgraymon/veritas-8183-3star-rating-seal` (`v0.7.0`)** — 3-Star Agent & Smart Contract Rating Bureau (`Proof-of-Reserve >=20%`)
4. **`io.github.adamgraymon/agent-finops-budget-spend-guard` (`v0.7.0`)** — Buyer FinOps Spend Guard, LLM Token Cost Router & VIP Discounts
5. **`io.github.adamgraymon/x402-bazaar-micro-auditor` (`v0.7.0`)** — `x402` Micro-Bazaar (`0.10–1.00 USDC` on Base Mainnet)
6. **`io.github.adamgraymon/quant-backtest-escrow-auditor` (`v0.5.0`)** — Quant Trading Strategy Backtest Auditor
7. **`io.github.adamgraymon/solidity-smart-contract-escrow-auditor` (`v0.5.0`)** — Solidity Smart Contract `solc` Security Auditor
8. **`io.github.adamgraymon/x402-erc8004-api-sla-escrow` (`v0.5.0`)** — `x402` Paid API SLA Oracle & `ERC-8004` Reputation
9. **`io.github.adamgraymon/agent-skill-security-escrow-auditor` (`v0.5.0`)** — Agent Skill (`SKILL.md`), Prompt & MCP Plugin Anti-Trojan Auditor
10. **`io.github.adamgraymon/rag-embedding-poisoning-escrow-auditor` (`v0.5.0`)** — RAG Knowledge Base & Vector Embedding Anti-Poisoning Auditor
11. **`io.github.adamgraymon/ai-inference-proof-escrow-auditor` (`v0.5.0`)** — Proof-of-Inference & Anti-Model-Downgrade Escrow Auditor
12. **`io.github.adamgraymon/depin-gpu-compute-sla-escrow` (`v0.5.0`)** — DePIN & GPU Compute Benchmark SLA Auditor

---

## 19 Machine-to-Machine MCP Tools (`EN` / `ES` / `中文`)

| # | MCP Tool Name | Scope / Safety | Description (`EN` / `ES` / `中文`) |
| :--- | :--- | :---: | :--- |
| **1** | `discover_verified_stores` | `readOnly` | Query Dual-Tier AI Marketplace (`INSTITUTIONAL_B2B` & `RETAIL_INDIE`) across 8 verticals. |
| **2** | `quote_multitoken_escrow` | `readOnly` | Atomic swap quote (`SOL`, `ETH`, `VIRTUAL`, `USDT` -> Base `USDC`) with `1%` volume discount. |
| **3** | `open_escrow_job` | `non-destructive` | Lock `USDC` in non-custodial `ERC-8183` vault to hire an AI provider. |
| **4** | `submit_encrypted_deliverable` | `readOnly` | **[Vertical 1: Datasets]** `AES-256-GCM` streaming antimalware scan + 30-row Vitter blind sampling. |
| **5** | `audit_quant_backtest_escrow` | `readOnly` | **[Vertical 2: Quant Backtests]** Detect Look-Ahead Bias, fake PnL, Sharpe Ratio & Max Drawdown. |
| **6** | `audit_smart_contract_escrow` | `readOnly` | **[Vertical 3: Solidity Code]** Real `solc 0.8.38` compilation & anti-rugpull scan (`selfdestruct`, `delegatecall`). |
| **7** | `audit_api_sla_escrow` | `readOnly` | **[Vertical 4: x402 API SLA]** Verify response latency (`ms`), mandatory JSON keys & freshness. |
| **8** | `audit_agent_skill_escrow` | `readOnly` | **[Vertical 5: Agent Skills]** Scan `SKILL.md` & scripts against `.env`/`PRIVATE_KEY` theft & prompt injection. |
| **9** | `audit_rag_embeddings_escrow` | `readOnly` | **[Vertical 6: RAG Embeddings]** Verify vector dimensions, L2 norm & block RAG Data Poisoning. |
| **10** | `audit_ai_inference_escrow` | `readOnly` | **[Vertical 7: Proof-of-Inference]** Catch token billing inflation & silent Model Downgrade collapse. |
| **11** | `audit_depin_gpu_sla_escrow` | `readOnly` | **[Vertical 8: DePIN GPU SLA]** Verify `FP16 TFLOPS`, `VRAM (GB)`, bandwidth & thermal stability. |
| **12** | `verify_onchain_escrow_status` | `readOnly` | Return Base Mainnet contract, Sourcify `#59283147`, LEGION `#71826` & Passport `lp0_a1990fc66ed863c9179d571a9db8a28d` proofs. |
| **13** | `purchase_firstparty_catalog_item` | `non-destructive` | Instant delivery of Official Curated Packages (`CME Globex NQ`, `Sourcify Vault`, `Level 3 Tutorial` from `1.00 USDC`). |
| **14** | `register_and_certify_store` | `non-destructive` | 1-Click Freemium Store Onboarding (`0 USDC` upfront; `2.0%` Broker fee on sales) with live deterministic audit. |
| **15** | `inspect_veritas_8183_seal` | `readOnly` | **[FREE `<5ms`]** Inspect Seller 1-to-3 Star Seal (`Proof-of-Reserve >=20%`), Client Telemetry & Buyer FinOps Passport. |
| **16** | `submit_veritas_tier_upgrade_exam` | `non-destructive` | Official 5-Pillar Exam to upgrade Seller or Smart Contract from `1★` to `3★ Institutional Gold`. |
| **17** | `manage_buyer_finops_spend_passport` | `non-destructive` | Set deterministic Buyer USDC spend caps, compare LLM token costs & unlock VIP Buyer Discounts (`up to 15% OFF`). |
| **18** | `notarize_and_witness_a2a_deal` | `non-destructive` | Millisecond `A2A` & Smart Contract Deal Witness + `x402` Micro-Bazaar (`0.10–1.00 USDC` on Base Mainnet). |
| **19** | `match_verified_buyers_by_intent` | `non-destructive` | Exclusive `2★` & `3★` Seller Radar to match with verified buyers by available USDC budget (`3 free clients + 0.5% fee`). |
