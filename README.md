# TrustGate / VERITAS — MCP trust checks, security audits and a public notary for AI agents

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![M8ven Score](https://m8ven.ai/badge/mcp/adamgraymon/own_adam)](https://m8ven.ai/mcp/adamgraymon/own_adam?s=readme)
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

### Review an agent skill for free

Call `review_agent_skill_free` with `{}` for a fictional JSON example and its `exampleInput`. Resend that input to reproduce the findings. The same example is available at [GET /skills/review/sample.json](https://own-adam.onrender.com/skills/review/sample.json).

To review a skill, submit `{ "files": [{ "path": "SKILL.md", "content": "..." }] }` with the root `SKILL.md` and any supporting text files. Each file has an array of findings with a 1-based line, rule ID, severity and message. The review is free and accepts up to 8 files, 32 KiB per file and 96 KiB total. It validates required YAML metadata and reports static indicators. Results with no findings still require normal security review before use.

The `skillReviewPilot` section of `GET /api/external-traffic` counts completed actions in `httpSamples`, `mcpSamples`, `skillReviews` and `tests` from the time measurement begins. To count a request as an operator test, send `x-trustgate-test: 1` with the existing `x-owner-key` header. Each action contributes to one counter. The counters store totals only. Local runs use memory. Production uses Upstash when configured, so totals survive restarts. A `null` total means storage could not be read, and `writeErrors` counts unconfirmed increments in the current process.

`GET /api/external-traffic` also exposes `catalogReads` for the audited servers, evaluated skills and commercial catalogs. The `http` and `mcp` counters track completed reads of each full catalog via direct GET and MCP `resources/read` over HTTP. Marked operator requests count only in `tests`. These totals use the same local memory and configured production Upstash policy as the pilot counters.

### Preview the full dossier

The full dossier costs **0.25 USDC on Base Mainnet**. See the delivered JSON for free with the MCP tool `get_trust_dossier_sample` (empty arguments) or with `GET /trust/sample.json` on the local server. The response includes price and delivery metadata plus an `example` with the seven answers, findings, illustrative seal and order ID. The example uses fictional data. A paid call to `check_mcp_server_trust` returns that report structure directly in `result.structuredContent`.

For paid dossiers, set `TRUST_REPORT_SIGNING_KEY_FILE` to the path of a dedicated Ed25519 PKCS#8 private PEM outside the repository and restart the server. `GET /trust/methodology` and `GET /.well-known/agent.json` publish the matching `reportSigning` descriptor. Use that public key as the expected key when verifying a dossier. When the key is absent, new full dossiers and x402 checkout are unavailable. Saved dossiers are returned as originally issued.

### Local paid-order recovery

Run `npm run start:local` from the project root. The server loads the existing `.env` and binds to `127.0.0.1`. With `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`, local paid orders use the Redis prefix `veritas:trust-orders:local:v1` and local history uses a separate key. Without Redis credentials, orders use the Git-ignored `data/trust-orders/` directory.

Before the first paid `check_mcp_server_trust` call, generate a private random 32-byte `paymentRecoveryToken` as 64 hex characters. Keep it with the original `serverUrl` and `paymentTxHash`. Resend all three to retry a failed check or retrieve the same completed report after a disconnect or restart. The token is a per-order credential. Redis credentials belong in `.env` and are never tool arguments.

### Local x402 v2 dossier checkout

Run `npm run start:local:x402` to enable the sandbox on `127.0.0.1:3402`. Send `POST /api/trust/dossier` with JSON fields `serverUrl` and `paymentRecoveryToken`. Use a new private random 32-byte token (64 hex characters) for each new order.

Read `GET /discovery/resources` to discover the sandbox offer without payment. The catalog and the checkout's `PAYMENT-REQUIRED` header advertise the same x402 v2 price and `extensions.bazaar` declaration. The declaration includes the POST JSON input schema and a compact output example. The catalog's `sampleUrl` points to the full fictional report. An unsigned request with an empty body or the example body returns the challenge. The all-zero example token cannot authorize a purchase.

1. The first request returns HTTP 402 with `PAYMENT-REQUIRED` for exactly **0.25 USDC on Base Sepolia** (`eip155:84532`).
2. An x402 v2 client signs the EIP-3009 authorization and retries with `PAYMENT-SIGNATURE`. The sandbox verifies the signature locally, prepares the report and simulates settlement.
3. HTTP 200 returns the full report JSON and a simulated receipt in `PAYMENT-RESPONSE`. Resend the same body to recover a completed report, even after a restart. For a pending check, resend the original authorization header before it expires.

Sandbox orders and receipts use the Git-ignored `data/trust-orders/x402-sandbox/` directory. This mode uses a dummy recipient and creates no on-chain transactions. Run `node --test --test-name-pattern x402 test/trustPaymentOrder.test.js` to exercise it with the official `@x402/fetch` client and an ephemeral signer. The test simulates the target and blocks external requests.

Public CDP Bazaar indexing requires a public HTTPS endpoint, successful validation and an actual settlement via the CDP facilitator. [Coinbase discovery guide](https://docs.cdp.coinbase.com/x402/seller/get-discovered)

### Local CDP facilitator on Base Sepolia

The CDP checkout reads `CDP_API_KEY_ID` and `CDP_API_KEY_SECRET` from the existing local `.env`. The payout address uses `X402_SEPOLIA_PAY_TO` when set and otherwise uses `TREASURY_PUBLIC_ADDRESS`. A CDP wallet secret is unnecessary for an existing public receiver address.

Run `npm run start:local:cdp` to use the same checkout on loopback with the hosted CDP facilitator, accepting only **0.25 test USDC on Base Sepolia**. The server checks the chain ID via `BASE_SEPOLIA_RPC_URL` (or the Base Sepolia default) and keeps the order and settlement records in `data/trust-orders/x402-cdp-sepolia/`. The local discovery card stays local.

After a cut, submit the original JSON body to recover the report and receipt. When the facilitator response is lost, the server looks up the original authorization nonce and exact USDC transfer before delivering the report. An ambiguous settlement stays pending without a second settlement request. The offline regression test uses the official x402 client with CDP and chain fixtures.

---

## Privacy in one table

The owner console unlocks with the existing server-side `OWNER_DASHBOARD_KEY`. Use the password field on the local home page, or send the key in the `x-owner-key` header when calling the owner status API. Keep the key out of URLs. Audit and registration logs record operational metadata only.

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

## 23 MCP tools

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
| 22 | `get_trust_dossier_sample` | Public | Free fictional JSON preview and price of the full TrustGate dossier. |
| 23 | `review_agent_skill_free` | Private input | Free static skill review with findings by file and a reproducible JSON example. |

Entries labeled `[DEMO]` (sellers and buyers) are fictional and only feed the internal simulation.

---

## Registry listings

Main listing: `io.github.adamgraymon/trustgate-erc8183-mcp` in the [Official MCP Registry](https://registry.modelcontextprotocol.io/v0/servers?search=io.github.adamgraymon). Older per-vertical listings (some at 0.5.0) point to the same endpoint.

## Verifiable receipts

Sourcify `exact_match` #59283147 · LEGION tool-manifest log leaf #71826 · LEGION passport `lp0_a1990fc66ed863c9179d571a9db8a28d` · SealKeeper uptime monitor. Links and limits in [SECURITY.md](./SECURITY.md#6-independent-verifiable-receipts).
