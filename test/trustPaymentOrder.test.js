import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { EventEmitter, once } from "node:events";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { extractDiscoveryInfo, validateDiscoveryExtension } from "@x402/extensions/bazaar";
import { x402Client, x402HTTPClient, wrapFetchWithPayment } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const projectDir = fileURLToPath(new URL("..", import.meta.url));
const serverUrl = "https://93.184.216.34/mcp";
const paymentTxHash = "0x" + "ab".repeat(32);
const paymentRecoveryToken = "cd".repeat(32);
const ownerDashboardKey = "fixture-owner-dashboard-key";

const childScript = String.raw`
import assert from "node:assert/strict";
import { once } from "node:events";
import fs from "node:fs/promises";
import path from "node:path";
import { authorizationTypes } from "@x402/evm";
import { encodeAbiParameters, encodeEventTopics, parseAbiItem, verifyTypedData } from "viem";

const upstreamServices = new Map([
  ["https://mainnet.base.org/", "base"],
  ["https://93.184.216.34/mcp", "target"],
]);
globalThis.fetch = async (url, options) => {
  const endpoint = new URL(url);
  const call = JSON.parse(options?.body ?? "{}");
  const service = upstreamServices.get(endpoint.href) ?? "unexpected";
  process.send({ type: "upstream", service, method: call.method });

  if (service === "base") {
    if (call.method !== "eth_getTransactionReceipt") throw new Error("Unexpected Base RPC method");
    return Response.json({ jsonrpc: "2.0", id: call.id, result: {
      transactionHash: call.params[0],
      status: "0x1",
      blockNumber: "0x1",
      logs: [{
        address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
        topics: [
          "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
          "0x" + "0".repeat(24) + "1".repeat(40),
          "0x000000000000000000000000861ac49f8299c45cca6bd9f0254080fd82061ac4",
        ],
        data: "0x3d090",
      }],
    } });
  }

  if (service !== "target") throw new Error("Unexpected upstream URL");
  if (call.method === "initialize") {
    if (process.env.TEST_PROBE_MODE === "pause") {
      const released = once(process, "message");
      process.send({ type: "probe-paused" });
      await released;
    }
    if (process.env.TEST_PROBE_MODE === "fail") {
      return new Response(null, { status: 503 });
    }
    return Response.json({ jsonrpc: "2.0", id: call.id, result: {
      protocolVersion: "2025-06-18",
      serverInfo: { name: "fixture", version: "1.0.0" },
      capabilities: { tools: {} },
    } });
  }
  if (call.method === "notifications/initialized") return new Response(null, { status: 202 });
  if (call.method === "tools/list") {
    return Response.json({ jsonrpc: "2.0", id: call.id, result: {
      tools: [{
        name: "read_notes",
        description: "Read Notes",
        annotations: { readOnlyHint: true },
        inputSchema: { type: "object" },
      }],
    } });
  }
  throw new Error("Unexpected target method");
};

const { createLabServer } = await import("./src/server.js");
const server = createLabServer({
  x402Sandbox: process.env.TEST_X402_SANDBOX === "1",
  x402Cdp: process.env.TEST_X402_CDP === "1" ? mockCdpFault() : undefined,
});
if (process.env.TEST_PROBE_MODE === "pause") {
  server.prependListener("request", (_req, res) => {
    const end = res.end;
    res.end = function (data, ...rest) {
      const result = end.call(this, data, ...rest);
      const body = JSON.parse(data);
      if (body.id === 1) process.send({ type: "attempted-delivery", body });
      return result;
    };
  });
}
server.listen(Number(process.env.TEST_PORT) || 0, "127.0.0.1", () => {
  process.send({ type: "listening", port: server.address().port });
});

function mockCdpFault() {
  const chainFile = path.join(process.env.TRUST_ORDER_DATA_DIR, "cdp-fixture-chain.json");
  const asset = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  const recipient = "0x1111111111111111111111111111111111111111";
  const transactionHash = "0x" + "5a".repeat(32);
  const blockHash = "0x" + "b0".repeat(32);
  const minedBlock = 1001n;
  const authorizationUsed = parseAbiItem("event AuthorizationUsed(address indexed authorizer, bytes32 indexed nonce)");
  const transfer = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)");
  const track = (service, method) => process.send({ type: "upstream", service, method });

  async function readSettlement() {
    try {
      return JSON.parse(await fs.readFile(chainFile, "utf8"));
    } catch (error) {
      if (error.code === "ENOENT") return null;
      throw error;
    }
  }

  function authorizationLog({ payer, nonce }) {
    return {
      address: asset,
      transactionHash,
      blockHash,
      blockNumber: minedBlock,
      logIndex: 0,
      removed: false,
      topics: encodeEventTopics({ abi: [authorizationUsed], args: { authorizer: payer, nonce } }),
      data: "0x",
    };
  }

  return {
    recipient,
    facilitator: {
      async getSupported() {
        track("cdp", "supported");
        return { kinds: [{ x402Version: 2, scheme: "exact", network: "eip155:84532" }], extensions: [], signers: {} };
      },
      async verify(payment, requirements) {
        track("cdp", "verify");
        assert.equal(requirements.asset.toLowerCase(), asset.toLowerCase());
        assert.equal(requirements.network, "eip155:84532");
        assert.equal(requirements.amount, "250000");
        assert.equal(requirements.payTo.toLowerCase(), recipient.toLowerCase());
        const { authorization, signature } = payment.payload;
        const { from, to, value, validAfter, validBefore, nonce } = authorization;
        assert.equal(to.toLowerCase(), recipient.toLowerCase());
        assert.equal(value, requirements.amount);
        const isValid = await verifyTypedData({
          address: from,
          domain: { name: "USDC", version: "2", chainId: 84532, verifyingContract: asset },
          types: authorizationTypes,
          primaryType: "TransferWithAuthorization",
          message: { from, to, value: BigInt(value), validAfter: BigInt(validAfter), validBefore: BigInt(validBefore), nonce },
          signature,
        });
        return { isValid, payer: from };
      },
      async settle(payment) {
        track("cdp", "settle");
        const { from: payer, nonce, value } = payment.payload.authorization;
        const file = await fs.open(chainFile, "wx", 0o600);
        try {
          await file.writeFile(JSON.stringify({ payer, nonce, value, recipient, transactionHash }));
          await file.sync();
        } finally {
          await file.close();
        }
        process.send({ type: "cdp-chain-settled" });
        // The chain has confirmed, but the facilitator never delivers its response.
        await once(process, "message");
        throw new Error("Simulated lost CDP response");
      },
    },
    chain: {
      async getChainId() {
        track("chain", "chainId");
        return 84532;
      },
      async getBlockNumber() {
        track("chain", "blockNumber");
        return await readSettlement() ? minedBlock + 5n : minedBlock - 1n;
      },
      async getBlock() {
        return { number: minedBlock + 5n, timestamp: BigInt(Math.floor(Date.now() / 1000)) };
      },
      async readContract({ address, functionName, args }) {
        assert.equal(address.toLowerCase(), asset.toLowerCase());
        assert.equal(functionName, "authorizationState");
        const settled = await readSettlement();
        return Boolean(settled && args[0].toLowerCase() === settled.payer.toLowerCase() && args[1] === settled.nonce);
      },
      async getLogs({ address, event, args, fromBlock, toBlock }) {
        track("chain", "getLogs");
        assert.equal(address.toLowerCase(), asset.toLowerCase());
        assert.equal(event.name, "AuthorizationUsed");
        const settled = await readSettlement();
        if (!settled || args.authorizer.toLowerCase() !== settled.payer.toLowerCase() || args.nonce !== settled.nonce ||
            fromBlock > minedBlock || toBlock < minedBlock) return [];
        return [{ ...authorizationLog(settled), args: { authorizer: settled.payer, nonce: settled.nonce } }];
      },
      async getTransactionReceipt({ hash }) {
        track("chain", "getTransactionReceipt");
        assert.equal(hash, transactionHash);
        const settled = await readSettlement();
        assert.ok(settled);
        return {
          status: "success",
          transactionHash,
          blockHash,
          blockNumber: minedBlock,
          logs: [
            authorizationLog(settled),
            {
              address: asset,
              transactionHash,
              blockHash,
              blockNumber: minedBlock,
              logIndex: 1,
              removed: false,
              topics: encodeEventTopics({ abi: [transfer], args: { from: settled.payer, to: recipient } }),
              data: encodeAbiParameters([{ type: "uint256" }], [BigInt(settled.value)]),
            },
          ],
        };
      },
    },
  };
}
`;

