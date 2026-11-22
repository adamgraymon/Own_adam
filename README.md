# TrustGate (`trustgate-erc8183-mcp`) / VERITAS-8183 Seal — MCP trust checks, 8-vertical escrow audits & public notary for AI agents

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![M8ven Score](https://m8ven.ai/badge/mcp/adamgraymon/own_adam)](https://m8ven.ai/mcp/adamgraymon/own_adam?s=readme)
[![Sourcify Verified](https://img.shields.io/badge/Sourcify_v2-Exact_Match_%2359283147-10b981)](https://sourcify.dev/server/v2/contract/8453/0xd4f77bf843b3c359b233aca46d7ff6604cbd0a5e)
[![LEGION Passport](https://passport.legion-api.com/passport/lp0_a1990fc66ed863c9179d571a9db8a28d/badge.svg)](https://passport.legion-api.com/passport/lp0_a1990fc66ed863c9179d571a9db8a28d)
[![VERITAS MCP Trust](https://own-adam.onrender.com/badge.svg?server=https%3A%2F%2Fown-adam.onrender.com%2Fmcp)](https://own-adam.onrender.com/trust?server=https%3A%2F%2Fown-adam.onrender.com%2Fmcp)
[![M2M Live Traffic](https://own-adam.onrender.com/badge/telemetry.svg?metric=hits)](https://own-adam.onrender.com/api/external-traffic)
[![Active MCP Tools](https://own-adam.onrender.com/badge/telemetry.svg?metric=tools)](https://own-adam.onrender.com/api/external-traffic)
[![Escrow & Audit Calls](https://own-adam.onrender.com/badge/telemetry.svg?metric=escrow)](https://own-adam.onrender.com/api/external-traffic)
[![Audited Registry](https://own-adam.onrender.com/badge/telemetry.svg?metric=catalog)](https://own-adam.onrender.com/trust)
[![500K 5-Day Goal](https://own-adam.onrender.com/badge/telemetry.svg?metric=challenge)](https://own-adam.onrender.com/api/external-traffic)

> **Canonical Project Identity (TrustGate = VERITAS-8183 = `adamgraymon/Own_adam`):**
> - **Official MCP Registry Package:** `io.github.adamgraymon/trustgate-erc8183-mcp` (**TrustGate**, `v0.8.0`)
> - **GitHub Repository:** [`https://github.com/adamgraymon/Own_adam`](https://github.com/adamgraymon/Own_adam) (author: [`adamgraymon`](https://github.com/adamgraymon))
> - **Quality Seal Issued by TrustGate:** **`VERITAS-8183` 1★–3★ Seal** (`inspect_veritas_8183_seal`, REST API: [`GET https://own-adam.onrender.com/api/seal`](https://own-adam.onrender.com/api/seal) & [`GET /api/seal/{storeId}`](https://own-adam.onrender.com/api/seal/databento-raw-tick))
> - **On-Chain Contracts (Base Mainnet, Chain ID `8453`):** `TrustGateEscrow8183.sol` (`0xd4f77bf843b3c359b233aca46d7ff6604cbd0a5e`, [Sourcify Direct JSON `#59283147`](https://sourcify.dev/server/v2/contract/8453/0xd4f77bf843b3c359b233aca46d7ff6604cbd0a5e) · [BaseScan Explorer](https://basescan.org/address/0xD4f77Bf843b3c359B233ACa46d7Ff6604CBD0a5e)) and `VeritasRefundableReserveVault.sol` ([TERMS.md](./TERMS.md) · live JSON: https://own-adam.onrender.com/terms)

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

For signed dossiers, set `TRUST_REPORT_SIGNING_KEY_FILE` to the path of a dedicated Ed25519 PKCS#8 private PEM outside the repository and restart the server. `GET /trust/methodology` and `GET /.well-known/agent.json` publish the matching `reportSigning` descriptor. Use that public key as the expected key when verifying a dossier. When the key is absent, new full dossiers and x402 checkout are unavailable. Saved dossiers are returned as originally issued.

### Local launch promotion & 100,000+ M2M Requests Milestone Extension (+3 Extra Days Free)

> **🎉 100,000+ M2M Requests in 7 Days — Extended 3 More Days Free (until `2026-11-25T23:26:31.261Z`) + 🎯 500,000 Requests 5-Day Challenge (+1 Extra Week Free!):**
> - **[EN]** In gratitude to the autonomous agent and developer community for passing **100,000+ external M2M requests (`109,020+`)** in our first 7 days, we have extended our free evaluation window and the **0 USDC Ed25519-Signed 7/7 Trust Dossier Promotion** for **3 additional days (through November 25, 2026)**. **Community Challenge:** If we reach **`500,000` external M2M requests within 5 days (by November 27, 2026)**, we will unlock **an entire extra week (+7 additional days) of 100% FREE (`0 USDC`) access** across the tools and signed 7/7 dossiers!
> - **[ES]** Como celebración por haber superado las **100,000+ visitas externas M2M (`109,020+`)** en apenas 7 días y en agradecimiento por la acogida recibida, hemos extendido **3 días más (hasta el 25 de noviembre de 2026)** el acceso gratuito al **Dossier Completo 7/7 firmado con Ed25519 (`0 USDC`)** y a las 23 herramientas. **🎯 Reto de las 500,000 Visitas:** ¡Si llegamos a las **`500,000` visitas en 5 días (antes del 27 de noviembre de 2026)**, dejamos las herramientas y el Dossier 7/7 firmado **gratis otra semana completa (+7 días adicionales a `0 USDC`)**!

Set `TRUST_DOSSIER_PROMO_START_AT` to the intended UTC start time in ISO 8601 format and configure the dedicated signer. The offer lasts 72 hours from that timestamp (extended by +72 hours in production until `2026-11-25T23:26:31.261Z` for the 100k M2M milestone celebration). Restarting the process keeps the original window. The offer is off by default. During the window, call `check_mcp_server_trust` with only `serverUrl` for a signed 7/7 dossier at 0 USDC. See the current offer, expiration and an example call in `get_trust_dossier_sample` or `/trust/sample.json`.

The promotional quota is five requests per client and 100 total per UTC day. Upstash enforces the quota across processes when configured. The `MCP_TRUST_V1` digest appends `issuance`, when present, after `answers` in the JSON fields being hashed. Promotional reports have `issuance.type` set to `LAUNCH_PROMO_FREE` and omit paid order and transaction identifiers. Use the original credentials to recover an existing paid report. Papers and other First-Party purchases keep their existing payment flow.

For a local rehearsal with a shared Upstash instance, set `SELLER_REGISTRY_REDIS_KEY` and `TRUST_DOSSIER_PROMO_REDIS_KEY` to separate test namespaces before starting the server. Call `register_and_certify_store` with `{}` for a sample and the registry terms. An HTTP MCP submission confirms the public listing after Upstash acknowledges the write. Use fictional data in the isolated registry.

### Gold monthly allowance

For the monthly Gold allowance, call `check_mcp_server_trust` with the approved endpoint as `serverUrl` and `goldCredit` as shown in the dossier sample. The current eligible service is the signed 7/7 dossier. Each verified Gold shop has five uses per UTC calendar month. Use the registered wallet to sign the EIP-191 authorization shown in the sample. This is a message signature. Use a fresh authorization expiry within ten minutes and keep the same request UUID when repeating a completed request. The `balance` action returns the remaining uses and reset time. The `redeem` action returns the saved report and balance. Upstash commits the report and deduction together. Retries work across restarts and UTC months while the wallet, endpoint and Gold grant remain valid.

An operator records Gold eligibility by setting the `grant` field on `veritas:gold-monthly-credits:v1:<storeId>` in Upstash after independently verifying the shop. The JSON grant has `starLevel: 3`, `storeId`, `walletAddress`, `serverUrl`, `verifiedAt` and `expiresAt` (ISO timestamps). The wallet and endpoint must match an active consenting seller in the persistent registry. Remove the grant to revoke eligibility. The simulated tier exam does not grant credits. Use separate `GOLD_MONTHLY_CREDITS_REDIS_PREFIX` and `SELLER_REGISTRY_REDIS_KEY` test namespaces for local rehearsals. Papers and Blueprints use their standard purchase flow.

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

## Live M2M Adoption, Escrow Activity & Why We Publish Live Telemetry

> **Why we publish our operational metrics in real time (`GET /api/external-traffic`):**
> - **[EN]** If our mission is to bring transparency, deterministic audits, and security to autonomous AI agents and their clients, **we must be the first to hold ourselves to that standard**. Most MCP servers only publish static badges; we expose our real-time M2M traffic, tool execution counts, and third-party audit scores publicly—while keeping individual client identities and audit inputs 100% private ([PRIVACY.md](./PRIVACY.md)). Exposing live endpoints and free evaluation tools also lets external security scanners continuously stress-test our server in the open: for example, when an external security probe (`OVERWRITE-PROOF-43923`) tested whether `register_and_certify_store` allowed store-ID overwriting across wallets, our public telemetry surfaced the probe immediately and we hardened store-ID ownership (`HTTP 409 STORE_ID_RESERVED_BY_PROTOCOL` / `STORE_ID_ALREADY_CLAIMED` in commit `8a18b46`).
> - **[ES]** Si nuestro objetivo es que exista transparencia y blindar a nuestros clientes, **nosotros mismos debemos ser los primeros en blindarnos y ser transparentes**. Por eso hacemos públicas nuestras métricas operativas en tiempo real (manteniendo siempre 100% privados los datos e identidades de cada cliente según [PRIVACY.md](./PRIVACY.md)): permite verificar con datos reales qué herramientas se están usando y nos permite endurecer continuamente el protocolo frente a pruebas de seguridad reales en vivo.

All telemetry counters below are persisted in **Upstash Redis** in production and can be verified in real time via [`GET https://own-adam.onrender.com/api/external-traffic`](https://own-adam.onrender.com/api/external-traffic) (auto-updating SVG badges at the top of this README refresh every 5 minutes from the live endpoint):

- **External M2M Traffic Volume (100k+ Milestone Reached in 7 Days):** **`109,020+` cumulative external requests** (`~891 requests/hour` sustained overnight rate, peaking at `1,138 requests/hour`), including **`82,980+` MCP JSON-RPC 2.0 calls** across **`280+` unique classified external AI systems**.
- **Active MCP Tool Usage by External Autonomous Agents (`20 of 23` tools invoked externally, `185+` external `tools/call` executions, `254+` total tool & catalog interactions excluding operator tests):**
  - **Escrow & Smart Contract Audit Tools (`54` external calls across `11` escrow & purchase tools):**
    - `audit_smart_contract_escrow`: **11** Solidity smart contract (`solc 0.8.38`) escrow security audits
    - `purchase_firstparty_catalog_item`: **11** First-Party curated package checkout verifications against Base Mainnet
    - `verify_onchain_escrow_status`: **9** live Base Mainnet contract & Sourcify proof verifications
    - `quote_multitoken_escrow`: **8** external multi-token escrow quotes (ETH / SOL / VIRTUAL / USDT → Base USDC)
    - `open_escrow_job`: **4** escrow job creation flows
    - `claim_escrow_timeout_refund`: **4** permissionless 100% buyer timeout refund verifications
    - `audit_ai_inference_escrow`: **3** proof-of-inference & anti-model-downgrade escrow audits
    - `submit_encrypted_deliverable`: **2** AES-256-GCM encrypted dataset escrow deliveries
    - `audit_agent_skill_escrow`: **1** agent skill (`SKILL.md`) escrow security audit
    - `audit_rag_embeddings_escrow`: **1** RAG vector anti-poisoning escrow audit
    - `audit_quant_backtest_escrow`: **1** quantitative trading backtest escrow audit
  - **MCP Trust Dossiers & Free Skill Security Reviews (`94+` external calls):**
    - `get_trust_dossier_sample`: **53** full 7/7 signed dossier previews
    - `check_mcp_server_trust`: **37** live remote MCP server security probes
    - `review_agent_skill_free`: **4** MCP calls + **1** full HTTP skill review + **11** sample downloads (`skillReviewPilot`)
  - **VERITAS-8183 Public Notary, 1★–3★ Seals & Buyer-Seller Discovery (`36` external calls):**
    - `discover_verified_stores`: **10** ERC-8004 marketplace queries
    - `notarize_and_witness_a2a_deal`: **9** signed A2A deal notary receipts & x402 micro-bazaar calls
    - `register_and_certify_store`: **5** store certification calls (`storeOnboardingFunnel`)
    - `match_verified_buyers_by_intent`: **5** opt-in buyer-seller matchmaking queries
    - `submit_veritas_tier_upgrade_exam`: **4** VERITAS-8183 1★→3★ star tier upgrade exams
    - `inspect_veritas_8183_seal`: **3** VERITAS-8183 bilateral seal & trust history inspections
- **Public Security Catalogs Audited & Downloaded (`56` full catalog reads via HTTP & MCP `resources/read`):**
  - **`40` Real Public MCP Servers Audited** with SHA-256 tool fingerprints and risk scores: [`GET https://own-adam.onrender.com/trust`](https://own-adam.onrender.com/trust)
  - **`50` Real Agent Skills (`SKILL.md`) Evaluated** with line-by-line static findings: [`GET https://own-adam.onrender.com/skills/review`](https://own-adam.onrender.com/skills/review)
  - **Dual-Tier Commercial & First-Party Catalog:** [`GET https://own-adam.onrender.com/catalog.json`](https://own-adam.onrender.com/catalog.json)

---

## Facts that are often misreported

- **License:** MIT ([LICENSE](./LICENSE)).
- **Version:** 0.8.0 ([package.json](./package.json), [server.json](./server.json)). Some older registry listings still say 0.5.0 or 0.7.0.
- **Canonical Identity:** `TrustGate` (`io.github.adamgraymon/trustgate-erc8183-mcp` in the Official MCP Registry, Glama, and M8ven) is the MCP server built in [`adamgraymon/Own_adam`](https://github.com/adamgraymon/Own_adam) that issues the **`VERITAS-8183` 1★–3★ Quality Seal** (`inspect_veritas_8183_seal`).
- **Refunds:** rejected deliveries are refunded 100%; after the deadline anyone can trigger a 100% refund to the buyer (`claimTimeoutRefund`, MCP tool `claim_escrow_timeout_refund`). Seller reserves in [`VeritasRefundableReserveVault.sol`](./contracts/VeritasRefundableReserveVault.sol) are 100% refundable whenever `lockedForClaimsUsdc == 0` ([TERMS.md](./TERMS.md)).
- **Keys:** `EVALUATOR_PRIVATE_KEY` and `GEMINI_API_KEY` are the operator's server-side keys. **Users never provide keys.**
- **"Malware" in the repo:** deliberate attack samples used to test the auditor, isolated in [test/fixtures/malicious-samples.js](./test/fixtures/malicious-samples.js).

What is real vs. simulated (and how non-custodial Base Mainnet settlement, Upstash Redis persistence, and MCP escrow previews work together) is listed honestly in [SECURITY.md](./SECURITY.md#2-current-status--what-is-real-and-what-is-simulated).

**[中文] 常被误报的事实**

_【语言说明】中文版本仅为便于阅读的参考翻译。如中文与英文或西班牙文版本存在任何差异或歧义，以英文版本为准（西班牙文版本为正式译本）。_

- **许可证：** MIT（[LICENSE](./LICENSE)）。
- **版本：** 0.8.0。部分旧的注册表条目仍显示 0.5.0 或 0.7.0。
- **退款：** 被拒绝的交付物 100% 退款；截止时间过后，任何人都可以触发向买家 100% 退款（`claimTimeoutRefund`，MCP 工具 `claim_escrow_timeout_refund`）。
- **密钥：** `EVALUATOR_PRIVATE_KEY` 和 `GEMINI_API_KEY` 是运营者的服务器端密钥。**用户从不需要提供任何密钥。**
- **仓库中的“恶意代码”：** 是用于测试审计器的故意攻击样本，隔离在 [test/fixtures/malicious-samples.js](./test/fixtures/malicious-samples.js)。
- **真实与模拟：** 详见 [SECURITY.md](./SECURITY.md)。标有 `[DEMO]` 的卖家和买家是虚构的。

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
| 16 | `register_and_certify_store` | Public registry, consent required | List your store after an automated audit and confirmed registry write. |
| 17 | `inspect_veritas_8183_seal` | Public registry | A seller's stars, reserve ratio and trust history. |
| 18 | `submit_veritas_tier_upgrade_exam` | Public registry | Seller exam to earn 1-3 stars. |
| 19 | `manage_buyer_finops_spend_passport` | Private by default | Spending limits for your agent; optional buyer directory. |
| 20 | `notarize_and_witness_a2a_deal` | Public record, private content | Signed receipt of a deal, or a paid micro-service. |
| 21 | `match_verified_buyers_by_intent` | Opt-in buyers only | Sellers find buyers who chose to be listed. |
| 22 | `get_trust_dossier_sample` | Public | Free fictional JSON preview and price of the full TrustGate dossier. |
| 23 | `review_agent_skill_free` | Private input | Free static skill review with findings by file and a reproducible JSON example. |

Entries labeled `[DEMO]` (sellers and buyers) are fictional and only feed the internal simulation.

Call `register_and_certify_store` with `{}` to preview onboarding. An HTTP MCP registration shows `persisted: true` after Upstash confirms the write. A duplicate write to an existing registry entry also succeeds and shows `newlyCertified: false`. If storage is unavailable, the tool returns `SELLER_REGISTRY_STORAGE_UNAVAILABLE` with `retryable: true`. HTTP MCP requires Upstash for public registration even in a local run. Standalone MCP over STDIO keeps its in-memory registry. Direct ledger callers can enable local file persistence for their local registry.

---

## Registry listings

Main listing: `io.github.adamgraymon/trustgate-erc8183-mcp` (`v0.8.0`) in the [Official MCP Registry](https://registry.modelcontextprotocol.io/v0/servers?search=io.github.adamgraymon), [M8ven Verified Publisher (`adamgraymon/Own_adam`)](https://m8ven.ai/mcp/adamgraymon/own_adam), and [Glama](https://glama.ai/mcp/servers). Older per-vertical listings point to the same endpoint.

## Verifiable receipts & live telemetry

- **M8ven Independent Security & Quality Rating:** [`89/100` Trust Score (`Grade B · Emerging`), `100/100` Code Score, `0` CVEs, Verified Publisher](https://m8ven.ai/mcp/adamgraymon/own_adam)
- **Sourcify v2 Smart Contract Verification (Direct JSON API & UI):** [`exact_match` #59283147 JSON API](https://sourcify.dev/server/v2/contract/8453/0xd4f77bf843b3c359b233aca46d7ff6604cbd0a5e) · [BaseScan Contract Explorer (`0xD4f77Bf843b3c359B233ACa46d7Ff6604CBD0a5e`)](https://basescan.org/address/0xD4f77Bf843b3c359B233ACa46d7Ff6604CBD0a5e) · [Sourcify UI](https://sourcify.dev/#/lookup/0xd4f77bf843b3c359b233aca46d7ff6604cbd0a5e)
- **VERITAS-8183 Public Seal REST API (No MCP Client Required):** [`GET https://own-adam.onrender.com/api/seal`](https://own-adam.onrender.com/api/seal) · [`GET https://own-adam.onrender.com/api/seal/{storeId}`](https://own-adam.onrender.com/api/seal/databento-raw-tick)
- **Refundable Reserve Vault & Public Escrow Terms:** [`VeritasRefundableReserveVault.sol`](./contracts/VeritasRefundableReserveVault.sol) · [TERMS.md](./TERMS.md) · [`GET https://own-adam.onrender.com/terms`](https://own-adam.onrender.com/terms)
- **Live M2M Traffic & Tool Execution Telemetry (Upstash Redis):** [`GET https://own-adam.onrender.com/api/external-traffic`](https://own-adam.onrender.com/api/external-traffic) · **LLM Discovery Index:** [`GET https://own-adam.onrender.com/llms.txt`](https://own-adam.onrender.com/llms.txt)
- **LEGION Signed Tool-Manifest Log:** [leaf #71826](https://tlog.legion-api.com/tlog/v0/records/71826) · **LEGION Passport:** [`lp0_a1990fc66ed863c9179d571a9db8a28d`](https://passport.legion-api.com/passport/lp0_a1990fc66ed863c9179d571a9db8a28d) · **SealKeeper Uptime Monitor:** [`own-adam.onrender.com`](https://sealkeeper.run/agents/own-adam.onrender.com)

Full details and limits in [SECURITY.md](./SECURITY.md#6-independent-verifiable-receipts).
