import { createAnonymousCounters } from "./anonymousCounters.js";
import { MCP_TOOLS, getKnownMcpToolName } from "./mcpServer.js";

const TOOL_NAMES = MCP_TOOLS.map(({ name }) => name);
const TOOL_FIELDS = TOOL_NAMES.map(name => `tool:${name}`);
const BASE_FIELDS = ["totalExternalHits", "mcpRequests", "mcpToolsCall", "tests"];
const FIELDS = [...BASE_FIELDS, ...TOOL_FIELDS];

export function createTrafficCounters({ useUpstash = false } = {}) {
  const counters = createAnonymousCounters({
    redisKey: "veritas:traffic-totals:v1",
    fields: FIELDS,
    useUpstash,
  });

  return {
    async recordVisit({ isTest = false, isMcp = false, mcpTool = null } = {}) {
      if (isTest) {
        await counters.record("tests");
        return;
      }
      const ops = [counters.record("totalExternalHits")];
      if (isMcp) ops.push(counters.record("mcpRequests"));
      const knownTool = mcpTool ? getKnownMcpToolName(mcpTool) : null;
      if (knownTool) {
        ops.push(counters.record("mcpToolsCall"));
        ops.push(counters.record(`tool:${knownTool}`));
      }
      await Promise.all(ops);
    },

    async snapshot() {
      const { storage, writeErrors, ...totals } = await counters.snapshot();
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
    },
  };
}
