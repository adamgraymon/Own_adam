# Security Policy — TrustGate / VERITAS (`io.github.adamgraymon/*`)

This page explains, in plain language, what this server can and cannot do, which keys it uses, and what is still pending.
Privacy rules (who is private and who is public) are in [PRIVACY.md](./PRIVACY.md) and live at https://own-adam.onrender.com/privacy.

---

## 1. Facts that are often misreported

| Claim seen in third-party reviews | Fact (verifiable) |
| :--- | :--- |
| "No license" | **MIT** — see [LICENSE](./LICENSE) and `"license": "MIT"` in [package.json](./package.json). |
| "Version 0.5.0" | Current server version is **0.7.0** ([server.json](./server.json), `serverInfo.version` in `initialize`). Some older registry listings still show 0.5.0 and are being republished. |
| "No refunds" | The contract has `claimTimeoutRefund(jobId)`: after the deadline **anyone** can trigger a **100% refund to the buyer**, no evaluator needed ([contract](./contracts/TrustGateEscrow8183.sol)). It is exposed as the MCP tool `claim_escrow_timeout_refund`. Rejected deliveries are also refunded 100% (`submitVerdict(approved=false)`). |
| "It reads your private keys" | **No.** `EVALUATOR_PRIVATE_KEY` and `GEMINI_API_KEY` are the **operator's own** keys, set in the server environment. Users never provide keys, and no tool asks for private keys or seed phrases. See section 3. |
| "Contains malware" | The strings in [test/fixtures/malicious-samples.js](./test/fixtures/malicious-samples.js) are **deliberate attack samples** used as input data to prove the auditor rejects trojans. They are never imported by the server or executed. |

---

## 2. Current status — what is real and what is simulated

We prefer to say this clearly rather than let a reviewer discover it:

| Component | Status |
| :--- | :--- |
| Escrow smart contract on Base (`0xd4f77bf843b3c359b233aca46d7ff6604cbd0a5e`) | **Real**, deployed, source verified on Sourcify (`exact_match`, #59283147). |
| On-chain payment verification (`paymentTxHash`) | **Real**: reads the Base receipt and checks a USDC transfer to the treasury, with anti-replay. |
| MCP escrow tools (`open_escrow_job`, `submit_encrypted_deliverable`, `claim_escrow_timeout_refund`) | **Simulated ledger in server memory.** They demonstrate the flow and run the real audits, but do **not** move on-chain funds yet. On-chain settlement is done by separate operator scripts. |
| Audit engines (Solidity via `solc`, skills, RAG, inference, GPU, backtests, datasets) | **Real** deterministic checks on the data you send. |
| `check_mcp_server_trust` | **Real** live probe of the target MCP server. Methodology: `/trust/methodology`. |
| Providers and buyers labeled `[DEMO]` | **Fictional**, used by the internal simulation. Real sellers appear only after `register_and_certify_store`. |

---

## 3. Server-side keys (operator only)

| Variable | Purpose | Limits |
| :--- | :--- | :--- |
| `EVALUATOR_PRIVATE_KEY` | Signs verdicts on the escrow contract. | The contract only lets it **approve** (pay the seller the agreed amount minus fee) or **reject** (refund the buyer 100%). It cannot send funds to any other address or change recipients. |
| `GEMINI_API_KEY` | Optional second-opinion review of up to 30 sampled dataset rows. | If absent, a local heuristic judge is used. Billed to the operator. |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | Optional persistence of the public trust-check history. | Stores only public metadata of checked MCP servers. |
| `OWNER_DASHBOARD_KEY` | Protects the operator's raw traffic view. | Without it, only anonymous aggregates are served. |

---

## 4. Known limitations (honest list)

1. **Single evaluator.** One key decides approve/reject. Mitigations today: rejection always refunds 100%, the timeout refund needs no evaluator, verdicts carry an audit attestation hash, and the owner can rotate a compromised key (`rotateEvaluatorKey`). Not yet: multi-evaluator quorum or an independent dispute process. Roadmap item.
2. **Owner can rotate the evaluator.** This is a trust assumption on the operator.
3. **New project, single maintainer, no community review yet.** Issues and reviews are welcome.
4. **Remote service.** Data you send to audit tools reaches the server. Don't send secrets or confidential code you are not allowed to share. Audit inputs are not stored after the response (see PRIVACY.md).
5. **Some heuristics are sealed** (`veritasEncryptedVaultLoader.js`). We plan to publish the auditor rules so they can be reviewed.

---

## 5. Remote-only, no local access

Clients connect over HTTPS (`https://own-adam.onrender.com/mcp`). The server runs in a cloud container and has no access to the user's machine, files, environment variables or wallets. It runs as unprivileged `USER node` ([Dockerfile](./Dockerfile)) with one production dependency (`solc`).

---

## 6. Independent, verifiable receipts

| Receipt | Link |
| :--- | :--- |
| Sourcify contract verification (`exact_match`, #59283147) | https://sourcify.dev/#/lookup/0xd4f77bf843b3c359b233aca46d7ff6604cbd0a5e |
| LEGION signed tool-manifest log (leaf #71826) | https://tlog.legion-api.com/tlog/v0/records/71826 |
| LEGION agent passport | https://passport.legion-api.com/passport/lp0_a1990fc66ed863c9179d571a9db8a28d |
| SealKeeper uptime monitor | https://sealkeeper.run/agents/own-adam.onrender.com |

Note: many security crawlers visit this endpoint. Visits are **not** audit passes, and we do not claim results we cannot link to.

---

## 7. Reporting a vulnerability

Open a GitHub issue at https://github.com/adamgraymon/Own_adam/issues (title prefix `[security]`; do not post exploit details publicly — ask for a private channel in the issue).
