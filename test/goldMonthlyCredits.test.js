import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { generateKeyPairSync, randomUUID } from "node:crypto";
import { once } from "node:events";
import fs from "node:fs/promises";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { buildGoldCreditAuthorizationMessage } from "../src/goldSellerEligibility.js";
import { verifyTrustReportEd25519 } from "../src/reportSignature.js";

const projectDir = fileURLToPath(new URL("..", import.meta.url));
const audience = "https://own-adam.onrender.com";
const serverUrl = "https://fictional-gold-seller.example/mcp";
const sellerRegistry = "veritas:seller-registry:v1";
const creditsPrefix = "veritas:gold-monthly-credits:v1";
const mockToken = "fictional-gold-upstash-token";

const localPreload = `
  import dns from "node:dns/promises";
  import { Server } from "node:http";
  const target = new URL(process.env.FIXTURE_GOLD_SERVER);
  const fetch = globalThis.fetch;
  dns.lookup = async hostname => {
    if (hostname !== target.hostname) throw new Error("External DNS disabled in test");
    return [{ address: "192.0.2.1", family: 4 }];
  };
  globalThis.fetch = async (input, options) => {
    const url = new URL(input);
    if (url.href === target.href) return fetch(process.env.FIXTURE_GOLD_AUDIT_URL, options);
    if (url.href === process.env.UPSTASH_REDIS_REST_URL) return fetch(url, options);
    throw new Error("External fetch disabled in test");
  };
  const listen = Server.prototype.listen;
  Server.prototype.listen = function (_port, host, ready) {
    this.once("listening", () => process.send(this.address().port));
    return listen.call(this, 0, host, ready);
  };
`;

function makeSeller(storeId, walletAddress) {
  return { id: storeId, name: "Fictional Gold test seller", address: walletAddress, endpoint: serverUrl, publicRegistryConsent: { accepted: true } };
}

function completeCredit(fixtures, parameters) {
  const [numberOfKeys, key, usedField, resultField, grantRaw, recordRaw, limit] = parameters;
  const hash = fixtures.get(key);
  const used = Number(hash?.get(usedField) ?? 0);
  if (numberOfKeys !== 1 || !key.startsWith(creditsPrefix + ":") || limit !== 5) return undefined;
  if (hash?.get("grant") !== grantRaw) return ["grant_changed", used, null];
  const previous = hash.get(resultField);
  if (previous !== undefined) return ["recovered", used, previous];
  if (used >= limit) return ["limit", used, null];
  hash.set(usedField, String(used + 1));
  hash.set(resultField, recordRaw);
  return ["saved", used + 1, recordRaw];
}

