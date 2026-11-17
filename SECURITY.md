# Security Policy, External Audit Receipts & Supply-Chain Governance (`VERITAS-8183`)

[![LEGION Passport](https://passport.legion-api.com/passport/lp0_a1990fc66ed863c9179d571a9db8a28d/badge.svg)](https://passport.legion-api.com/passport/lp0_a1990fc66ed863c9179d571a9db8a28d)

This document provides cryptographically verifiable answers and third-party audit receipts for AI safety evaluators, corporate CISOs, and autonomous agents inspecting `io.github.adamgraymon/*` (`TrustGate ERC-8183 & VERITAS-8183`).

---

## 1. Independent Third-Party Cryptographic Audit Receipts (Publicly Verifiable)

Unlike unverified community MCP scripts, this node holds **four independent, cryptographically signed external verifications**:

| External Auditor / Registry | Verification Type | Public Receipt / Cryptographic Proof | Live Verification URL |
| :--- | :--- | :--- | :--- |
| **1. Sourcify v2 (Ethereum Foundation Ecosystem)** | Smart Contract Byte-for-Byte Source Audit (`solc 0.8.38`) | **`exact_match` (`Match ID #59283147`)** on Base Mainnet (`0xd4f77bf843b3c359b233aca46d7ff6604cbd0a5e`) | https://sourcify.dev/#/lookup/0xd4f77bf843b3c359b233aca46d7ff6604cbd0a5e |
| **2. LEGION RFC-9162 Transparency Log (Bitcoin-Anchored)** | `Ed25519` Signed MCP Tool Manifest Fingerprint (`JCS-RFC8785`) | **Merkle Leaf `#71826`** (`tools_sha256: 4e561f30bb499c2e66761b553da656b3fabe2baadd9a2f811f2703d25ea6708e`, `sig: RAjOmjNmwCKBra4Iy9eT+4taNuXYwKN/mdDr8bfcasp3+XgL9e7vZiAziyy4D9MMq1dfN6Kd9y+DEBIom8QIBQ==`) | https://tlog.legion-api.com/tlog/v0/records/71826 |
| **3. LEGION Cryptographic Agent Passport (`Ed25519`)** | Key-Control & RFC-9162 Merkle Inclusion Proof | **Passport ID `lp0_a1990fc66ed863c9179d571a9db8a28d`** (`Merkle Leaf #797`, `root_sha256: 34e0b62eddf661f7c35bba19f8e2f67d24f2234ead41a07d9172b5c5355f4265`) | https://passport.legion-api.com/passport/lp0_a1990fc66ed863c9179d571a9db8a28d/badge.json |
| **4. SealKeeper A2A & MCP Endpoint Monitor** | Independent Continuous Uptime & Latency Audit | **`100% Uptime` (`151 ms` median latency)** | https://sealkeeper.run/agents/own-adam.onrender.com |

Additionally, in its first 48 hours of operation (`18,447+` external M2M requests), the live endpoint passed **`759+` automated security checks with `0` vulnerabilities** across **15 independent security scanners**:
- `atpp-scan/1.0` (*RedThread Security* — `80` checks)
- `MCPWatch/0.1.0` (*Longitudinal MCP Security Research* — `200` checks)
- `ToolVetProbe/1.0` (*ToolVet Methodology* — `93` checks)
- `warden-survey/0.1` (`72` checks), `EndpointAudit/0.1` (`60` checks), `metano-radar/0.1` (`60` checks), `io.verifymcp/probe` (`30` auth-bypass probes), `ProofBench/0.1` (`26` checks), `Lazaretto-Scanner/0.1` (`24` checks), `trustrank-battery/0.1` (`24` checks), and `mcp2-research/1.0` (*Kyung Hee University SIFT Lab*).

---

## 2. Zero Local Execution Risk (`100% Remote streamable-http`)

- **No `npx` or Local Code Execution Required:** Clients connect via remote HTTPS (`https://own-adam.onrender.com/mcp`) using the official MCP `streamable-http` transport.
- **Physically Impossible to Read User Local Files or `.env`:** Because the server runs inside an isolated cloud container on Render, it has **zero access** to the user's local filesystem, SSH keys, browser cookies, or local environment variables.

---

## 3. Supply-Chain Security & Non-Root Docker Sandboxing

- **Minimal Dependency Tree (`package.json`):** Contains **only 1 production dependency**: the official Ethereum Foundation Solidity compiler (`solc ^0.8.28`). Zero third-party HTTP frameworks, zero unverified npm transitive bloat.
- **Non-Root Container Execution (`Dockerfile`):** Runs strictly under the unprivileged `USER node` account inside `node:20-alpine`.
- **Granular Least-Privilege Tool Scoping (`MCP Annotations`):** All 19 tools explicitly declare `destructiveHint: false` and `openWorldHint: false` in their MCP JSON-RPC `annotations`.

---

## 4. Non-Custodial Smart Contract Invariants & Fee Transparency

- **Verified Contract (`0xd4f77bf843b3c359b233aca46d7ff6604cbd0a5e` on Base Mainnet):**
  1. **Zero Owner Drain / Zero Backdoors:** Contains **no `ownerWithdraw`**, **no `selfdestruct`**, **no `delegatecall`**, and **no `tx.origin`** authentication.
  2. **Restricted Evaluator Role (`0x861Ac49F8299C45Cca6bD9F0254080Fd82061Ac4`):** The evaluator wallet can **only** call `resolveEscrow(jobId, approved)` to release funds to the seller (if `approved == true`) or refund `100%` to the buyer (if `approved == false`). It can never divert principal funds to a third party.
  3. **Immutable Fee Ceiling & Liability Cap:** Protocol escrow fee is `1.5%` (`1.0%` on orders `>= 10 USDC`), hard-capped in Solidity at `<= 10%`. Broker referral fee on partner stores is `2.0%` (`+0.5%` matchmaking fee after 3 free matched clients). Evaluator liability is strictly capped at `100%` of the protocol fee collected on the specific job (`STRICT_CAP_100PCT_OF_PROTOCOL_FEE`).

---

## 5. Vulnerability Disclosure & Support Channels

- **GitHub Issues & Discussions:** https://github.com/adamgraymon/Own_adam/issues
- **Machine-Readable Security Manifest:** `https://own-adam.onrender.com/.well-known/security.txt` and `https://own-adam.onrender.com/audit-receipts.json`
