# VERITAS / TrustGate — Data & Privacy Policy (v1.0.0)

Two businesses, two rules. SECURITY & ESCROW clients are private. SELLERS who register in the PUBLIC NOTARY accept that their listing is public. Traffic is only shared as anonymous aggregates.

Dos negocios, dos reglas. Los clientes de SEGURIDAD y ESCROW son privados. Los VENDEDORES que se registran en la NOTARÍA PÚBLICA aceptan que su ficha sea pública. El tráfico solo se comparte como agregados anónimos.

## 1. PRIVATE (security & escrow clients)
- Security audits: audit_smart_contract_escrow, audit_agent_skill_escrow, audit_rag_embeddings_escrow, audit_ai_inference_escrow, audit_quant_backtest_escrow, audit_api_sla_escrow, audit_depin_gpu_sla_escrow
- Escrow: open_escrow_job, submit_encrypted_deliverable, claim_escrow_timeout_refund
- Trust checks: check_mcp_server_trust (who asked is private; the checked server's public metadata and score are public)
- Buyers: manage_buyer_finops_spend_passport (unless the buyer opts in to the directory)
- Content of notarized deals

- Never published, never sold, never used to build lead lists.
- Inputs to audit_* tools (code, datasets, skills, embeddings) are processed in memory and not stored after the response. Escrow deliverables stay encrypted until settlement.
- Not shown to sellers. Calling a security tool does NOT register you as a buyer.

- Nunca se publica, nunca se vende, nunca se usa para armar listas de leads.
- Lo que envías a las herramientas audit_* (código, datasets, skills, embeddings) se procesa en memoria y no se guarda tras la respuesta. Los entregables de escrow quedan cifrados hasta la liquidación.
- No se muestra a vendedores. Usar una herramienta de seguridad NO te registra como comprador.

## 2. PUBLIC BY CONSENT (public notary registry)
- Sellers registered with register_and_certify_store and acceptPublicRegistryTerms=true
- Buyers who set listMeInBuyerDirectory=true
- Existence of notarial records (id, date, hash, seller star level)

**Seller terms (v1.0.0)**

By registering a store in the VERITAS public notary registry you agree that the following is PUBLIC and may be shown, ranked and included in paid market reports: store id and name, endpoint URL, payout wallet address, category (vertical), market tier, starting price, star level, audit verdicts and their dates, reputation score, verified reviews and usage statistics of your listing (views, searches that matched your category, deals closed). The CONTENT of your deliverables, your buyers' identities and the content of notarized deals are NOT published. You can request removal at any time; past notarial records (hashes and dates) are kept as an append-only public log.

Al registrar una tienda en el registro notarial público VERITAS aceptas que lo siguiente es PÚBLICO y puede mostrarse, rankearse e incluirse en informes de mercado de pago: id y nombre de la tienda, URL del endpoint, wallet de cobro, rubro (vertical), segmento, precio inicial, nivel de estrellas, veredictos de auditoría y sus fechas, reputación, reseñas verificadas y estadísticas de uso de tu ficha (vistas, búsquedas que coincidieron con tu rubro, tratos cerrados). NO se publica el CONTENIDO de tus entregables, la identidad de tus compradores ni el contenido de los tratos notariados. Puedes pedir la baja cuando quieras; los registros notariales pasados (hashes y fechas) se conservan como registro público de solo-añadir.

**Buyer directory (opt-in)**

Optional. If you set listMeInBuyerDirectory=true, 2-3 star sellers can see your buyer id, budget limits, categories of interest and RFQ text, and can send you offers. Default is false: your passport stays private.

Opcional. Si envías listMeInBuyerDirectory=true, los vendedores de 2-3 estrellas pueden ver tu id de comprador, límites de presupuesto, rubros de interés y texto de solicitud, y enviarte ofertas. Por defecto es false: tu pasaporte queda privado.

## 3. AGGREGATED ANONYMOUS (traffic)
- Shared or sold only as counts by sector, endpoint, tool and keyword.
- No individual agent is named in public or paid reports.
- Raw request details are visible only to the operator, protected by a secret key, kept in memory (last 40 events).

- Se comparte o vende solo como conteos por rubro, endpoint, herramienta y palabra clave.
- Ningún agente individual aparece con nombre en informes públicos o de pago.
- El detalle bruto solo lo ve el operador, protegido por clave secreta, en memoria (últimos 40 eventos).

## Retention
- **auditInputs**: Inputs to the 7 audit_* tools are processed in memory and not stored after the response.
- **escrowDeliverables**: Kept AES-256-GCM encrypted in server memory until the escrow settles; the decryption key is released only to the buyer. Lost on restart.
- **rawTrafficEvents**: Memory only, last 40 events, lost on restart. IPs are never stored in clear: only a truncated SHA-256 hash of IP+user-agent.
- **trustCheckHistory**: Per checked server (public endpoint metadata): last 50 checks, persisted.
- **freeQuotaCounters**: Per day, memory only.
- **sellerRegistry**: Until removal is requested; notarial hashes are append-only.

## Server-side keys (operator only)
These keys belong to the OPERATOR and live only in the server environment. Users never provide them, and no tool asks for your private keys.

Estas claves son del OPERADOR y viven solo en el entorno del servidor. Los usuarios nunca las entregan y ninguna herramienta pide tus claves privadas.

- `EVALUATOR_PRIVATE_KEY`: Signs evaluator verdicts on the escrow contract (0xd4f7...0a5e). It cannot withdraw escrowed funds to arbitrary addresses: the contract only pays the seller (approved) or refunds the buyer (rejected/timeout). Rotatable by the contract owner (rotateEvaluatorKey).
- `GEMINI_API_KEY`: Optional. Used only for a second-opinion review of up to 30 sampled dataset rows. If absent, a local heuristic judge is used. Billed to the operator, never to users.
- `UPSTASH_REDIS_REST_URL_AND_TOKEN`: Optional. Stores the public trust-check history so it survives restarts.
- `OWNER_DASHBOARD_KEY`: Protects the operator's raw traffic view.

## Contact
Open an issue at https://github.com/adamgraymon/Own_adam/issues (removal requests, privacy questions).
