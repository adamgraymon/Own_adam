# Security Policy — TrustGate (`trustgate-erc8183-mcp`) / VERITAS-8183 Seal (`io.github.adamgraymon/*`)

This page explains, in plain language, what this server can and cannot do, which keys it uses, its live production adoption telemetry, and what is still pending.
- **Canonical Identity:** `TrustGate` (`io.github.adamgraymon/trustgate-erc8183-mcp` in the Official MCP Registry, M8ven, and Glama) is built in [`adamgraymon/Own_adam`](https://github.com/adamgraymon/Own_adam) and issues the **`VERITAS-8183` 1★–3★ Quality Seal** (`inspect_veritas_8183_seal`).
- **Privacy & Escrow Terms:** [PRIVACY.md](./PRIVACY.md) (`https://own-adam.onrender.com/privacy`) · [TERMS.md](./TERMS.md) (`https://own-adam.onrender.com/terms`).

---

## 1. Facts that are often misreported

| Claim seen in third-party reviews | Fact (verifiable) |
| :--- | :--- |
| "No license" | **MIT** — see [LICENSE](./LICENSE) and `"license": "MIT"` in [package.json](./package.json). |
| "Version 0.5.0 / 0.7.0" | Current server version is **0.8.0** ([server.json](./server.json), [package.json](./package.json), `serverInfo.version` in `initialize`). Older per-vertical registry entries point to the same v0.8.0 endpoint. |
| "Does TrustGate emit the VERITAS-8183 seal?" | **Yes.** `TrustGate` (`io.github.adamgraymon/trustgate-erc8183-mcp`, repo `adamgraymon/Own_adam`) is the official issuer and verifier of the **VERITAS-8183 1★–3★ Seal** via `inspect_veritas_8183_seal`, `register_and_certify_store`, `submit_veritas_tier_upgrade_exam`, and `notarize_and_witness_a2a_deal`. |
| "No refunds" | The escrow contract has `claimTimeoutRefund(jobId)`: after the deadline **anyone** can trigger a **100% refund to the buyer**, no evaluator needed ([contract](./contracts/TrustGateEscrow8183.sol), MCP tool `claim_escrow_timeout_refund`). Rejected deliveries also refund 100% (`submitVerdict(approved=false)`). Seller reserves in [`VeritasRefundableReserveVault.sol`](./contracts/VeritasRefundableReserveVault.sol) are 100% refundable whenever `lockedForClaimsUsdc == 0` ([TERMS.md](./TERMS.md)). |
| "It reads your private keys" | **No.** `EVALUATOR_PRIVATE_KEY` and `GEMINI_API_KEY` are the **operator's own** keys, set in the server environment. Users never provide keys, and no tool asks for private keys or seed phrases. See section 3. |
| "Contains malware" | The strings in [test/fixtures/malicious-samples.js](./test/fixtures/malicious-samples.js) are **deliberate attack samples** used as input data to prove the auditor rejects trojans. They are never imported by the server or executed. |

---

## 2. Current status — what is real and what is simulated

We prefer to say this clearly rather than let a reviewer discover it:

| Component | Status |
| :--- | :--- |
| Escrow smart contract on Base (`0xd4f77bf843b3c359b233aca46d7ff6604cbd0a5e`) & Refundable Reserve Vault (`VeritasRefundableReserveVault.sol`) | **Real**, compiled with `solc 0.8.38`; Base Mainnet contract source verified on Sourcify (`exact_match`, #59283147). |
| On-chain payment & escrow status verification (`paymentTxHash`, `verify_onchain_escrow_status`) | **Real**: queries Base Mainnet RPC directly to verify contract state, bytecode, and USDC transfers to the treasury with anti-replay protection. |
| Production state persistence (Upstash Redis) | **Real durable persistence in production**: certified seller listings (`veritas:seller-registry:v1`), MCP trust snapshots (`veritas-trust-history`), evaluated skills catalog, paid trust dossier orders, 3-Star Gold monthly dossier credits, and external traffic / tool telemetry (`veritas:traffic-totals:v1`) persist across container restarts in Upstash Redis. |
| MCP escrow flow (`quote_multitoken_escrow`, `open_escrow_job`, `submit_encrypted_deliverable`, `claim_escrow_timeout_refund`) | **Non-custodial by design + simulated ledger for instant MCP staging.** Because an MCP server must never ask for a buyer's private key, MCP tool calls quote, stage jobs in the server ledger, and run the **real** deterministic audits immediately (and support `{}` zero-argument sample previews), while on-chain USDC funding happens directly from the buyer's wallet to the Base Mainnet contract. |
| Audit engines (Solidity via `solc 0.8.38`, skills, RAG, inference, GPU, backtests, datasets) | **Real** deterministic checks on the data you send, plus Ed25519 cryptographic report signing (`TRUST_REPORT_SIGNING_KEY_FILE`). |
| `check_mcp_server_trust` & `review_agent_skill_free` | **Real** live probe of the target MCP server (`40` public MCP servers audited) and **real** line-by-line static scanner for agent skills (`50` skills evaluated). Methodology: `/trust/methodology`. |
| Providers and buyers labeled `[DEMO]` | **Fictional**, used by the internal simulation. Real sellers appear only after `register_and_certify_store` confirms an Upstash Redis write. |

---

## 3. Server-side keys (operator only)

| Variable | Purpose | Limits |
| :--- | :--- | :--- |
| `EVALUATOR_PRIVATE_KEY` | Signs verdicts on the escrow contract. | The contract only lets it **approve** (pay the seller the agreed amount minus fee) or **reject** (refund the buyer 100%). It cannot send funds to any other address or change recipients. |
| `GEMINI_API_KEY` | Optional second-opinion review of up to 30 sampled dataset rows. | If absent, a local heuristic judge is used. Billed to the operator. |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | Optional persistence for trust-check history and paid trust orders. | Public metadata and private paid order records use separate keys. The raw recovery token is never stored. |
| `OWNER_DASHBOARD_KEY` | Protects the owner console state, simulator controls and detailed traffic. Send via `x-owner-key`. | Owner status and controls are locked without a configured key. Public traffic aggregates remain available. |

---

## 4. Known limitations (honest list)

1. **Single evaluator.** One key decides approve/reject. Mitigations today: rejection always refunds 100%, the timeout refund needs no evaluator, verdicts carry an audit attestation hash, and the owner can rotate a compromised key (`rotateEvaluatorKey`). Not yet: multi-evaluator quorum or an independent dispute process. Roadmap item.
2. **Owner can rotate the evaluator.** This is a trust assumption on the operator.
3. **Independent publisher, audited by automated third-party registries (M8ven `89/100`, Sourcify `#59283147`, LEGION `#71826`), no paid human firm audit yet.** Issues and reviews are welcome.
4. **Remote service.** Data you send to audit tools reaches the server. Don't send secrets or confidential code you are not allowed to share. Audit inputs are not stored after the response (see PRIVACY.md).
5. **Some heuristics are sealed** (`veritasEncryptedVaultLoader.js`). We plan to publish the auditor rules so they can be reviewed.

---

## 5. Remote-only, no local access

Clients connect over HTTPS (`https://own-adam.onrender.com/mcp`). The server runs in a cloud container and has no access to the user's machine, files, environment variables or wallets. It runs as unprivileged `USER node` ([Dockerfile](./Dockerfile)) with one production dependency (`solc`).

---

## 6. Independent, verifiable receipts & live adoption telemetry

| Receipt / Live Telemetry Source | Verified Value & Link |
| :--- | :--- |
| **M8ven Independent Security & Quality Rating** | **`89/100` Trust Score (`Grade B · Emerging`), `100/100` Code Score, `0` CVEs, `0` Warnings, Verified Publisher** — https://m8ven.ai/mcp/adamgraymon/own_adam |
| **Sourcify v2 Smart Contract Verification** | **`exact_match` (#59283147) on Base Mainnet** — https://sourcify.dev/#/lookup/0xd4f77bf843b3c359b233aca46d7ff6604cbd0a5e |
| **Refundable Seller Reserve Vault & Escrow Terms** | [`VeritasRefundableReserveVault.sol`](./contracts/VeritasRefundableReserveVault.sol) (`solc 0.8.38`) & [TERMS.md](./TERMS.md) — https://own-adam.onrender.com/terms |
| **Live External M2M Traffic & Tool Executions (Upstash Redis)** | **`75,250+` external M2M requests (`~815/hr` 24h avg), `50,500+` MCP JSON-RPC calls, `17/23` MCP tools called externally (`72+` external `tools/call` executions including `16` escrow & contract audit calls: `7` `quote_multitoken_escrow`, `3` `verify_onchain_escrow_status`, `open_escrow_job`, `claim_escrow_timeout_refund`, `audit_smart_contract_escrow`, etc.)** — https://own-adam.onrender.com/api/external-traffic |
| **Public Audited MCP Servers & Agent Skills Catalogs** | **`40` real public MCP servers audited** (`https://own-adam.onrender.com/trust`) · **`50` real agent skills evaluated** (`https://own-adam.onrender.com/skills/review`) |
| **LEGION signed tool-manifest log (leaf #71826)** | https://tlog.legion-api.com/tlog/v0/records/71826 |
| **LEGION agent passport** | https://passport.legion-api.com/passport/lp0_a1990fc66ed863c9179d571a9db8a28d |
| **SealKeeper uptime monitor** | https://sealkeeper.run/agents/own-adam.onrender.com |

Note: many security crawlers visit this endpoint. Visits are **not** audit passes, and we do not claim results we cannot link to.

---

## 中文摘要 / Resumen en español

> Language precedence: the English text is authoritative. The Spanish text is an official translation. The Simplified Chinese text is a reference translation for convenience only; in case of any difference or ambiguity, the English version prevails.
>
> Prevalencia de idiomas: el texto en inglés es el que rige. El texto en español es una traducción oficial. El texto en chino simplificado es solo una traducción de referencia; ante cualquier diferencia o ambigüedad, prevalece la versión en inglés.
>
> 【语言说明】中文版本仅为便于阅读的参考翻译。如中文与英文或西班牙文版本存在任何差异或歧义，以英文版本为准（西班牙文版本为正式译本）。

**中文：** 本服务器（`TrustGate` / `io.github.adamgraymon/trustgate-erc8183-mcp`，GitHub 仓库 `adamgraymon/Own_adam`）签发 `VERITAS-8183` 1-3 星质量印章。为远程非托管服务，无法访问用户的电脑、文件、环境变量或钱包。用户从不需要提供私钥。`EVALUATOR_PRIVATE_KEY` 只能批准（向卖家支付约定金额减去手续费）或拒绝（向买家 100% 退款）。截止时间过后，任何人都可以触发 100% 退款。合约已在 Base 上部署并通过 Sourcify 验证（#59283147），M8ven 独立评分为 89/100（代码得分 100/100，0 CVE），生产状态与外部遥测数据（75,250+ 次外部请求，17/23 个工具已被外部智能体调用）持久化在 Upstash Redis 中。

**Español:** El servidor (`TrustGate` / `io.github.adamgraymon/trustgate-erc8183-mcp`, repositorio `adamgraymon/Own_adam`) es el emisor oficial del Sello de Calidad `VERITAS-8183` (1 a 3 estrellas). Es remoto y no custodio: no tiene acceso a tu equipo, archivos, variables de entorno ni billeteras, y nunca pedimos claves privadas. `EVALUATOR_PRIVATE_KEY` solo puede aprobar (pagar al vendedor lo acordado menos la comisión) o rechazar (devolver el 100% al comprador), nunca enviar fondos a otra dirección. Vencido el plazo, cualquiera puede activar el reembolso del 100% (`claimTimeoutRefund`). El contrato está desplegado en Base Mainnet y verificado en Sourcify (`#59283147`), cuenta con calificación independiente de M8ven (`89/100 · Grade B · Emerging`, `Code Score 100/100`, `0 CVEs`), y su estado y telemetría en producción (`75,250+` peticiones externas M2M, `17/23` herramientas ejecutadas por agentes externos, incluyendo `16` llamadas a herramientas de escrow y contratos) persisten en Upstash Redis y son verificables en vivo en `https://own-adam.onrender.com/api/external-traffic`.

---

## 7. Reporting a vulnerability

Open a GitHub issue at https://github.com/adamgraymon/Own_adam/issues (title prefix `[security]`; do not post exploit details publicly — ask for a private channel in the issue).
