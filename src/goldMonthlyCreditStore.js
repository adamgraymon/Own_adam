import { activeBackend, executeUpstashCommand } from "./trustStore.js";

export const GOLD_MONTHLY_LIMIT = 5;
const DEFAULT_REDIS_PREFIX = "veritas:gold-monthly-credits:v1";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SAVE_RESULT = [
  "local fields = redis.call('HMGET', KEYS[1], 'grant', ARGV[1], ARGV[2])",
  "local counter = fields[2] or '0'",
  "local used = tonumber(counter)",
  "local limit = tonumber(ARGV[5])",
  "if not used or used < 0 or used > limit or used % 1 ~= 0 or tostring(used) ~= counter then",
  "  return redis.error_reply('Invalid GOLD usage counter')",
  "end",
  "if fields[1] ~= ARGV[3] then return {'grant_changed', used, false} end",
  "if fields[3] then return {'recovered', used, fields[3]} end",
  "if used == limit then return {'limit', used, false} end",
  "redis.call('HSET', KEYS[1], ARGV[1], used + 1, ARGV[2], ARGV[4])",
  "return {'saved', used + 1, ARGV[4]}",
].join("\n");

export function goldCreditRedisKey(storeId) {
  if (typeof storeId !== "string" || !storeId || /[^a-z0-9_-]/.test(storeId)) {
    throw new Error("A valid GOLD store ID is required.");
  }
  const prefix = process.env.GOLD_MONTHLY_CREDITS_REDIS_PREFIX?.trim() || DEFAULT_REDIS_PREFIX;
  return [prefix, storeId].join(":");
}

function resultField(requestId) {
  if (typeof requestId !== "string" || requestId.length !== 36 || !UUID.test(requestId)) {
    throw new Error("A UUID is required for a GOLD request.");
  }
  return "result:" + requestId.toLowerCase();
}

function currentMonth(now) {
  const nextMonth = new Date(now);
  const month = nextMonth.toISOString().slice(0, 7);
  nextMonth.setUTCDate(1);
  nextMonth.setUTCHours(0, 0, 0, 0);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
  return { month, resetsAt: nextMonth.toISOString() };
}

function isUsageCount(used) {
  return Number.isInteger(used) && used >= 0 && used <= GOLD_MONTHLY_LIMIT;
}

function parseUsed(raw) {
  if (raw === null) return 0;
  const used = Number(raw);
  if (typeof raw !== "string" || !isUsageCount(used) || String(used) !== raw) {
    throw new Error("Invalid GOLD usage counter.");
  }
  return used;
}

function parseResult(raw) {
  if (raw === null) return null;
  if (typeof raw === "string") {
    try {
      const record = JSON.parse(raw);
      if (record && typeof record === "object" && !Array.isArray(record)) return record;
    } catch {
      // Report a generic error without including the stored payload.
    }
  }
  throw new Error("Invalid GOLD result record.");
}

async function redis(command) {
  if (activeBackend() !== "upstash-redis") throw new Error("GOLD credit storage is unavailable.");
  return executeUpstashCommand(command);
}

export async function readGoldCreditAccount({ storeId, requestId, now = Date.now() }) {
  const { month, resetsAt } = currentMonth(now);
  const command = ["HMGET", goldCreditRedisKey(storeId), "grant", "used:" + month];
  if (requestId !== undefined) command.push(resultField(requestId));
  const result = await redis(command);
  if (!Array.isArray(result) || result.length !== command.length - 2) {
    throw new Error("Invalid GOLD account response.");
  }

  const [grantRaw, counter, savedRaw = null] = result;
  if (grantRaw !== null && typeof grantRaw !== "string") throw new Error("Invalid GOLD grant response.");
  return { grantRaw, used: parseUsed(counter), month, resetsAt, saved: parseResult(savedRaw) };
}

export async function saveGoldCreditResult({ storeId, requestId, grantRaw, record, now = Date.now() }) {
  const { month, resetsAt } = currentMonth(now);
  if (typeof grantRaw !== "string" || !grantRaw) throw new Error("A GOLD grant is required.");
  const recordRaw = JSON.stringify(record);
  if (!recordRaw?.startsWith("{")) throw new Error("A JSON object is required for a GOLD result.");

  const reply = await redis([
    "EVAL", SAVE_RESULT, 1, goldCreditRedisKey(storeId), "used:" + month, resultField(requestId),
    grantRaw, recordRaw, GOLD_MONTHLY_LIMIT,
  ]);
  if (!Array.isArray(reply) || reply.length !== 3) throw new Error("Invalid GOLD save response.");

  const [status, used, savedRaw] = reply;
  const hasRecord = status === "saved" || status === "recovered";
  const isDenial = status === "grant_changed" || status === "limit";
  if (!isUsageCount(used) || (!hasRecord && !isDenial) || (hasRecord ? savedRaw === null : savedRaw !== null)
    || (status === "limit" && used !== GOLD_MONTHLY_LIMIT) || (status === "saved" && (used === 0 || savedRaw !== recordRaw))) {
    throw new Error("Invalid GOLD save response.");
  }
  return { status, used, month, resetsAt, saved: parseResult(savedRaw) };
}
