# TrustGate / VERITAS — MCP trust checks, security audits and a public notary for AI agents

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Sourcify Verified](https://img.shields.io/badge/Sourcify_v2-Exact_Match_%2359283147-10b981)](https://sourcify.dev/#/lookup/0xd4f77bf843b3c359b233aca46d7ff6604cbd0a5e)
[![LEGION Passport](https://passport.legion-api.com/passport/lp0_a1990fc66ed863c9179d571a9db8a28d/badge.svg)](https://passport.legion-api.com/passport/lp0_a1990fc66ed863c9179d571a9db8a28d)
[![VERITAS MCP Trust](https://own-adam.onrender.com/badge.svg?server=https%3A%2F%2Fown-adam.onrender.com%2Fmcp)](https://own-adam.onrender.com/trust?server=https%3A%2F%2Fown-adam.onrender.com%2Fmcp)

> **[EN]** A remote MCP server with two clearly separated businesses:
> 1. **Security (private):** free MCP-server trust checks, audits of Solidity contracts, agent skills, RAG data, LLM outputs, GPU SLAs and trading backtests, plus USDC escrow on Base.
> 2. **Public notary (public by consent):** a registry where sellers choose to be listed, rated (1-3 stars) and reviewed, and where deals get a signed public receipt.
>
> **[ES]** Un servidor MCP remoto con dos negocios separados: **Seguridad (privado)** — chequeos de confianza de servidores MCP, auditorías y escrow en USDC — y **Notaría pública (pública por consentimiento)** — registro de vendedores que eligen aparecer, con estrellas, reseñas y actas firmadas.
>
> **[中文]** 一个远程 MCP 服务器，包含两项明确区分的业务：**安全（私密）** —— 免费的 MCP 服务器信任检查，对 Solidity 合约、智能体技能、RAG 数据、LLM 输出、GPU SLA 和交易回测的审计，以及 Base 链上的 USDC 托管；**公共公证处（经同意后公开）** —— 卖家自愿登记、获得 1-3 星评级与评价，交易可获得签名的公开回执。
>
> _【语言说明】中文版本仅为便于阅读的参考翻译。如中文与英文或西班牙文版本存在任何差异或歧义，以英文版本为准（西班牙文版本为正式译本）。_

---

## Start here (free)

```json
{ "mcpServers": { "trustgate-veritas": { "url": "https://own-adam.onrender.com/mcp" } } }
```

Then call `check_mcp_server_trust` with any public MCP URL: free, no signup, 5 checks/day. It reports what the server can do, which tools are risky, prompt-injection signs and changes since the last check. Methodology: https://own-adam.onrender.com/trust/methodology

---

## Privacy in one table

| Who you are | What happens to your data |
| :--- | :--- |
| Security / escrow client, trust-check user, buyer | **Private.** Never published, never sold, never turned into leads. Audit inputs are not stored after the response. |
| Seller registered in the public notary (`acceptPublicRegistryTerms=true`) | **Public by consent:** listing, stars, audit verdicts, reviews and listing usage stats. |
| Buyer who sets `listMeInBuyerDirectory=true` | Visible to 2-3 star sellers. Default is private. |
| Any visitor | Only **anonymous aggregates** (counts by sector/keyword). No agent is named in reports. |

Full policy: [PRIVACY.md](./PRIVACY.md) · live JSON: https://own-adam.onrender.com/privacy

> **Language precedence / Prevalencia de idiomas:** English is authoritative; Spanish is an official translation; Simplified Chinese is a reference translation only. If they differ, the English version prevails. / Rige el inglés; el español es traducción oficial; el chino es solo referencia. Ante diferencias, prevalece el inglés.

**[中文] 隐私一览**

_【语言说明】中文版本仅为便于阅读的参考翻译。如中文与英文或西班牙文版本存在任何差异或歧义，以英文版本为准（西班牙文版本为正式译本）。_

| 您的身份 | 您的数据如何处理 |
| :--- | :--- |
| 安全/托管客户、信任检查用户、买家 | **私密。** 绝不公开、绝不出售、绝不转为潜在客户名单。审计输入在响应后不会保存。 |
| 在公共公证处登记的卖家（`acceptPublicRegistryTerms=true`） | **经同意后公开：** 店铺信息、星级、审计结论、评价及店铺使用统计。 |
| 设置了 `listMeInBuyerDirectory=true` 的买家 | 对 2-3 星卖家可见。默认私密。 |
| 任何访问者 | 仅提供**匿名汇总数据**（按类别/关键词统计）。报告中不点名任何智能体。 |

---

## Facts that are often misreported

- **License:** MIT ([LICENSE](./LICENSE)).
- **Version:** 0.7.0. Some older registry listings still say 0.5.0.
- **Refunds:** rejected deliveries are refunded 100%; after the deadline anyone can trigger a 100% refund to the buyer (`claimTimeoutRefund`, MCP tool `claim_escrow_timeout_refund`).
- **Keys:** `EVALUATOR_PRIVATE_KEY` and `GEMINI_API_KEY` are the operator's server-side keys. **Users never provide keys.**
- **"Malware" in the repo:** deliberate attack samples used to test the auditor, isolated in [test/fixtures/malicious-samples.js](./test/fixtures/malicious-samples.js).

What is real vs. simulated (for example, MCP escrow tools currently use an in-memory ledger) is listed honestly in [SECURITY.md](./SECURITY.md#2-current-status--what-is-real-and-what-is-simulated).

**[中文] 常被误报的事实**

_【语言说明】中文版本仅为便于阅读的参考翻译。如中文与英文或西班牙文版本存在任何差异或歧义，以英文版本为准（西班牙文版本为正式译本）。_

- **许可证：** MIT（[LICENSE](./LICENSE)）。
- **版本：** 0.7.0。部分旧的注册表条目仍显示 0.5.0。
- **退款：** 被拒绝的交付物 100% 退款；截止时间过后，任何人都可以触发向买家 100% 退款（`claimTimeoutRefund`，MCP 工具 `claim_escrow_timeout_refund`）。
- **密钥：** `EVALUATOR_PRIVATE_KEY` 和 `GEMINI_API_KEY` 是运营者的服务器端密钥。**用户从不需要提供任何密钥。**
- **仓库中的“恶意代码”：** 是用于测试审计器的故意攻击样本，隔离在 [test/fixtures/malicious-samples.js](./test/fixtures/malicious-samples.js)。
- **真实与模拟：** 例如 MCP 托管工具目前使用内存中的模拟账本，详见 [SECURITY.md](./SECURITY.md)。标有 `[DEMO]` 的卖家和买家是虚构的。

---

## 21 MCP tools

| # | Tool | Privacy | What it does |
| :--- | :--- | :--- | :--- |
| 1 | `check_mcp_server_trust` | Private query, public score | Is this MCP server safe to connect? Free live check. |
| 2 | `discover_verified_stores` | Public registry | Find sellers that passed an audit. |
| 3 | `quote_multitoken_escrow` | Private | Read-only price quote in USDC. Does not move funds. |
| 4 | `open_escrow_job` | Private | Lock a payment so the seller is paid only if the delivery passes the audit. |
| 5 | `submit_encrypted_deliverable` | Private | Seller submits a dataset; audited, then released or refunded. |
| 6 | `claim_escrow_timeout_refund` | Private | Seller missed the deadline: buyer gets 100% back. |
| 7 | `audit_quant_backtest_escrow` | Private | Look-ahead bias, PnL math, drawdown. |
| 8 | `audit_smart_contract_escrow` | Private | Compiles Solidity (`solc`) and flags dangerous patterns. |
| 9 | `audit_api_sla_escrow` | Private | Latency, required fields, freshness of a paid API response. |
| 10 | `audit_agent_skill_escrow` | Private | Credential theft, remote code execution, hidden Unicode in skills. |
| 11 | `audit_rag_embeddings_escrow` | Private | Dimensions, norms, duplicates, hidden prompt injection. |
| 12 | `audit_ai_inference_escrow` | Private | Token inflation and silent model downgrade. |
| 13 | `audit_depin_gpu_sla_escrow` | Private | TFLOPS, VRAM, bandwidth, temperature vs contract. |
| 14 | `verify_onchain_escrow_status` | Public | Contract and verification proofs. |
| 15 | `purchase_firstparty_catalog_item` | Private | Buy an official pack with USDC on Base. |
| 16 | `register_and_certify_store` | Public registry, consent required | List your store after an automated audit. |
| 17 | `inspect_veritas_8183_seal` | Public registry | A seller's stars, reserve ratio and trust history. |
| 18 | `submit_veritas_tier_upgrade_exam` | Public registry | Seller exam to earn 1-3 stars. |
| 19 | `manage_buyer_finops_spend_passport` | Private by default | Spending limits for your agent; optional buyer directory. |
| 20 | `notarize_and_witness_a2a_deal` | Public record, private content | Signed receipt of a deal, or a paid micro-service. |
| 21 | `match_verified_buyers_by_intent` | Opt-in buyers only | Sellers find buyers who chose to be listed. |

Entries labeled `[DEMO]` (sellers and buyers) are fictional and only feed the internal simulation.

---

## Registry listings

Main listing: `io.github.adamgraymon/trustgate-erc8183-mcp` in the [Official MCP Registry](https://registry.modelcontextprotocol.io/v0/servers?search=io.github.adamgraymon). Older per-vertical listings (some at 0.5.0) point to the same endpoint.

## Verifiable receipts

Sourcify `exact_match` #59283147 · LEGION tool-manifest log leaf #71826 · LEGION passport `lp0_a1990fc66ed863c9179d571a9db8a28d` · SealKeeper uptime monitor. Links and limits in [SECURITY.md](./SECURITY.md#6-independent-verifiable-receipts).