async function sandbox(t, fixtures) {
  const tempRoot = path.resolve(os.tmpdir());
  const dir = await fs.mkdtemp(path.join(tempRoot, "trustgate-gold-test-"));
  const dependencies = path.join(dir, "node_modules");
  const cleanups = [];
  t.after(async () => {
    for (const cleanup of cleanups.reverse()) await cleanup();
    await fs.unlink(dependencies).catch(error => { if (error.code !== "ENOENT") throw error; });
    if (path.dirname(dir) === tempRoot && path.basename(dir).startsWith("trustgate-gold-test-")) {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
  await fs.cp(path.join(projectDir, "src"), path.join(dir, "src"), { recursive: true });
  await fs.symlink(path.join(projectDir, "node_modules"), dependencies, process.platform === "win32" ? "junction" : "dir");
  await fs.writeFile(path.join(dir, "package.json"), '{"type":"module"}\n');
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const signingKeyFile = path.join(dir, "report-signing.pem");
  await fs.writeFile(signingKeyFile, privateKey.export({ type: "pkcs8", format: "pem" }), { flag: "wx", mode: 0o600 });
  const publicKeyHex = Buffer.from(publicKey.export({ format: "jwk" }).x, "base64url").toString("hex");

  const probeMethods = [];
  const redisCommands = [];
  let releaseFinalWrites;
  const finalWritesReady = new Promise(resolve => { releaseFinalWrites = resolve; });
  let finalWrites = 0;
  const upstream = createServer(async (req, res) => {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw);
    res.setHeader("content-type", "application/json");
    if (req.url === "/audit") {
      const { id, method } = body;
      probeMethods.push(method);
      if (id === undefined) {
        res.statusCode = 202;
        return res.end();
      }
      const result = method === "initialize"
        ? { protocolVersion: "2025-06-18", serverInfo: { name: "Fictional Gold test endpoint", version: "1.0.0" }, capabilities: { tools: {} } }
        : { tools: [{ name: "summarize_text", description: "Summarize text.", inputSchema: { type: "object" }, annotations: { readOnlyHint: true } }] };
      return res.end(JSON.stringify({ jsonrpc: "2.0", id, result }));
    }
    if (req.url !== "/redis" || req.headers.authorization !== `Bearer ${mockToken}`) {
      res.statusCode = 403;
      return res.end(JSON.stringify({ error: "Unexpected test fixture request" }));
    }
    redisCommands.push(body);
    const [command, key, ...parameters] = body;
    const hash = fixtures.get(key);
    let result;
    switch (command) {
      case "HGETALL": result = [...(hash || [])].flat(); break;
      case "HGET": result = hash?.get(parameters[0]) ?? null; break;
      case "HMGET": result = parameters.map(field => hash?.get(field) ?? null); break;
      case "EVAL": {
        const [, creditKey, usedField] = parameters;
        if (fixtures.get(creditKey)?.get(usedField) === "4") {
          // Both isolated app processes must read the same last available credit.
          finalWrites += 1;
          if (finalWrites === 2) releaseFinalWrites();
          await finalWritesReady;
        }
        result = completeCredit(fixtures, parameters);
        break;
      }
      case "HSET": {
        const target = hash || new Map();
        const [field, value] = parameters;
        result = target.has(field) ? 0 : 1;
        target.set(field, value);
        fixtures.set(key, target);
        break;
      }
    }
    if (result === undefined) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: "Unexpected test Redis command" }));
    }
    res.end(JSON.stringify({ result }));
  });
  upstream.listen(0, "127.0.0.1");
  cleanups.push(() => new Promise(resolve => {
    upstream.close(resolve);
    upstream.closeAllConnections();
  }));
  await once(upstream, "listening");
  const upstreamOrigin = `http://127.0.0.1:${upstream.address().port}`;
  const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => /^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP)$/i.test(name)));

  return {
    publicKeyHex,
    probeMethods,
    redisCommands,
    async start() {
      const child = spawn(process.execPath, ["--import", "data:text/javascript," + encodeURIComponent(localPreload), "./src/server.js", "--local"], {
        cwd: dir,
        env: {
          ...env,
          EVALUATOR_SIGNER_HEX: "0x" + "12".repeat(32),
          TRUST_REPORT_SIGNING_KEY_FILE: signingKeyFile,
          UPSTASH_REDIS_REST_URL: upstreamOrigin + "/redis",
          UPSTASH_REDIS_REST_TOKEN: mockToken,
          FIXTURE_GOLD_SERVER: serverUrl,
          FIXTURE_GOLD_AUDIT_URL: upstreamOrigin + "/audit",
        },
        stdio: ["ignore", "ignore", "pipe", "ipc"],
      });
      let stderr = "";
      child.stderr.setEncoding("utf8").on("data", chunk => { stderr += chunk; });
      const closed = once(child, "close");
      async function stop() {
        if (child.exitCode === null && child.signalCode === null) child.kill();
        await closed;
      }
      cleanups.push(stop);
      const [port] = await Promise.race([
        once(child, "message", { signal: AbortSignal.timeout(10_000) }),
        closed.then(() => { throw new Error("Isolated Gold test server stopped: " + stderr); }),
      ]);
      const origin = `http://127.0.0.1:${port}`;
      return { origin, stop };
    },
  };
}

async function call(origin, name, args) {
  const response = await fetch(origin + "/mcp", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }),
    signal: AbortSignal.timeout(12_000),
  });
  assert.equal(response.status, 200);
  const { result, error } = await response.json();
  assert.ok(result?.structuredContent, error?.message || `No MCP result for ${name}`);
  return result.structuredContent;
}

async function authorize(wallet, storeId, action, requestId = randomUUID()) {
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const message = buildGoldCreditAuthorizationMessage({ audience, action, storeId, requestId, serverUrl, expiresAt });
  const signature = await wallet.signMessage({ message });
  return { serverUrl, goldCredit: { action, storeId, requestId, expiresAt, signature } };
}

