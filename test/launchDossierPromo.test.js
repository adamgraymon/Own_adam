import assert from "node:assert/strict";
import { test } from "node:test";
import { consumeLaunchDossierQuota, getLaunchDossierPromo } from "../src/launchDossierPromo.js";

const start = "2026-11-19T12:00:00.000Z";
const end = "2026-11-22T12:00:00.000Z";
const startsAt = Date.parse(start);
const endsAt = Date.parse(end);
const expectedReset = "2026-11-20T00:00:00.000Z";
const unavailable = "LAUNCH_PROMO_QUOTA_UNAVAILABLE";
const limited = "LAUNCH_PROMO_DAILY_LIMIT";

function configure(t, settings = {}) {
  const testEnvironment = {
    TRUST_DOSSIER_PROMO_START_AT: start,
    TRUST_DOSSIER_PROMO_REDIS_KEY: undefined,
    UPSTASH_REDIS_REST_URL: undefined,
    UPSTASH_REDIS_REST_TOKEN: undefined,
    ...settings,
  };
  for (const [name, value] of Object.entries(testEnvironment)) {
    const before = process.env[name];
    t.after(() => {
      if (before === undefined) delete process.env[name];
      else process.env[name] = before;
    });
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
}

test("launch promo opens once for 72 hours, with inclusive start and exclusive end", t => {
  configure(t);
  assert.equal(getLaunchDossierPromo(startsAt - 1), null);
  assert.deepEqual(getLaunchDossierPromo(startsAt), {
    startsAt: start,
    endsAt: end,
    priceUsdc: 0,
    dailyChecksPerClient: 5,
    dailyChecksTotal: 100,
  });
  assert.equal(getLaunchDossierPromo(endsAt - 1)?.endsAt, end);
  assert.equal(getLaunchDossierPromo(endsAt), null);

  process.env.TRUST_DOSSIER_PROMO_START_AT = "2026-11-19T07:00:00-05:00";
  assert.equal(getLaunchDossierPromo(startsAt)?.startsAt, start);

  for (const setting of ["", "2026-02-30T00:00:00Z", "2026-11-19T12:00:00", "2026-11-19T24:00:00Z", "garbage"]) {
    process.env.TRUST_DOSSIER_PROMO_START_AT = setting;
    assert.equal(getLaunchDossierPromo(startsAt), null, setting);
  }

  delete process.env.TRUST_DOSSIER_PROMO_START_AT;
  assert.equal(getLaunchDossierPromo(startsAt), null);
});

test("memory quota enforces both caps and resets at UTC midnight or promo end", async t => {
  configure(t);
  const ledger = {};
  const promo = getLaunchDossierPromo(startsAt);

  for (let remaining = 4; remaining >= 0; remaining -= 1) {
    assert.deepEqual(await consumeLaunchDossierQuota(ledger, promo, "client-one", startsAt), {
      allowed: true, remaining, resetsAt: expectedReset,
    });
  }
  assert.deepEqual(await consumeLaunchDossierQuota(ledger, promo, "client-one", startsAt), {
    allowed: false, remaining: 0, resetsAt: expectedReset, status: limited,
  });
  for (let index = 0; index < 95; index += 1) {
    const result = await consumeLaunchDossierQuota(ledger, promo, "extra-client-" + index, startsAt);
    assert.equal(result.allowed, true);
    assert.equal(result.remaining, Math.min(4, 94 - index));
  }
  assert.equal((await consumeLaunchDossierQuota(ledger, promo, "new-client", startsAt)).status, limited);

  const tomorrow = Date.parse(expectedReset);
  assert.equal((await consumeLaunchDossierQuota(ledger, promo, "client-one", tomorrow)).allowed, true);
  assert.equal((await consumeLaunchDossierQuota(ledger, promo, "client-one", startsAt)).status, limited);
  assert.deepEqual(await consumeLaunchDossierQuota(ledger, promo, "client-one", endsAt - 1), {
    allowed: true, remaining: 4, resetsAt: end,
  });
  assert.equal((await consumeLaunchDossierQuota(ledger, promo, "client-one", endsAt)).status, unavailable);

  process.env.TRUST_DOSSIER_PROMO_START_AT = "2026-11-19T12:01:00Z";
  const nextPromoStart = startsAt + 60_000;
  const nextPromo = getLaunchDossierPromo(nextPromoStart);
  assert.equal((await consumeLaunchDossierQuota(ledger, nextPromo, "client-one", nextPromoStart)).remaining, 4);
});

test("Upstash quota makes one atomic request with an expiry and fails closed", async t => {
  configure(t, {
    TRUST_DOSSIER_PROMO_REDIS_KEY: "launch-promo-test",
    UPSTASH_REDIS_REST_URL: "https://promo-redis.invalid",
    UPSTASH_REDIS_REST_TOKEN: "mock-token",
  });
  const caller = "198.51.100.42";
  const calls = [];
  let result = [1, 4];
  let fail = false;
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url, command: JSON.parse(options.body) });
    if (fail) return new Response(null, { status: 503 });
    return Response.json({ result });
  });
  const promo = getLaunchDossierPromo(startsAt);

  assert.deepEqual(await consumeLaunchDossierQuota({}, promo, caller, startsAt), {
    allowed: true, remaining: 4, resetsAt: expectedReset,
  });
  assert.equal(calls.length, 1);
  const { url, command } = calls[0];
  assert.equal(url, "https://promo-redis.invalid");
  const [operation, script, keys, key, field, clientCap, totalCap, expiry] = command;
  assert.equal(operation, "EVAL");
  assert.match(script, /redis.call\('TIME'\)[\s\S]*if now >= tonumber\(ARGV\[4\]\) then return \{2, 0\} end[\s\S]*HINCRBY/);
  assert.match(script, /if client >= clientLimit or total >= totalLimit then return \{0, 0\} end/);
  assert.match(script, /PEXPIREAT/);
  assert.equal(keys, 1);
  assert.equal(key, ["launch-promo-test", startsAt, "2026-11-19"].join(":"));
  assert.match(field, /^client:[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(command).includes(caller), false);
  assert.deepEqual([clientCap, totalCap, expiry], [5, 100, Date.parse(expectedReset)]);

  result = [0, 0];
  assert.equal((await consumeLaunchDossierQuota({}, promo, caller, startsAt)).status, limited);
  assert.equal(calls[1].command[4], field);

  result = [2, 0];
  assert.equal((await consumeLaunchDossierQuota({}, promo, caller, Date.parse(expectedReset) - 1)).status, unavailable);
  assert.equal(calls[2].command[7], Date.parse(expectedReset));

  result = [1, 5];
  assert.equal((await consumeLaunchDossierQuota({}, promo, caller, startsAt)).status, unavailable);
  fail = true;
  assert.equal((await consumeLaunchDossierQuota({}, promo, caller, startsAt)).status, unavailable);
  assert.equal(calls.length, 5);

  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  assert.equal((await consumeLaunchDossierQuota({}, promo, caller, startsAt)).status, unavailable);
  assert.equal(calls.length, 5);
});
