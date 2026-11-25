# Security Policy — TrustGate (`trustgate-erc8183-mcp`) / VERITAS-8183 Seal (`io.github.adamgraymon/*`)

This page explains, in plain language, what this server can and cannot do, which keys it uses, its live production adoption telemetry, and what is still pending.
- **Canonical Identity:** `TrustGate` (`io.github.adamgraymon/trustgate-erc8183-mcp` in the Official MCP Registry, M8ven, and Glama) is built in [`adamgraymon/Own_adam`](https://github.com/adamgraymon/Own_adam) and issues the **`VERITAS-8183` 1★–3★ Quality Seal** (`inspect_veritas_8183_seal`).
- **Privacy & Escrow Terms:** [PRIVACY.md](./PRIVACY.md) (`https://own-adam.onrender.com/privacy`) · [TERMS.md](./TERMS.md) (`https://own-adam.onrender.com/terms`).

---

## 1. Facts that are often misreported

| Claim seen in third-party reviews | Fact (verifiable) |
| :--- | :--- |
| "No license" | **MIT** — see [LICENSE](./LICENSE) and `"license": "MIT"` in [package.json](./package.json). |
| "Version 0.5.0 / 0.7.0 / 0.8.0" | Current server version is **0.8.2** ([server.json](./server.json), [package.json](./package.json), `serverInfo.version` in `initialize`). Older per-vertical registry entries point to the same v0.8.2 endpoint. |
| "Why do 12 `io.github.adamgraymon/*` registry entries share tools?" | Those 12 entries in the Official MCP Registry are **Vertical Discovery Gateways (Aliases)** that all route to the same unified, audited `v0.8.2` server (`https://own-adam.onrender.com/mcp`, listed transparently under `officialRegistryNamespaces` in `GET /.well-known/mcp.json`) so agents searching for a specific vertical (Solidity, Quant, Skills, RAG, GPU, Notary) discover the unified node. |
| "Does TrustGate emit the VERITAS-8183 seal?" | **Yes.** `TrustGate` (`io.github.adamgraymon/trustgate-erc8183-mcp`, repo `adamgraymon/Own_adam`) is the official issuer and verifier of the **VERITAS-8183 1★–3★ Seal** via `inspect_veritas_8183_seal`, `register_and_certify_store`, `submit_veritas_tier_upgrade_exam`, and `notarize_and_witness_a2a_deal`. |
| "No refunds" | The escrow contract has `claimTimeoutRefund(jobId)`: after the deadline **anyone** can trigger a **100% refund to the buyer**, no evaluator needed ([contract](./contracts/TrustGateEscrow8183.sol), MCP tool `claim_escrow_timeout_refund`). Rejected deliveries also refund 100% (`submitVerdict(approved=false)`). Seller reserves in [`VeritasRefundableReserveVault.sol`](./contracts/VeritasRefundableReserveVault.sol) are 100% refundable whenever `lockedForClaimsUsdc == 0` ([TERMS.md](./TERMS.md)). |
| "It reads your private keys" | **No.** `EVALUATOR_PRIVATE_KEY` and `GEMINI_API_KEY` are the **operator's own** keys, set in the server environment. Users never provide keys, and no tool asks for private keys or seed phrases. See section 3. |
| "Contains malware" | The strings in [test/fixtures/malicious-samples.js](./test/fixtures/malicious-samples.js) are **deliberate attack samples** used as input data to prove the auditor rejects trojans. They are never imported by the server or executed. |

---

## 1.B. Zero-Execution RAM Sandbox & Isolation Architecture (How Untrusted Code & MCPs Are Contained)

Unlike local CLI scanners (which spawn untrusted MCP processes on the user's machine and risk local shell execution), TrustGate / VERITAS-8183 enforces a **5-layer Zero-Execution Ephemeral RAM Sandbox**:

1. **Zero Arbitrary Code Execution (`No eval / No child_process / No shell`):**
   - Untrusted inputs (`SKILL.md`, bundled scripts, Solidity contracts, CSV/JSON datasets, RAG vectors, and remote MCP `tools/list` responses) are **never executed or spawned**.
   - Skills and scripts are analyzed via deterministic AST/regex/line-by-line static inspection ([src/skillReview.js](./src/skillReview.js), [src/multiVerticalAuditors.js](./src/multiVerticalAuditors.js)).
   - Solidity smart contracts are compiled in an isolated in-memory WebAssembly compiler (`solc 0.8.38`) with zero filesystem imports or OS access.
2. **Ephemeral Per-Request RAM Processing (Zero Disk Retention of Audit Inputs):**
   - All files and payloads sent to `review_agent_skill_free`, `audit_*`, and `manage_buyer_finops_spend_passport` are processed **100% in ephemeral per-request memory** and garbage-collected immediately after the HTTP response is returned ([PRIVACY.md](./PRIVACY.md)). No user audit payload is written to disk or shared across tenants.
3. **SSRF & Network Isolation Guard for Remote MCP Probes ([src/freeTrustCheck.js](./src/freeTrustCheck.js)):**
   - When `check_mcp_server_trust` probes a remote MCP URL, it enforces:
     - `HTTPS`-only transport (rejects `http://`, `file://`, embedded credentials, `localhost`, `.local`, `.internal`).
     - Pre-connect DNS resolution + IPv4/IPv6 private-range firewall (`isPrivateIp` blocks `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16` cloud metadata, `100.64.0.0/10`, `::1`, `fc00::/7`, `fe80::/10`).
     - Zero HTTP redirects allowed (`redirect: "error"`), strict `512 KiB` response cap, `7,000 ms` timeout, and dual-probe anti-cloaking comparison.
4. **Unprivileged Container Runtime ([Dockerfile](./Dockerfile)):**
   - Runs as unprivileged non-root `USER node` inside an isolated cloud container with only **1 production dependency (`solc`)**.
5. **Reproducible Adversarial Benchmark Corpus & Runtime Build Provenance:**
   - Anyone can reproduce our adversarial detection tests locally in 3 seconds:
     ```bash
     node --test test/freeTrustCheck.test.js test/escrow.test.js test/privacy.test.js
     ```
   - Attack fixtures: [test/fixtures/malicious-samples.js](./test/fixtures/malicious-samples.js). Live public audit results: [`GET https://own-adam.onrender.com/trust`](https://own-adam.onrender.com/trust) (`40` MCP servers) & [`GET https://own-adam.onrender.com/skills/review`](https://own-adam.onrender.com/skills/review) (`50` agent skills).
   - **Verifiable GitHub ↔ Running Server Correspondence:** `GET https://own-adam.onrender.com/healthz` and `GET https://own-adam.onrender.com/mcp/server-card` publish the active `gitCommitSha` (`RENDER_GIT_COMMIT`) and live `toolManifestSha256` matching this repository.

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
| **Sourcify v2 Smart Contract Verification & BaseScan** | **`exact_match` (#59283147) on Base Mainnet** — Direct JSON API: https://sourcify.dev/server/v2/contract/8453/0xd4f77bf843b3c359b233aca46d7ff6604cbd0a5e · BaseScan: https://basescan.org/address/0xD4f77Bf843b3c359B233ACa46d7Ff6604CBD0a5e |
| **VERITAS-8183 Public Seal REST API** | **No MCP client required:** https://own-adam.onrender.com/api/seal · by store ID: https://own-adam.onrender.com/api/seal/databento-raw-tick |
| **Refundable Seller Reserve Vault & Escrow Terms** | [`VeritasRefundableReserveVault.sol`](./contracts/VeritasRefundableReserveVault.sol) (`solc 0.8.38`) & [TERMS.md](./TERMS.md) — https://own-adam.onrender.com/terms |
| **Live External M2M Traffic & Tool Executions (Upstash Redis)** | **`109,020+` external M2M requests (`~891/hr` overnight avg — 100k+ reached in 7 days), `82,980+` MCP JSON-RPC calls, `20/23` MCP tools called externally (`185+` external `tools/call` executions & `254+` total tool/catalog uses including `54` escrow, contract audit & catalog settlement calls: `11` `audit_smart_contract_escrow`, `11` `purchase_firstparty_catalog_item`, `9` `verify_onchain_escrow_status`, `8` `quote_multitoken_escrow`, `4` `open_escrow_job`, `4` `claim_escrow_timeout_refund`, `2` `submit_encrypted_deliverable`, etc.)** — https://own-adam.onrender.com/api/external-traffic |
| **Continuous Hardening in the Open (Live Security Probe Log)** | When an external security probe (`OVERWRITE-PROOF-43923`) tested store-ID collision on `register_and_certify_store`, our public telemetry immediately surfaced the probe and we enforced strict wallet-bound ownership & reserved-ID locking (`HTTP 409 STORE_ID_RESERVED_BY_PROTOCOL` / `STORE_ID_ALREADY_CLAIMED`, commit `8a18b46`). |
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

**中文：** 本服务器（`TrustGate` / `io.github.adamgraymon/trustgate-erc8183-mcp`，GitHub 仓库 `adamgraymon/Own_adam`）签发 `VERITAS-8183` 1-3 星质量印章。为远程非托管服务，无法访问用户的电脑、文件、环境变量或钱包。用户从不需要提供私钥。`EVALUATOR_PRIVATE_KEY` 只能批准（向卖家支付约定金额减去手续费）或拒绝（向买家 100% 退款）。截止时间过后，任何人都可以触发 100% 退款。合约已在 Base 上部署并通过 Sourcify 验证（#59283147），M8ven 独立评分为 89/100（代码得分 100/100，0 CVE）。我们公开实时遥测数据（93,040+ 次外部请求，20/23 个工具已被外部智能体调用 169+ 次，持久化在 Upstash Redis 中），因为如果我们的目标是保护客户并实现透明，我们自己必须首先做到公开透明与自我加固。

**Español:** El servidor (`TrustGate` / `io.github.adamgraymon/trustgate-erc8183-mcp`, repositorio `adamgraymon/Own_adam`) es el emisor oficial del Sello de Calidad `VERITAS-8183` (1 a 3 estrellas). Es remoto y no custodio: no tiene acceso a tu equipo, archivos, variables de entorno ni billeteras, y nunca pedimos claves privadas. `EVALUATOR_PRIVATE_KEY` solo puede aprobar (pagar al vendedor lo acordado menos la comisión) o rechazar (devolver el 100% al comprador), nunca enviar fondos a otra dirección. Vencido el plazo, cualquiera puede activar el reembolso del 100% (`claimTimeoutRefund`). El contrato está desplegado en Base Mainnet y verificado en Sourcify (`#59283147`), cuenta con calificación independiente de M8ven (`89/100 · Grade B · Emerging`, `Code Score 100/100`, `0 CVEs`), y su estado y telemetría en producción (`93,040+` peticiones externas M2M, `20/23` herramientas ejecutadas `169+` veces por agentes externos, incluyendo `41` llamadas a herramientas de escrow y contratos) persisten en Upstash Redis (`https://own-adam.onrender.com/api/external-traffic`). Hacemos públicas nuestras métricas en tiempo real (protegiendo siempre la privacidad individual de cada cliente) porque si nuestra misión es brindar transparencia y blindar a nuestros clientes, nosotros mismos debemos ser los primeros en blindarnos y ser transparentes en público.

---

## 7. Reporting a vulnerability

Open a GitHub issue at https://github.com/adamgraymon/Own_adam/issues (title prefix `[security]`; do not post exploit details publicly — ask for a private channel in the issue).