test("Gold wallet gets five monthly dossiers and recovers the identical signed report after restart", { timeout: 40_000 }, async t => {
  const storeId = "fictional-gold-seller";
  const ineligibleId = "fictional-ungranted-seller";
  const seller = privateKeyToAccount(generatePrivateKey());
  const stranger = privateKeyToAccount(generatePrivateKey());
  const now = new Date();
  const month = now.toISOString().slice(0, 7);
  const expiresAt = new Date(now.valueOf() + 24 * 60 * 60 * 1000).toISOString();
  const grant = { starLevel: 3, storeId, walletAddress: seller.address, serverUrl, verifiedAt: now.toISOString(), expiresAt };
  const creditHash = new Map([["grant", JSON.stringify(grant)]]);
  const fixtures = new Map([
    [sellerRegistry, new Map([
      [storeId, JSON.stringify(makeSeller(storeId, seller.address))],
      [ineligibleId, JSON.stringify(makeSeller(ineligibleId, stranger.address))],
    ])],
    [`${creditsPrefix}:${storeId}`, creditHash],
  ]);
  const { publicKeyHex, probeMethods, redisCommands, start } = await sandbox(t, fixtures);
  let service = await start();
  const goldCall = async arguments_ => call(service.origin, "check_mcp_server_trust", arguments_);

  const balance = await goldCall(await authorize(seller, storeId, "balance"));
  assert.equal(balance.ok, true, JSON.stringify(balance));
  assert.equal(balance.mode, "GOLD_MONTHLY_CREDIT");
  assert.equal(balance.balance.limit, 5);
  assert.equal(balance.balance.remaining, 5);
  assert.equal(balance.balance.used, 0);
  assert.equal(balance.balance.month, month);
  assert.ok(Date.parse(balance.balance.resetsAt) > Date.now());
  assert.deepEqual(probeMethods, []);

  const firstArguments = await authorize(seller, storeId, "redeem");
  const first = await goldCall(firstArguments);
  assert.equal(first.ok, true, JSON.stringify(first));
  assert.equal(first.mode, "GOLD_MONTHLY_CREDIT");
  assert.equal(first.requestId, firstArguments.goldCredit.requestId);
  assert.equal(first.balance.remaining, 4);
  assert.equal(first.balance.used, 1);
  assert.equal(Object.keys(first.report.answers).length, 7);
  assert.ok(Object.values(first.report.answers).every(answer => !answer.locked));
  assert.deepEqual(first.report.issuance, { type: "GOLD_MONTHLY_CREDIT", priceUsdc: 0, storeId, requestId: first.requestId });
  assert.equal(first.report.notarySeal.paymentTxHash, null);
  assert.equal(verifyTrustReportEd25519(first.report, publicKeyHex).valid, true);
  const probeCycle = ["initialize", "notifications/initialized", "tools/list", "tools/list"];
  assert.deepEqual(probeMethods, probeCycle);

  await service.stop();
  service = await start();
  const recovered = await goldCall(firstArguments);
  assert.equal(recovered.ok, true, JSON.stringify(recovered));
  assert.equal(recovered.recovered, true);
  assert.equal(recovered.balance.remaining, 4);
  assert.deepEqual(recovered.report, first.report);
  assert.deepEqual(probeMethods, probeCycle);

  const wrongWallet = await goldCall(await authorize(stranger, storeId, "redeem"));
  const ungranted = await goldCall(await authorize(stranger, ineligibleId, "redeem"));
  assert.equal(wrongWallet.status, "GOLD_CREDIT_AUTH_REQUIRED");
  assert.equal(ungranted.status, "GOLD_CREDIT_NOT_ELIGIBLE");
  assert.deepEqual(probeMethods, probeCycle);

  for (let remaining = 3; remaining >= 1; remaining -= 1) {
    const issued = await goldCall(await authorize(seller, storeId, "redeem"));
    assert.equal(issued.ok, true, JSON.stringify(issued));
    assert.equal(issued.balance.remaining, remaining);
  }
  const secondWorker = await start();
  const [left, right] = await Promise.all([authorize(seller, storeId, "redeem"), authorize(seller, storeId, "redeem")]);
  const lastResults = await Promise.all([goldCall(left), call(secondWorker.origin, "check_mcp_server_trust", right)]);
  assert.equal(lastResults.filter(result => result.ok).length, 1, JSON.stringify(lastResults));
  assert.equal(lastResults.find(result => result.ok).balance.remaining, 0);
  const exhausted = lastResults.find(result => !result.ok);
  assert.equal(exhausted.status, "GOLD_CREDIT_MONTHLY_LIMIT");
  assert.equal(exhausted.httpStatus, 429);
  const finalBalance = await goldCall(await authorize(seller, storeId, "balance"));
  assert.equal(finalBalance.balance.used, 5);
  assert.equal(finalBalance.balance.remaining, 0);
  assert.equal(creditHash.get(`used:${month}`), "5");
  assert.equal([...creditHash.keys()].filter(field => field.startsWith("result:")).length, 5);
  assert.equal(redisCommands.filter(([command]) => command === "EVAL").length, 6);
  assert.ok(redisCommands.some(([command, key, field]) => command === "HGET" && key === sellerRegistry && field === storeId));

  const paper = await call(service.origin, "purchase_firstparty_catalog_item", { itemId: "retail-veritas-level3-mastery-tutorial-v07" });
  assert.equal(paper.ok, false);
  assert.equal(paper.httpStatus, 402);
  assert.equal(paper.requiredAmountUsdc, 1.5);
  assert.equal(paper.previewTeaserOnly.fullPayloadLocked, true);
});