async function createSandbox(t) {
  const tempRoot = path.resolve(os.tmpdir());
  const dir = await fs.mkdtemp(path.join(tempRoot, "trust-payment-orders-"));
  const dependencies = path.join(dir, "node_modules");
  const ordersDir = path.join(dir, "orders");
  const children = [];
  t.after(async () => {
    await Promise.all(children.map(({ stop }) => stop()));
    try {
      await fs.unlink(dependencies);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    if (path.dirname(dir) === tempRoot && path.basename(dir).startsWith("trust-payment-orders-")) {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  await fs.cp(path.join(projectDir, "src"), path.join(dir, "src"), { recursive: true });
  await fs.symlink(
    path.join(projectDir, "node_modules"),
    dependencies,
    process.platform === "win32" ? "junction" : "dir",
  );
  await fs.writeFile(path.join(dir, "package.json"), '{"type":"module"}\n');
  // AgenticEscrowLedger reads the repo-root wallet file during construction.
  // Use an isolated fixture, including when the source repo has real keys.
  await fs.writeFile(path.join(dir, ".env.example"), "# test fixture\n");
  await fs.writeFile(path.join(dir, ".env"), [
    "EVALUATOR_SIGNER_HEX=0x" + "12".repeat(32),
    "TREASURY_PUBLIC_ADDRESS=0x861ac49f8299c45cca6bd9f0254080fd82061ac4",
    "",
  ].join("\n"), { mode: 0o600 });

  return {
    x402OrderDir: path.join(ordersDir, "x402-sandbox"),
    x402CdpOrderDir: path.join(ordersDir, "x402-cdp-sepolia"),
    cdpChainFile: path.join(ordersDir, "cdp-fixture-chain.json"),
    async start(probeMode = "ok", { x402Sandbox = false, x402Cdp = false, port: listenPort = 0 } = {}) {
      const env = Object.fromEntries(
        Object.entries(process.env).filter(([key]) => /^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP)$/i.test(key)),
      );
      const child = spawn(process.execPath, ["--input-type=module", "-e", childScript], {
        cwd: dir,
        env: {
          ...env,
          TEST_PROBE_MODE: probeMode,
          TEST_X402_SANDBOX: x402Sandbox ? "1" : "0",
          TEST_X402_CDP: x402Cdp ? "1" : "0",
          TEST_PORT: String(listenPort),
          TRUST_PERSIST_FILE: "0",
          TRUST_ORDER_DATA_DIR: ordersDir,
          OWNER_DASHBOARD_KEY: ownerDashboardKey,
        },
        stdio: ["ignore", "ignore", "pipe", "ipc"],
      });

      const signals = new EventEmitter();
      const latest = new Map();
      const upstream = [];
      let stderr = "";
      child.stderr.setEncoding("utf8").on("data", chunk => { stderr += chunk; });
      child.on("message", message => {
        if (message.type === "upstream") upstream.push(message);
        latest.set(message.type, message);
        signals.emit(message.type, message);
      });

      let exited = false;
      const done = new Promise(resolve => {
        child.once("close", () => { exited = true; resolve(); });
        child.once("error", error => { stderr += String(error); });
      });
      const client = {
        upstream,
        async waitFor(type) {
          if (latest.has(type)) return latest.get(type);
          return await Promise.race([
            once(signals, type, { signal: AbortSignal.timeout(10_000) }).then(([message]) => message),
            done.then(() => { throw new Error("Local server exited: " + stderr); }),
          ]);
        },
        release() {
          child.send({ type: "release" });
        },
        async stop() {
          if (!exited) child.kill();
          await done;
        },
      };
      children.push(client);
      const { port } = await client.waitFor("listening");
      client.port = port;
      client.origin = "http://127.0.0.1:" + port;
      return client;
    },
  };
}

async function mcp(client, method, params, options = {}) {
  const response = await fetch(client.origin + "/mcp", {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": options.userAgent || "trust-test" },
    signal: options.signal || AbortSignal.timeout(10_000),
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: options.id ?? 1,
      method,
      params,
    }),
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.ok(body.result, JSON.stringify(body));
  return body.result;
}

async function check(client, params = {}, options = {}) {
  const result = await mcp(client, "tools/call", {
    name: "check_mcp_server_trust",
    arguments: { paymentRecoveryToken, serverUrl, paymentTxHash, ...params },
  }, options);
  return result.structuredContent;
}

const x402Network = "eip155:84532";
const x402Resource = "/api/trust/dossier";

function requestDossier(client, args = {}, headers = {}, fetcher = fetch) {
  return fetcher(client.origin + x402Resource, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify({ serverUrl, paymentRecoveryToken, ...args }),
    signal: AbortSignal.timeout(10_000),
  });
}

async function x402OrderFiles(sandbox, kind) {
  const pattern = new RegExp(`^${kind}-0x[a-f0-9]{64}\\.json$`);
  return (await fs.readdir(sandbox.x402OrderDir)).filter(name => pattern.test(name));
}

test("an independent x402 v2 client discovers the Bazaar dossier, buys it, and recovers it after restart", { timeout: 30_000 }, async t => {
  const sandbox = await createSandbox(t);
  const first = await sandbox.start("ok", { x402Sandbox: true });
  const catalogResponse = await fetch(first.origin + "/discovery/resources", { signal: AbortSignal.timeout(10_000) });
  assert.equal(catalogResponse.status, 200);
  const catalog = await catalogResponse.json();
  assert.equal(catalog.x402Version, 2);
  assert.equal(catalog.simulated, true);
  assert.deepEqual(catalog.pagination, { limit: 1, offset: 0, total: 1 });
  assert.equal(catalog.items.length, 1);
  const [item] = catalog.items;
  assert.equal(item.resource, first.origin + x402Resource);
  assert.equal(item.type, "http");
  assert.equal(item.x402Version, 2);
  assert.equal(item.serviceName, "TrustGate MCP Trust Dossier");
  assert.equal(item.sampleUrl, first.origin + "/trust/sample.json");
  assert.equal(item.accepts.length, 1);
  const [offer] = item.accepts;
  assert.equal(offer.scheme, "exact");
  assert.equal(offer.network, x402Network);
  assert.equal(offer.amount, "250000");
  const discoveryExtension = item.extensions.bazaar;
  const validation = validateDiscoveryExtension(discoveryExtension);
  assert.equal(validation.valid, true, JSON.stringify(validation.errors));
  const { input, output } = discoveryExtension.info;
  const bodySchema = discoveryExtension.schema.properties.input.properties.body;
  assert.deepEqual([...bodySchema.required].sort(), ["paymentRecoveryToken", "serverUrl"]);
  assert.equal(input.method, "POST");
  assert.equal(input.bodyType, "json");
  assert.equal(new URL(input.body.serverUrl).hostname.endsWith(".example"), true);
  assert.equal(input.body.paymentRecoveryToken, "0".repeat(64));
  assert.equal(output.type, "json");
  assert.equal(output.example.mode, "FULL");
  assert.equal(Object.keys(output.example.answers).length, 7);
  assert.equal(JSON.stringify(discoveryExtension).includes(paymentRecoveryToken), false);

  const payer = privateKeyToAccount(generatePrivateKey());
  const buyer = new x402Client().register(offer.network, new ExactEvmScheme(payer));
  const httpBuyer = new x402HTTPClient(buyer);

  const unsigned = await fetch(item.resource, {
    method: input.method,
    signal: AbortSignal.timeout(10_000),
  });
  assert.equal(unsigned.status, 402);
  assert.ok(Buffer.byteLength(unsigned.headers.get("payment-required")) < 8192);
  const terms = httpBuyer.getPaymentRequiredResponse(name => unsigned.headers.get(name));
  await unsigned.body.cancel();
  assert.equal(terms.x402Version, 2);
  assert.equal(terms.resource.url, item.resource);
  assert.deepEqual(terms.accepts, item.accepts);
  assert.deepEqual(terms.extensions.bazaar, discoveryExtension);
  assert.deepEqual(first.upstream, []);

  function checkout(args = {}, headers = {}, fetcher = fetch) {
    return fetcher(item.resource, {
      method: input.method,
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify({ ...input.body, serverUrl, paymentRecoveryToken, ...args }),
      signal: AbortSignal.timeout(10_000),
    });
  }

  const payment = await httpBuyer.createPaymentPayload(terms);
  const signedHeaders = httpBuyer.encodePaymentSignatureHeader(payment);
  assert.ok(Buffer.byteLength(signedHeaders["PAYMENT-SIGNATURE"]) < 8192);
  const discovered = extractDiscoveryInfo(payment, offer);
  assert.equal(discovered?.resourceUrl, item.resource);
  assert.equal(discovered?.serviceName, item.serviceName);
  assert.equal(discovered?.method, input.method);
  assert.equal(discovered?.x402Version, 2);
  assert.deepEqual(discovered?.discoveryInfo, discoveryExtension.info);

  // The published placeholder cannot be used as a private recovery token.
  const exampleToken = await checkout(
    { paymentRecoveryToken: input.body.paymentRecoveryToken },
    signedHeaders,
  );
  assert.equal(exampleToken.status, 400);
  await exampleToken.body.cancel();
  assert.deepEqual(first.upstream, []);

  // An altered signature must fail before the server probes the target.
  const invalidPayment = structuredClone(payment);
  invalidPayment.payload.signature = invalidPayment.payload.signature.replace(/^0x./, prefix =>
    prefix === "0x0" ? "0x1" : "0x0",
  );
  const invalid = await checkout({}, httpBuyer.encodePaymentSignatureHeader(invalidPayment));
  assert.equal(invalid.status, 402);
  const rejectedTerms = httpBuyer.getPaymentRequiredResponse(name => invalid.headers.get(name));
  assert.deepEqual(rejectedTerms.extensions.bazaar, discoveryExtension);
  assert.equal(JSON.stringify(rejectedTerms.extensions.bazaar).includes(paymentRecoveryToken), false);
  await invalid.body.cancel();
  assert.deepEqual(first.upstream, []);

  const attempts = [];
  const paidFetch = wrapFetchWithPayment((input, init) => {
    const request = new Request(input, init);
    attempts.push(request.headers.has("payment-signature"));
    return fetch(request);
  }, buyer);
  const purchased = await checkout({}, {}, paidFetch);
  assert.equal(purchased.status, 200);
  assert.equal(purchased.headers.get("X-TrustGate-Environment"), "x402-sandbox");
  assert.deepEqual(attempts, [false, true]);
  const receipt = httpBuyer.getPaymentSettleResponse(name => purchased.headers.get(name));
  assert.equal(receipt.success, true);
  assert.equal(receipt.network, x402Network);
  assert.equal(receipt.payer.toLowerCase(), payer.address.toLowerCase());
  assert.match(receipt.transaction, /^0x[0-9a-f]{64}$/i);
  const report = await purchased.json();
  assert.equal(report.ok, true);
  assert.equal(report.mode, "FULL");
  assert.equal(report.server.url, serverUrl);
  assert.equal(report.notarySeal.paymentTxHash, receipt.transaction);
  assert.equal(Object.keys(report.answers).length, 7);
  assert.deepEqual(Object.keys(report.answers).sort(), Object.keys(output.example.answers).sort());
  assert.ok(report.orderId);
  assert.ok(first.upstream.length);
  assert.ok(first.upstream.every(event => event.service === "target"));
  const settlements = await x402OrderFiles(sandbox, "settlement");
  assert.equal(settlements.length, 1);
  await first.stop();

  const restarted = await sandbox.start("fail", { x402Sandbox: true, port: first.port });
  const conflicting = await checkout({ serverUrl: serverUrl + "/other" });
  assert.equal(conflicting.status, 409);
  await conflicting.body.cancel();
  const recovered = await checkout();
  assert.equal(recovered.status, 200);
  assert.deepEqual(await recovered.json(), report);
  assert.deepEqual(httpBuyer.getPaymentSettleResponse(name => recovered.headers.get(name)), receipt);
  assert.deepEqual(restarted.upstream, []);
  assert.deepEqual(await x402OrderFiles(sandbox, "settlement"), settlements);
  await restarted.stop();

  // Simulate interruption after settlement but before persisting the final report.
  const files = await x402OrderFiles(sandbox, "report");
  assert.equal(files.length, 1);
  const finalReport = path.join(sandbox.x402OrderDir, files[0]);
  await fs.rename(finalReport, finalReport + ".saved");
  const afterInterruptedWrite = await sandbox.start("fail", { x402Sandbox: true, port: first.port });
  const finalized = await checkout();
  assert.equal(finalized.status, 200);
  assert.deepEqual(await finalized.json(), report);
  assert.deepEqual(httpBuyer.getPaymentSettleResponse(name => finalized.headers.get(name)), receipt);
  assert.deepEqual(afterInterruptedWrite.upstream, []);
  assert.deepEqual(await x402OrderFiles(sandbox, "settlement"), settlements);
  assert.deepEqual(await x402OrderFiles(sandbox, "report"), files);
});

test("a failed trust probe does not return a settlement and the same x402 authorization can retry", { timeout: 30_000 }, async t => {
  const sandbox = await createSandbox(t);
  const first = await sandbox.start("fail", { x402Sandbox: true });
  const payer = privateKeyToAccount(generatePrivateKey());
  const buyer = new x402Client().register(x402Network, new ExactEvmScheme(payer));
  const httpBuyer = new x402HTTPClient(buyer);
  const unsigned = await requestDossier(first);
  assert.equal(unsigned.status, 402);
  const terms = httpBuyer.getPaymentRequiredResponse(name => unsigned.headers.get(name));
  await unsigned.body.cancel();
  const authorization = httpBuyer.encodePaymentSignatureHeader(await httpBuyer.createPaymentPayload(terms));

  const failed = await requestDossier(first, {}, authorization);
  assert.equal(failed.status, 503);
  assert.equal(failed.headers.has("payment-response"), false);
  assert.equal((await failed.json()).ok, false);
  assert.deepEqual(first.upstream, [{ type: "upstream", service: "target", method: "initialize" }]);
  assert.deepEqual(await x402OrderFiles(sandbox, "settlement"), []);
  await first.stop();

  const restarted = await sandbox.start("ok", { x402Sandbox: true, port: first.port });
  const recovered = await requestDossier(restarted, {}, authorization);
  assert.equal(recovered.status, 200);
  assert.equal(httpBuyer.getPaymentSettleResponse(name => recovered.headers.get(name)).success, true);
  assert.equal((await recovered.json()).mode, "FULL");
  assert.equal((await x402OrderFiles(sandbox, "settlement")).length, 1);
});

test("a dropped CDP settlement and HTTP response recover the same dossier after restart", { timeout: 30_000 }, async t => {
  const sandbox = await createSandbox(t);
  const first = await sandbox.start("ok", { x402Cdp: true });
  const payer = privateKeyToAccount(generatePrivateKey());
  const buyer = new x402Client().register(x402Network, new ExactEvmScheme(payer));
  const httpBuyer = new x402HTTPClient(buyer);

  const disconnected = new AbortController();
  const attempts = [];
  const paying = wrapFetchWithPayment(async (input, init) => {
    const request = new Request(input, init);
    const signed = request.headers.has("payment-signature");
    attempts.push(signed);
    const response = await fetch(request, { signal: AbortSignal.any([disconnected.signal, request.signal]) });
    if (!signed) {
      assert.equal(response.status, 402);
      assert.equal(response.headers.get("X-TrustGate-Environment"), "x402-cdp-sepolia");
      const { accepts } = httpBuyer.getPaymentRequiredResponse(name => response.headers.get(name));
      assert.equal(accepts.length, 1);
      assert.equal(accepts[0].network, x402Network);
      assert.equal(accepts[0].amount, "250000");
      assert.equal(accepts[0].payTo.toLowerCase(), "0x1111111111111111111111111111111111111111");
    }
    return response;
  }, buyer);
  const interrupted = assert.rejects(requestDossier(first, {}, {}, paying), { name: "AbortError" });
  await first.waitFor("cdp-chain-settled");
  disconnected.abort();
  await interrupted;
  assert.deepEqual(attempts, [false, true]);
  await first.stop();

  const chainFile = await fs.readFile(sandbox.cdpChainFile, "utf8");
  const transfer = JSON.parse(chainFile);
  assert.equal(transfer.payer.toLowerCase(), payer.address.toLowerCase());
  assert.equal(transfer.value, "250000");
  const files = await fs.readdir(sandbox.x402CdpOrderDir);
  const drafts = files.filter(file => /^draft-0x[a-f0-9]{64}\.json$/.test(file));
  assert.equal(drafts.length, 1);
  assert.equal(files.some(file => file.startsWith("report-")), false);
  assert.equal(files.some(file => /^settlement-0x/.test(file)), false);
  const expected = JSON.parse(await fs.readFile(path.join(sandbox.x402CdpOrderDir, drafts[0]), "utf8"));
  expected.notarySeal.paymentTxHash = transfer.transactionHash;

  const restarted = await sandbox.start("fail", { x402Cdp: true, port: first.port });
  const recovered = await requestDossier(restarted);
  assert.equal(recovered.status, 200);
  assert.equal(recovered.headers.get("X-TrustGate-Environment"), "x402-cdp-sepolia");
  const receipt = httpBuyer.getPaymentSettleResponse(name => recovered.headers.get(name));
  assert.equal(receipt.success, true);
  assert.equal(receipt.network, x402Network);
  assert.equal(receipt.payer.toLowerCase(), payer.address.toLowerCase());
  assert.equal(receipt.transaction, transfer.transactionHash);
  const report = await recovered.json();
  assert.deepEqual(report, expected);
  assert.equal(report.mode, "FULL");
  assert.equal(Object.keys(report.answers).length, 7);

  const repeated = await requestDossier(restarted);
  assert.deepEqual(await repeated.json(), report);
  assert.deepEqual(httpBuyer.getPaymentSettleResponse(name => repeated.headers.get(name)), receipt);
  assert.equal(restarted.upstream.some(event => event.service === "target"), false);
  assert.equal(restarted.upstream.filter(event => event.method === "getTransactionReceipt").length, 1);
  const cdpCalls = [...first.upstream, ...restarted.upstream].filter(event => event.service === "cdp");
  assert.deepEqual(cdpCalls.map(({ method }) => method), ["supported", "verify", "settle"]);
  assert.equal(await fs.readFile(sandbox.cdpChainFile, "utf8"), chainFile);
});

test("agents can discover a free dossier sample in the paid report format", { timeout: 30_000 }, async t => {
  const sandbox = await createSandbox(t);
  const client = await sandbox.start();
  const sampleTool = "get_trust_dossier_sample";
  const samplePath = "/trust/sample.json";

  const { tools } = await mcp(client, "tools/list");
  const tool = tools.find(({ name }) => name === sampleTool);
  assert.ok(tool);
  assert.deepEqual(tool.inputSchema.required ?? [], []);

  const trustResponse = await fetch(client.origin + "/trust", { signal: AbortSignal.timeout(10_000) });
  assert.equal(trustResponse.status, 200);
  const { fullDossier } = await trustResponse.json();
  assert.equal(fullDossier.priceUsdc, 0.25);
  assert.equal(fullDossier.sample.path, samplePath);
  assert.equal(fullDossier.sample.mcpTool, sampleTool);

  const response = await fetch(client.origin + samplePath, { signal: AbortSignal.timeout(10_000) });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /^application\/json\b/);
  const sample = await response.json();
  const result = await mcp(client, "tools/call", { name: sampleTool });
  assert.deepEqual(result.structuredContent, sample);
  assert.deepEqual(client.upstream, []);
  assert.equal(sample.ok, true);
  assert.equal(sample.sample, true);
  assert.deepEqual(sample.price, { amount: 0.25, currency: "USDC", network: "Base Mainnet", chainId: 8453 });
  assert.deepEqual(sample.delivery, {
    mcpTool: "check_mcp_server_trust",
    resultPath: "result.structuredContent",
    contentType: "application/json",
  });

  const paid = await check(client);
  assert.equal(paid.ok, true);
  assert.equal(sample.example.mode, "FULL");
  assert.equal(Object.keys(sample.example.answers).length, 7);
  for (const answer of Object.values(sample.example.answers)) assert.ok(answer.question);
  assert.deepEqual(Object.keys(sample.example).sort(), Object.keys(paid).sort());
  assert.deepEqual(Object.keys(sample.example.answers).sort(), Object.keys(paid.answers).sort());
  assert.deepEqual(Object.keys(sample.example.notarySeal).sort(), Object.keys(paid.notarySeal).sort());
  assert.notEqual(sample.example.orderId, paid.orderId);
  assert.notEqual(sample.example.notarySeal.paymentTxHash, paid.notarySeal.paymentTxHash);
});

test("a lost paid response is recoverable after restarting the HTTP server", { timeout: 30_000 }, async t => {
  const sandbox = await createSandbox(t);
  const first = await sandbox.start("pause");
  const abort = new AbortController();
  const requestFailed = assert.rejects(check(first, {}, { signal: abort.signal }), { name: "AbortError" });
  await first.waitFor("probe-paused");
  const unauthorized = await check(first, { paymentRecoveryToken: "ef".repeat(32) }, { id: 2 });
  assert.equal(unauthorized.status, "PAYMENT_ORDER_MISMATCH");
  abort.abort();
  await requestFailed;
  first.release();

  const delivery = await first.waitFor("attempted-delivery");
  const original = delivery.body.result?.structuredContent;
  assert.equal(original?.ok, true);
  assert.ok(original.orderId);
  assert.ok(original.notarySeal);
  assert.equal(first.upstream.filter(call => call.service === "base").length, 1);
  await first.stop();

  const restarted = await sandbox.start();
  const wrongToken = await check(restarted, { paymentRecoveryToken: "ef".repeat(32) });
  assert.equal(wrongToken.status, "PAYMENT_ORDER_MISMATCH");
  const wrongServer = await check(restarted, { serverUrl: serverUrl + "/different" });
  assert.equal(wrongServer.status, "PAYMENT_ORDER_MISMATCH");
  const recovered = await check(restarted, {
    serverUrl: "https://93.184.216.34:443/mcp",
  }, { userAgent: "new-client-after-reconnect" });
  assert.deepEqual(recovered, original);
  assert.deepEqual(restarted.upstream, []);
  const telemetry = await fetch(restarted.origin + "/api/state", {
    headers: { "x-owner-key": ownerDashboardKey },
  });
  assert.equal(telemetry.status, 200);
  assert.equal((await telemetry.text()).includes(paymentRecoveryToken), false);
});

test("a confirmed payment can resume after a failed probe and restart", { timeout: 30_000 }, async t => {
  const sandbox = await createSandbox(t);
  const first = await sandbox.start("fail");
  const missingToken = await check(first, { paymentRecoveryToken: undefined });
  assert.equal(missingToken.status, "PAYMENT_RECOVERY_TOKEN_REQUIRED");
  assert.deepEqual(first.upstream, []);
  const failed = await check(first);
  assert.equal(failed.status, "PAID_CHECK_RETRYABLE");
  assert.equal(first.upstream.filter(call => call.service === "base").length, 1);
  assert.equal(first.upstream.filter(call => call.service === "target").length, 1);
  await first.stop();

  const restarted = await sandbox.start();
  const [recovered, concurrent] = await Promise.all([check(restarted), check(restarted)]);
  assert.equal(recovered.ok, true);
  assert.ok(recovered.orderId);
  assert.ok(recovered.notarySeal);
  assert.deepEqual(concurrent, recovered);
  assert.equal(restarted.upstream.filter(call => call.service === "base").length, 0);
  assert.equal(restarted.upstream.filter(call => call.method === "initialize").length, 1);
});
