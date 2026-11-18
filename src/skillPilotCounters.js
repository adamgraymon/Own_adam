import { createAnonymousCounters } from "./anonymousCounters.js";

export function createSkillPilotCounters({ useUpstash = false } = {}) {
  return createAnonymousCounters({
    redisKey: "veritas:skill-review-pilot:v1",
    fields: ["httpSamples", "mcpSamples", "skillReviews", "tests"],
    useUpstash,
  });
}
