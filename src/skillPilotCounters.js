import { executeUpstashCommand } from "./trustStore.js";

const REDIS_KEY = "veritas:skill-review-pilot:v1";
const REDIS_TIMEOUT_MS = 1500;
const FIELDS = ["httpSamples", "mcpSamples", "skillReviews", "tests"];

export function createSkillPilotCounters({ useUpstash = false } = {}) {
  const storage = useUpstash ? "upstash-redis" : "memory";
  const counts = Object.fromEntries(FIELDS.map(field => [field, 0]));
  let writeErrors = 0;

  return {
    async record(field) {
      if (!Object.hasOwn(counts, field)) return;
      if (!useUpstash) {
        counts[field] += 1;
        return;
      }

      try {
        const count = await executeUpstashCommand(["HINCRBY", REDIS_KEY, field, 1], REDIS_TIMEOUT_MS);
        if (!Number.isSafeInteger(count) || count < 1) throw new Error("Invalid counter result.");
      } catch {
        // A lost Redis response can follow a successful increment, so do not retry it.
        writeErrors += 1;
      }
    },

    async snapshot() {
      if (!useUpstash) return { ...counts, storage, writeErrors };

      let values;
      try {
        const result = await executeUpstashCommand(["HMGET", REDIS_KEY, ...FIELDS], REDIS_TIMEOUT_MS);
        if (!Array.isArray(result) || result.length !== FIELDS.length) throw new Error("Invalid counter snapshot.");
        values = result.map(Number);
        if (values.some(value => !Number.isSafeInteger(value) || value < 0)) throw new Error("Invalid counter value.");
      } catch {
        values = FIELDS.map(() => null);
      }
      return {
        ...Object.fromEntries(FIELDS.map((field, index) => [field, values[index]])),
        storage,
        writeErrors,
      };
    },
  };
}
