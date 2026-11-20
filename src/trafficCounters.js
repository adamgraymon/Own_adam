import { executeUpstashCommand } from "./trustStore.js";
import { MCP_TOOLS, getKnownMcpToolName } from "./mcpServer.js";

const REDIS_KEY = "veritas:traffic-totals:v1";
const REDIS_TIMEOUT_MS = 2000;
const DEFAULT_FLUSH_INTERVAL_MS = 60_000;
const TOOL_FLUSH_DELAY_MS = 2_000;
const SNAPSHOT_CACHE_TTL_MS = 20_000;

const TOOL_NAMES = MCP_TOOLS.map(({ name }) => name);
const TOOL_FIELDS = TOOL_NAMES.map(name => `tool:${name}`);
const BASE_FIELDS = ["totalExternalHits", "mcpRequests", "mcpToolsCall", "tests"];
export const TRAFFIC_COUNTER_FIELDS = [...BASE_FIELDS, ...TOOL_FIELDS];

const BATCH_HINCRBY_SCRIPT = [
  "for i = 1, #ARGV, 2 do",
  "  redis.call('HINCRBY', KEYS[1], ARGV[i], tonumber(ARGV[i + 1]))",
  "end",
  "return 1",
].join("\n");

export function createTrafficCounters({
  useUpstash = false,
  flushIntervalMs = DEFAULT_FLUSH_INTERVAL_MS,
} = {}) {
  const storage = useUpstash ? "upstash-redis" : "memory";
  const memoryTotals = Object.fromEntries(TRAFFIC_COUNTER_FIELDS.map(f => [f, 0]));
  const pending = Object.fromEntries(TRAFFIC_COUNTER_FIELDS.map(f => [f, 0]));
  let hasPending = false;
  let writeErrors = 0;
  let flushTimer = null;
  let inFlightFlush = null;
  let cachedRemoteTotals = null;
  let cachedRemoteAt = 0;

  function addDelta(field, delta = 1) {
    if (!Object.hasOwn(pending, field)) return;
    if (!useUpstash) {
      memoryTotals[field] += delta;
      return;
    }
    pending[field] += delta;
    hasPending = true;
  }

  function scheduleFlush(delayMs = flushIntervalMs) {
    if (!useUpstash || !hasPending) return;
    if (flushTimer) return;
    flushTimer = setTimeout(() => {
      flushTimer = null;
      void flush();
    }, delayMs);
    if (typeof flushTimer.unref === "function") flushTimer.unref();
  }

  async function flush() {
    if (!useUpstash) return;
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    if (inFlightFlush) {
      await inFlightFlush;
    }
    if (!hasPending) return;

    const args = [];
    const batch = {};
    for (const field of TRAFFIC_COUNTER_FIELDS) {
      const delta = pending[field];
      if (delta > 0) {
        args.push(field, delta);
        batch[field] = delta;
        pending[field] = 0;
      }
    }
    hasPending = false;
    if (args.length === 0) return;

    inFlightFlush = (async () => {
      try {
        const res = await executeUpstashCommand(
          ["EVAL", BATCH_HINCRBY_SCRIPT, 1, REDIS_KEY, ...args],
          REDIS_TIMEOUT_MS
        );
        if (res !== 1) throw new Error("Invalid batch HINCRBY result.");
        if (cachedRemoteTotals) {
          for (const [field, delta] of Object.entries(batch)) {
            if (typeof cachedRemoteTotals[field] === "number") {
              cachedRemoteTotals[field] += delta;
            }
          }
        }
      } catch {
        writeErrors += 1;
        // Re-queue batch deltas if the request failed so traffic spikes never lose counts.
        for (const [field, delta] of Object.entries(batch)) {
          pending[field] += delta;
        }
        hasPending = true;
      } finally {
        inFlightFlush = null;
      }
    })();

    await inFlightFlush;
  }

  function buildResponse(totals) {
    const byMcpToolCalled = {};
    for (const name of TOOL_NAMES) {
      const count = totals[`tool:${name}`];
      if (typeof count === "number" && count > 0) {
        byMcpToolCalled[name] = count;
      }
    }
    return {
      totalExternalHits: totals.totalExternalHits,
      mcpRequests: totals.mcpRequests,
      mcpToolsCall: totals.mcpToolsCall,
      tests: totals.tests,
      byMcpToolCalled,
      storage,
      writeErrors,
    };
  }

  return {
    async recordVisit({ isTest = false, isMcp = false, mcpTool = null } = {}) {
      if (isTest) {
        addDelta("tests", 1);
        scheduleFlush(flushIntervalMs);
        return;
      }
      addDelta("totalExternalHits", 1);
      if (isMcp) addDelta("mcpRequests", 1);
      const knownTool = mcpTool ? getKnownMcpToolName(mcpTool) : null;
      if (knownTool) {
        addDelta("mcpToolsCall", 1);
        addDelta(`tool:${knownTool}`, 1);
        if (useUpstash && flushTimer) {
          clearTimeout(flushTimer);
          flushTimer = null;
        }
        scheduleFlush(Math.min(TOOL_FLUSH_DELAY_MS, flushIntervalMs));
        return;
      }
      scheduleFlush(flushIntervalMs);
    },

    flush,

    async snapshot() {
      if (!useUpstash) return buildResponse(memoryTotals);

      if (hasPending) {
        await flush();
      } else if (inFlightFlush) {
        await inFlightFlush;
      }

      const now = Date.now();
      if (!cachedRemoteTotals || now - cachedRemoteAt > SNAPSHOT_CACHE_TTL_MS) {
        try {
          const result = await executeUpstashCommand(
            ["HMGET", REDIS_KEY, ...TRAFFIC_COUNTER_FIELDS],
            REDIS_TIMEOUT_MS
          );
          if (!Array.isArray(result) || result.length !== TRAFFIC_COUNTER_FIELDS.length) {
            throw new Error("Invalid traffic counter snapshot.");
          }
          const values = result.map(Number);
          if (values.some(v => !Number.isSafeInteger(v) || v < 0)) {
            throw new Error("Invalid traffic counter value.");
          }
          cachedRemoteTotals = Object.fromEntries(
            TRAFFIC_COUNTER_FIELDS.map((f, i) => [f, values[i]])
          );
          cachedRemoteAt = now;
        } catch {
          if (!cachedRemoteTotals) {
            const empty = Object.fromEntries(TRAFFIC_COUNTER_FIELDS.map(f => [f, null]));
            return buildResponse(empty);
          }
        }
      }

      const combined = {};
      for (const field of TRAFFIC_COUNTER_FIELDS) {
        const base = cachedRemoteTotals[field];
        combined[field] = typeof base === "number" ? base + pending[field] : null;
      }
      return buildResponse(combined);
    },
  };
}
