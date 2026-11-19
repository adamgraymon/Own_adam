import { createHmac, randomBytes } from "node:crypto";
import { FREE_CHECKS_PER_DAY } from "./freeTrustCheck.js";
import { activeBackend, executeUpstashCommand } from "./trustStore.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const PROMO_DURATION_MS = 3 * DAY_MS;
const DAILY_TOTAL = 100;
const DEFAULT_REDIS_PREFIX = "veritas:launch-dossier-promo:v1";
const ISO_TIMESTAMP = /^(\d{4}-\d{2}-\d{2})T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/;
const memoryQuotas = new WeakMap();
const memoryCallerSecret = randomBytes(32);

const CONSUME_QUOTA = [
  "local time = redis.call('TIME')",
  "local now = tonumber(time[1]) * 1000 + math.floor(tonumber(time[2]) / 1000)",
  "if now >= tonumber(ARGV[4]) then return {2, 0} end",
  "local total = tonumber(redis.call('HGET', KEYS[1], 'total') or '0')",
  "local client = tonumber(redis.call('HGET', KEYS[1], ARGV[1]) or '0')",
  "local clientLimit = tonumber(ARGV[2])",
  "local totalLimit = tonumber(ARGV[3])",
  "if client >= clientLimit or total >= totalLimit then return {0, 0} end",
  "redis.call('HINCRBY', KEYS[1], ARGV[1], 1)",
  "redis.call('HINCRBY', KEYS[1], 'total', 1)",
  "redis.call('PEXPIREAT', KEYS[1], ARGV[4])",
  "return {1, math.min(clientLimit - client - 1, totalLimit - total - 1)}",
].join("\n");

export function getLaunchDossierPromo(now = Date.now()) {
  const setting = (process.env.TRUST_DOSSIER_PROMO_START_AT || "").trim();
  const match = ISO_TIMESTAMP.exec(setting);
  if (!match) return null;
  const midnight = Date.parse(match[1] + "T00:00:00Z");
  if (!Number.isFinite(midnight) || new Date(midnight).toISOString().slice(0, 10) !== match[1]) return null;

  const start = Date.parse(setting);
  const end = start + PROMO_DURATION_MS;
  if (!(now >= start && now < end)) return null;

  return {
    startsAt: new Date(start).toISOString(),
    endsAt: new Date(end).toISOString(),
    priceUsdc: 0,
    dailyChecksPerClient: FREE_CHECKS_PER_DAY,
    dailyChecksTotal: DAILY_TOTAL,
  };
}

export async function consumeLaunchDossierQuota(ledger, promo, callerKey, now = Date.now()) {
  const start = Date.parse(promo?.startsAt);
  const end = Date.parse(promo?.endsAt);
  const resetsAtMs = Math.min((Math.floor(now / DAY_MS) + 1) * DAY_MS, end);
  const resetsAt = Number.isFinite(resetsAtMs) ? new Date(resetsAtMs).toISOString() : null;
  const unavailable = { allowed: false, remaining: 0, resetsAt, status: "LAUNCH_PROMO_QUOTA_UNAVAILABLE" };
  if (!(now >= start && now < end)) return unavailable;

  const limited = { allowed: false, remaining: 0, resetsAt, status: "LAUNCH_PROMO_DAILY_LIMIT" };
  const day = new Date(now).toISOString().slice(0, 10);
  const useRedis = activeBackend() === "upstash-redis";
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!useRedis && (process.env.UPSTASH_REDIS_REST_URL || redisToken)) return unavailable;
  const caller = createHmac("sha256", useRedis ? redisToken : memoryCallerSecret)
    .update(String(callerKey || "anonymous")).digest("hex");

  if (useRedis) {
    const prefix = process.env.TRUST_DOSSIER_PROMO_REDIS_KEY?.trim() || DEFAULT_REDIS_PREFIX;
    const key = [prefix, start, day].join(":");
    try {
      const result = await executeUpstashCommand([
        "EVAL", CONSUME_QUOTA, 1, key, "client:" + caller, FREE_CHECKS_PER_DAY, DAILY_TOTAL, resetsAtMs,
      ], 2_000);
      if (!Array.isArray(result) || result.length !== 2) return unavailable;
      const [allowed, remaining] = result;
      if (allowed === 0 && remaining === 0) return limited;
      if (allowed === 2 && remaining === 0) return unavailable;
      if (allowed === 1 && Number.isInteger(remaining) && remaining >= 0 && remaining < FREE_CHECKS_PER_DAY) {
        return { allowed: true, remaining, resetsAt };
      }
    } catch {
      // The counter may already have advanced, so do not retry or switch to memory.
    }
    return unavailable;
  }

  let window = memoryQuotas.get(ledger);
  if (!window || window.start !== start) {
    window = { start, days: new Map() };
    memoryQuotas.set(ledger, window);
  }

  let dayQuota = window.days.get(day);
  if (!dayQuota) {
    dayQuota = { total: 0, clients: new Map() };
    window.days.set(day, dayQuota);
  }

  const clientChecks = dayQuota.clients.get(caller) || 0;
  if (clientChecks >= FREE_CHECKS_PER_DAY || dayQuota.total >= DAILY_TOTAL) return limited;

  dayQuota.clients.set(caller, clientChecks + 1);
  dayQuota.total += 1;
  const remaining = Math.min(FREE_CHECKS_PER_DAY - clientChecks - 1, DAILY_TOTAL - dayQuota.total);
  return { allowed: true, remaining, resetsAt };
}
