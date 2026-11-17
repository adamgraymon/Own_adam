# VERITAS / TrustGate — Data & Privacy Policy · Política de datos · 数据与隐私政策 (v1.0.0)

Two businesses, two rules. SECURITY & ESCROW clients are private. SELLERS who register in the PUBLIC NOTARY accept that their listing is public. Traffic is only shared as anonymous aggregates.

Dos negocios, dos reglas. Los clientes de SEGURIDAD y ESCROW son privados. Los VENDEDORES que se registran en la NOTARÍA PÚBLICA aceptan que su ficha sea pública. El tráfico solo se comparte como agregados anónimos.

两项业务，两套规则。【安全与托管】客户的数据是私密的。在【公共公证处】注册的【卖家】同意公开其店铺信息。流量数据仅以匿名汇总形式共享。

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

- 绝不公开、绝不出售、绝不用于建立潜在客户名单。
- 提交给 audit_* 工具的内容（代码、数据集、技能、向量嵌入）仅在内存中处理，响应后不会保存。托管交付物在结算前始终保持加密。
- 不会展示给卖家。使用安全工具【不会】将您登记为买家。

## 2. PUBLIC BY CONSENT (public notary registry)
- Sellers registered with register_and_certify_store and acceptPublicRegistryTerms=true
- Buyers who set listMeInBuyerDirectory=true
- Existence of notarial records (id, date, hash, seller star level)

**Seller terms (v1.0.0)**

By registering a store in the VERITAS public notary registry you agree that the following is PUBLIC and may be shown, ranked and included in paid market reports: store id and name, endpoint URL, payout wallet address, category (vertical), market tier, starting price, star level, audit verdicts and their dates, reputation score, verified reviews and usage statistics of your listing (views, searches that matched your category, deals closed). The CONTENT of your deliverables, your buyers' identities and the content of notarized deals are NOT published. You can request removal at any time; past notarial records (hashes and dates) are kept as an append-only public log.

Al registrar una tienda en el registro notarial público VERITAS aceptas que lo siguiente es PÚBLICO y puede mostrarse, rankearse e incluirse en informes de mercado de pago: id y nombre de la tienda, URL del endpoint, wallet de cobro, rubro (vertical), segmento, precio inicial, nivel de estrellas, veredictos de auditoría y sus fechas, reputación, reseñas verificadas y estadísticas de uso de tu ficha (vistas, búsquedas que coincidieron con tu rubro, tratos cerrados). NO se publica el CONTENIDO de tus entregables, la identidad de tus compradores ni el contenido de los tratos notariados. Puedes pedir la baja cuando quieras; los registros notariales pasados (hashes y fechas) se conservan como registro público de solo-añadir.

在 VERITAS 公共公证登记处注册店铺，即表示您同意以下信息为【公开】信息，可被展示、排名并纳入付费市场报告：店铺 ID 与名称、端点 URL、收款钱包地址、类别（垂直领域）、市场层级、起始价格、星级、审计结论及其日期、信誉分、经验证的评价，以及您店铺页面的使用统计（浏览量、与您类别匹配的搜索次数、已成交的交易）。您交付物的【内容】、您买家的身份以及经公证交易的内容【不会】被公开。您可随时申请下架；过往的公证记录（哈希值与日期）将作为只可追加的公开日志保留。

**Buyer directory (opt-in)**

Optional. If you set listMeInBuyerDirectory=true, 2-3 star sellers can see your buyer id, budget limits, categories of interest and RFQ text, and can send you offers. Default is false: your passport stays private.

Opcional. Si envías listMeInBuyerDirectory=true, los vendedores de 2-3 estrellas pueden ver tu id de comprador, límites de presupuesto, rubros de interés y texto de solicitud, y enviarte ofertas. Por defecto es false: tu pasaporte queda privado.

可选。若设置 listMeInBuyerDirectory=true，2-3 星卖家可以看到您的买家 ID、预算上限、感兴趣的类别和询价内容，并可向您发送报价。默认值为 false：您的护照保持私密。

## 3. AGGREGATED ANONYMOUS (traffic)
- Shared or sold only as counts by sector, endpoint, tool and keyword.
- No individual agent is named in public or paid reports.
- Raw request details are visible only to the operator, protected by a secret key, kept in memory (last 40 events).

- Se comparte o vende solo como conteos por rubro, endpoint, herramienta y palabra clave.
- Ningún agente individual aparece con nombre en informes públicos o de pago.
- El detalle bruto solo lo ve el operador, protegido por clave secreta, en memoria (últimos 40 eventos).

- 仅以按类别、端点、工具和关键词统计的数量形式共享或出售。
- 公开或付费报告中不会点名任何单个智能体。
- 原始请求详情仅运营者可见，受密钥保护，仅保存在内存中（最近 40 条事件）。

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

这些密钥属于【运营者】，仅存在于服务器环境中。用户从不需要提供这些密钥，也没有任何工具会索取您的私钥。

- `EVALUATOR_PRIVATE_KEY`: Signs evaluator verdicts on the escrow contract (0xd4f7...0a5e). It cannot withdraw escrowed funds to arbitrary addresses: the contract only pays the seller (approved) or refunds the buyer (rejected/timeout). Rotatable by the contract owner (rotateEvaluatorKey).
- `GEMINI_API_KEY`: Optional. Used only for a second-opinion review of up to 30 sampled dataset rows. If absent, a local heuristic judge is used. Billed to the operator, never to users.
- `UPSTASH_REDIS_REST_URL_AND_TOKEN`: Optional. Stores the public trust-check history so it survives restarts.
- `OWNER_DASHBOARD_KEY`: Protects the operator's raw traffic view.

## Contact
Open an issue at https://github.com/adamgraymon/Own_adam/issues (removal requests, privacy questions).
