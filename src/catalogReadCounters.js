import { createAnonymousCounters } from "./anonymousCounters.js";

const CATALOGS = ["auditedServers", "evaluatedSkills", "commercialCatalog"];
const CHANNELS = ["http", "mcp", "tests"];
const FIELDS = CATALOGS.flatMap(catalog => CHANNELS.map(channel => `${catalog}:${channel}`));

export function createCatalogReadCounters({ useUpstash = false } = {}) {
  const counters = createAnonymousCounters({
    redisKey: "veritas:catalog-reads:v1",
    fields: FIELDS,
    useUpstash,
  });

  return {
    async record(catalog, channel) {
      if (!CATALOGS.includes(catalog) || !CHANNELS.includes(channel)) return;
      await counters.record(`${catalog}:${channel}`);
    },

    async snapshot() {
      const { storage, writeErrors, ...totals } = await counters.snapshot();
      const catalogs = Object.fromEntries(CATALOGS.map(catalog => {
        const reads = Object.fromEntries(CHANNELS.map(channel => [channel, totals[`${catalog}:${channel}`]]));
        return [catalog, reads];
      }));
      return { ...catalogs, storage, writeErrors };
    },
  };
}
