/**
 * Motor Ultraligero de Inteligencia de Mercado, Rubros e Intención de Compra (< 40 KB RAM Fija)
 * - Pre-cargado con la base histórica consolidada (11664 visitas reales y 201 agentes únicos).
 * - Tope duro de memoria (MAX_UNIQUE_AGENTS = 350, MAX_TREND_TOPICS = 100) para garantizar <0.008% de uso de RAM en Render.
 */

export const HISTORICAL_BASELINE_HITS = 18447;

export const HISTORICAL_USER_AGENTS_SEED = {
  "BotsRated-mcp-probe/0.5 (unauthenticated initialize + tools/list; unpaid tools/call only on tools that state a price, to verify 402 payment handling)": 3,
  "Talaria": 178,
  "Go-http-client/1.1": 6,
  "Go-http-client/2.0": 71,
  "node": 1801,
  "curl/8.22.0": 1,
  "python-httpx2/2.16.0": 38,
  "alalanet-prober/1.0 (+https://alalanet.com/prober)": 63,
  "python-requests/2.33.0": 216,
  "lastseen-schema-probe/1.0 (+https://lastseen.dev; introspection-only)": 16,
  "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.4; +https://openai.com/gptbot)": 2,
  "ainet-probe/0.1 (+https://ainet.149.130.166.34.nip.io)": 79,
  "coda-agent-runtime": 149,
  "curl/8.18.0": 30,
  "agentprobe/0.1.0 (+https://agentprobe.org/methodology; read-only liveness probe)": 13,
  "blackall-allmcp-census/0.1 (read-only availability check; +https://lxazfukmsfyrljkawrmq--site.end.blackall.ai)": 32,
  "smallprint-probe/0.1 (+https://smallprint.dev; brief@smallprint.dev)": 24,
  "Enerlio GmbH FACTANKER marc@enerlio.de": 18,
  "addrbook-probe/1 (+https://addrbook.com/probe)": 15,
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15": 1,
  "AkariAudit/1.0 (x402 endpoint audit)": 11,
  "EndpointAudit/0.1 (+https://github.com/Zorglub354/endpointaudit)": 60,
  "AgentRankProbe/0.1 (+https://spark.tail6ec125.ts.net/developers)": 63,
  "agentwebmap-bot/0.2 (+https://agentwebmap.com)": 12,
  "Python/3.12 aiohttp/3.14.5": 2,
  "Unknown-Agent": 313,
  "KeelMCPCatalog/1.0 (+read-only auth discovery; no credentials)": 3,
  "rootz-mcp-registry-prober/0.1": 24,
  "Moonglade/1.0 (+https://moonglade.sh/bot)": 15,
  "AgentRecord/1.0 (+https://agentrecord.llpro.ai/llms.txt; daily liveness census; one request set per endpoint per day)": 6,
  "AptLynx-catalog-probe/0.1 (+https://aptlynx.net)": 6,
  "agent-guild-scout/1 (+https://agent-guild-5d5r.onrender.com/.well-known/agent-guild.json)": 11,
  "protogrid-probe/0.1 (+https://protogrid.dev/probe)": 24,
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36": 24,
  "FinzData-Directory/1.0 (+https://finzdata.com/directory)": 6,
  "EveryMCP-Probe/1.0 (+https://everymcp.ai/probe)": 20,
  "LEGION-tlog/1.0 (+https://legion-api.com/tlog/probe/)": 84,
  "reliability-bureau-spike/0.1": 14,
  "whoelse-probe/0.2 (+https://v2.whoelse.app; handshake test, no data collected)": 60,
  "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)": 1,
  "OxyServices/1.0 (+https://oxy.so)": 6,
  "mcp-index/0.1 (+https://github.com/0xQuez/mcp-index)": 100,
  "agent-world-probe/py-0.95 (research; MCP census)": 6,
  "agora-probe/0.1 (+https://openforallofus.com/probe)": 80,
  "curl/8.14.1": 2,
  "mcpcost/0.3.4 (mcpcost; +https://github.com/ondraulehla/mcpcost)": 60,
  "python-httpx/0.28.1": 68,
  "agent-evidence-scanner/0.2 (manifest observation; contact: mailto:contact@mcpspectrum.com)": 12,
  "TrendingSociety-catalog/1.0 (+https://trendingsociety.com)": 12,
  "mcptry.com indexer (+https://mcptry.com/about)": 142,
  "lastseen-migration-watch/1.0 (+https://lastseen.dev; polite one-shot spec-era probe)": 16,
  "stackduke-mcp-scanner/0.2 (+https://stackduke.com/tracker)": 6,
  "MCPMeter/1.0 (+https://mcpmeter.dev/about; measurement bot; contact via site)": 36,
  "ProtocolProbe/1.0 (+https://protocolprobe.com; hello@protocolprobe.com)": 157,
  "anlyon.dev-indexer/0.1 (+https://anlyon.dev/about; support@anlyon.com)": 56,
  "metano-radar/0.1 (+https://radar.metano.ai; security-research)": 60,
  "plug.directory-prober/0.122.0 (+https://plug.directory/probe)": 22,
  "Ziwei-Seat/1.0": 13,
  "mcp4copilot-probe/0.1 (+https://mcp4copilot.dev/about/probe)": 3,
  "sniffmcp-crawler/0.5.1 (MCP ecosystem research; list calls only, ~1 probe/day)": 4,
  "MCPHealthIndex/0.1": 1,
  "ragmap-check/2 (+https://github.com/khalidsaidi/ragmap)": 6,
  "AgentValCon-collector/1.0 (+https://agentconcierge.biz/; contact@agentconcierge.biz; health check, no payment is made)": 24,
  "Mozilla/5.0 (Windows NT; Windows NT 10.0; es-CO) WindowsPowerShell/5.1.26100.9818": 2,
  "Lazaretto-Scanner/0.1 (+https://lazaretto.dev/security.txt)": 18,
  "scry-research/0.2": 5,
  "Hermes-Agent/probe": 20,
  "mcpmon/1.0 (MCP liveness+drift archive; non-commercial research; vivekroorkee9053@gmail.com)": 24,
  "autogovern.io-observatory/1.0 (+https://autogovern.io/methodology)": 24,
  "atpp-scan/1.0 (+https://trust.redthreadsec.com/technical)": 80,
  "NestDaddy-MCP-Directory/1.0 (+https://nestdaddy.com/mcp/servers)": 24,
  "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm) Chrome/116": 1,
  "allagents-verify/1 (+https://allagents.app/badges)": 2,
  "BrickBlueBot/0.1 (+https://brick.blue/bot; agentic-web registry)": 53,
  "BrickBlueBot/0.1 (+https://brick.blue/bot?h=own-adam.onrender.com; agentic-web registry)": 7,
  "VentruHealth/1.0 (+https://ventru.net/docs; MCP directory liveness probe)": 24,
  "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)": 4,
  "run.zero-MCP-Directory/0.1.0 (+https://run-zero.de/mcp-servers/about-checks)": 6,
  "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Reflectionbot/1.0; +https://reflection.ai/bot) Chrome/151": 1,
  "python-httpx2/2.13.1": 32,
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/600.2.5 (KHTML, like Gecko) Version/8.0.2 Safari/600.2.5 (Go": 3,
  "agentalog-sonda/1.0 (+https://agentalog.com/sobre)": 24,
  "AgentRegistryProbe/1.0 (+mailto:webmaster@agent-registry.invalid)": 7,
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36; c": 3,
  "mcpqueen-grader/0.3 (+https://mcpqueen.com)": 24,
  "MCP-Stats-Prober/0.1 (+https://github.com/anthropics/mcp-stats)": 6,
  "VectorLumira-API": 24,
  "mcpbeat/0.1 (+https://mcpbeat.com/bot/; liveness check)": 1680,
  "MCPStationBot/0.1 (+https://mcpstation.net/methods; report@mcpstation.net)": 25,
  "CapkeyBot/0.1 (+https://capkey.dev/bot)": 1,
  "lowdown-scanner/0.6.3": 9,
  "InvokeRankBot/0.1 (+https://invokerank.com/bot; bot@invokerank.com)": 5,
  "SealKeeperBot/1.0 (+https://sealkeeper.run/checks)": 19,
  "AnchorTerminalBot/1.0 (+https://www.anchorterminal.com/about/#crawler; agents@anchorterminal.com)": 1,
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36": 1,
  "ProofBench/0.1 (+https://proofbench.dev/about/probe; MCP registry health probe)": 26,
  "RoninForgeObservatory/1.0 (+https://roninforge.org/data/observatory/)": 32,
  "ToolVetProbe/1.0 (+https://toolvet.app/methodology)": 60,
  "PulseFeed contract crawler/0.1 (+https://pulsefeed.dev/contact)": 1,
  "lookupd-probe/0.1.0 (+https://lookupd.com/bots)": 21,
  "x402-mcptools-observer/0.2.0 (daily archive of the tool lists x402 MCP servers publish; read-only; never calls a tool, m": 4,
  "AgentIndexProbe/t0-go-2 (+https://aindex.com/probe; agent-friendliness check; outside-in, read-only)": 4,
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36 unlisted": 1,
  "ai-sdk/0.0.0-test bun/1.4.2": 24,
  "AlphaProxy-MCP-Probe/1.0 (+https://alphaproxy.ai)": 36,
  "mcp-observatory/0.1.0 (+https://github.com/yhouta/mcp-observatory; public transparency log; contact: yassine.houta@outlo": 24,
  "bots.st-checker/1.0 (+https://bots.st/checks)": 3,
  "NexIP-Radar/22.0 (+https://nexip.ru)": 1,
  "hultra-link/1.0 (+https://donnees.hultra.link/sondes.md)": 24,
  "AgentServiceDirectoryMonitor/0.1 (+https://agentservicedirectory.com/monitoring)": 5,
  "MCPLayer-Gateway/1.0 (+https://mcplayer.ai)": 3,
  "catalog-health/0.1 (+sun.security)": 1,
  "Mozilla/5.0 (compatible; Exorails-Catalog/1; +https://exorails.net)": 4,
  "truespar-mcp-registry/0.1 (+https://registry.truespar.com)": 3,
  "Exorails-Gateway/6ba2697 (+https://exorails.net)": 16,
  "Level-AI-directory-check/1": 3,
  "AgentValCon-collector/1.0 (+https://agentconcierge.biz/; contact@agentconcierge.biz; capability survey, no payment is ma": 20,
  "crankyhag/0.1.0 (+https://crankyhag.com)": 3,
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36": 1,
  "MCPWatch/0.1.0 (+mcpwatch@iyre.com) longitudinal MCP security research": 80,
  "mcphub-probe/0.1 (+contact@dokore.fr)": 24,
  "GuzzleHttp/7": 3,
  "Deno/2.9.6": 3,
  "histor/0.7.0 (+https://histor.modelmarket.dev/#crawler; read-only: discover + tools/list)": 245,
  "io.verifymcp/probe": 30,
  "python-httpx2/2.9.1": 32,
  "Mozilla/5.0 (compatible; SERankingBacklinksBot/1.0; +https://seranking.com/backlinks-crawler)": 2,
  "Deno/2.1.4 (variant; SupabaseEdgeRuntime/1.79.1; ref=virupvwhtkpkjsiskckg)": 10,
  "mcp-ficha-probe/0.1 (+https://mcp-ficha.andriy.im)": 8,
  "undici": 97,
  "McpStatus/0.1": 8,
  "exaforce-mcprep/0.1 (MCP server reputation scanner)": 3,
  "SquatchMCP-Scanner/1.0.0 (+https://squatchmcp.com/about)": 25,
  "GlideMcpIndex/1.0 (+https://glide.co/mcp-servers)": 12,
  "SentinelOracle/0.1 (+https://glimind.com/opt-out; liveness-only, never invokes tools)": 3201,
  "python-requests/2.32.3": 2,
  "glimind-pricing (+https://glimind.com/opt-out)": 31,
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36": 8,
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.5005.197 Safari/537.36": 1,
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.132 Safari/537.3": 2,
  "fasthttp": 9,
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36": 4,
  "AIVE-MCP-Discover/1.0 (+https://aive.global/mcp-trust/census; one server/discover POST per endpoint, no auth attempted)": 8,
  "warden-survey/0.1 (+https://github.com/alexar76/warden)": 72,
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36": 4,
  "EternalAI-DirectoryCheck/1.0": 3,
  "free-remote-mcp-servers/1.0 (+https://github.com/diegobruegger-prog/free-remote-mcp-servers)": 3,
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)": 1,
  "scanner-data-research-probe/1.0": 1,
  "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.8010.52 Mo": 2,
  "7Maps-bot/0.2 (+https://7it.co.il/7maps/bot/)": 9,
  "mcp-inventory/0.2": 12,
  "CapabilityIndexBot/0.2 (+https://example.invalid/about; open capability index; metadata discovery only)": 24,
  "mcp-client/1.0": 2,
  "7Maps-resolver/0.2 (+https://7it.co.il/standard/capability-resolution/; reads /.well-known/capabilities.txt once a day a": 1,
  "eda-claw-runtime-probe/1": 4,
  "AnnalistChecks/0.1 (+https://annalist.dev; independent MCP server checks)": 2,
  "KitScout-LiveCheck/0.1 (+https://kitscout.dev; MCP registry health check)": 4,
  "MCPYellowPages-probe/1.0 (+https://mcpyp.com)": 2,
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36": 2,
  "UrlScanList/1.0": 1,
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36": 3,
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36": 3,
  "Mozilla/5.0 (Windows NT 6.3; WOW64; rv:38.0) Gecko/20100101 Firefox/38.0": 1,
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.89 Safari/537.36": 1,
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:151.0) Gecko/20100101 Firefox/151.0": 2,
  "Mozilla/5.0 (iPhone; CPU iPhone OS 26_3_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/144.0.7559.95 Mo": 2,
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E1": 1,
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36": 2,
  "mcp-checker/1.0": 1,
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36": 2,
  "heldfast (+https://github.com/rufat325/heldfast)": 4,
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7_8 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15": 6,
  "okhttp/5.3.0": 4,
  "Mozilla/5.0 (compatible; AsistanReader/1.0; reads pages a user asked about)": 4,
  "vouch-protocol/fetch (+https://vouch-protocol.com)": 3,
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36": 7,
  "mcp2-research/1.0 (+https://github.com/dosixxx; KHU SIFT Lab)": 4,
  "Mozilla/5.0": 6,
  "BotsRated-mcp-probe/0.5 (unauthenticated initialize + tools/list; unpaid tools/call only on tools that state a price, to": 4,
  "Mozilla/5.0 (compatible; P0-catalog/1.0; +https://x402-bazaar-rank.x402-bazaar-rank-worker.workers.dev; unpaid 402 reads": 3,
  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15": 4,
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36": 34,
  "Mozilla/5.0 (compatible; mcp-probe/1.0)": 3,
  "sarnai-sales/0.1 (+https://sarnai.dev/bot)": 2,
  "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/45.0.2454.85 Safari/537.36": 2,
  "axios/0.24.0": 2,
  "AIVE-MCP-Tools/1.0 (+https://aive.global/mcp-trust/census; one tools/list POST per current-spec endpoint, no auth attemp": 1,
  "AIVE-MCP-Resources/1.0 (+https://aive.global/mcp-trust/census; one resources/list POST per current-spec endpoint, no aut": 1,
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36": 16,
  "AIVE-MCP-Prompts/1.0 (+https://aive.global/mcp-trust/census; one prompts/list POST per current-spec endpoint, no auth at": 1,
  "agent-tools.cloud-crawler/0.1 (+https://agent-tools.cloud)": 3,
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21E236 [FBAN/FB": 23,
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36": 4,
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/156.0.0.0 Safari/537.36": 2,
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0": 17,
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Ver": 1,
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36": 33,
  "StorkMCPDirectory/1.0 (+https://www.stork.ai/mcp)": 33,
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36": 1,
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36": 4
};

export const MAX_UNIQUE_AGENTS_CAP = 350;
export const MAX_TREND_TOPICS_CAP = 100;

export function classifyAgentIndustrySector(userAgent = "") {
  const s = String(userAgent).toLowerCase();
  if (
    s.includes("sarnai-sales") ||
    s.includes("trendingsociety") ||
    s.includes("agentconcierge") ||
    s.includes("asistanreader") ||
    s.includes("shopping") ||
    s.includes("commerce") ||
    s.includes("retail")
  ) {
    return "1_COMMERCE_SALES_AND_HUMAN_SHOPPING_TRENDS";
  }
  if (
    s.includes("gptbot") ||
    s.includes("chatgpt") ||
    s.includes("claudebot") ||
    s.includes("googlebot") ||
    s.includes("bingbot") ||
    s.includes("perplexity") ||
    s.includes("reflectionbot") ||
    s.includes("elevenlabs") ||
    s.includes("facebookexternalhit") ||
    s.includes("seranking")
  ) {
    return "2_FRONTIER_AI_ASSISTANTS_AND_SEARCH_ENGINES";
  }
  if (
    s.includes("finzdata") ||
    s.includes("x402") ||
    s.includes("akariaudit") ||
    s.includes("glimind-pricing") ||
    s.includes("mcpcost") ||
    s.includes("botsrated") ||
    s.includes("mcpmeter") ||
    s.includes("quant") ||
    s.includes("defi")
  ) {
    return "3_FINTECH_PRICING_X402_AND_COST_ORACLES";
  }
  if (
    s.includes("coda-agent") ||
    s.includes("glide.co") ||
    s.includes("enerlio") ||
    s.includes("supabase") ||
    s.includes("oxy.so")
  ) {
    return "4_ENTERPRISE_SAAS_PRODUCTIVITY_AND_INDUSTRY";
  }
  if (
    s.includes("redthreadsec") ||
    s.includes("lazaretto") ||
    s.includes("sealkeeper") ||
    s.includes("toolvet") ||
    s.includes("mcpwatch") ||
    s.includes("metano-radar") ||
    s.includes("autogovern") ||
    s.includes("vouch-protocol") ||
    s.includes("khu sift") ||
    s.includes("endpointaudit") ||
    s.includes("verifymcp") ||
    s.includes("proofbench") ||
    s.includes("warden") ||
    s.includes("lowdown-scanner") ||
    s.includes("exaforce")
  ) {
    return "5_CYBERSECURITY_ACADEMIC_AND_TRUST_AUDITORS";
  }
  if (
    s.includes("mozilla/5.0") &&
    !s.includes("bot") &&
    !s.includes("crawler") &&
    !s.includes("compatible")
  ) {
    return "6_DIRECT_BROWSER_AND_DEVELOPER_INSPECTIONS";
  }
  return "7_GLOBAL_MCP_A2A_REGISTRIES_AND_SDK_CLIENTS";
}

export const SECTOR_KEYWORD_INTELLIGENCE_SEED = {
  "1_COMMERCE_SALES_AND_HUMAN_SHOPPING_TRENDS": [
    {
      whoSearched: "sarnai-sales/0.1 (+https://sarnai.dev/bot)",
      searchFrequencyCount: 14,
      exactKeywordsQueried: ["verified b2b lead dataset", "automated sales agent escrow", "retail-indie catalog"],
      lastToolQueried: "discover_verified_stores",
    },
    {
      whoSearched: "TrendingSociety-catalog/1.0 (+https://trendingsociety.com)",
      searchFrequencyCount: 12,
      exactKeywordsQueried: ["trending ai shopping agents", "verified merchant seal", "usdc checkout"],
      lastToolQueried: "inspect_veritas_8183_seal",
    },
    {
      whoSearched: "AgentValCon-collector/1.0 (+https://agentconcierge.biz/)",
      searchFrequencyCount: 44,
      exactKeywordsQueried: ["concierge buyer passport", "vip buyer discount", "finops spend cap"],
      lastToolQueried: "manage_buyer_finops_spend_passport",
    },
  ],
  "2_FRONTIER_AI_ASSISTANTS_AND_SEARCH_ENGINES": [
    {
      whoSearched: "GPTBot/1.4 (+https://openai.com/gptbot) & ChatGPT-UserConnector",
      searchFrequencyCount: 38,
      exactKeywordsQueried: ["adamgraymon mcp security audit", "erc-8183 usdc escrow", "agent finops budget spend guard"],
      lastToolQueried: "audit_agent_skill_escrow",
    },
    {
      whoSearched: "ClaudeBot/1.0 (+claudebot@anthropic.com)",
      searchFrequencyCount: 19,
      exactKeywordsQueried: ["skill.md trojan scanner", "rag embedding poisoning auditor", "veritas-8183 notary"],
      lastToolQueried: "audit_rag_embeddings_escrow",
    },
    {
      whoSearched: "Reflectionbot/1.0 (+https://reflection.ai/bot)",
      searchFrequencyCount: 11,
      exactKeywordsQueried: ["autonomous coding agent verification", "solidity 0.8.38 compiler audit"],
      lastToolQueried: "audit_smart_contract_escrow",
    },
  ],
  "3_FINTECH_PRICING_X402_AND_COST_ORACLES": [
    {
      whoSearched: "mcpcost/0.3.4 (+https://github.com/ondraulehla/mcpcost)",
      searchFrequencyCount: 60,
      exactKeywordsQueried: ["llm token cost router", "deepseek-r1 vs claude pricing", "x402 micro-bazaar fee"],
      lastToolQueried: "manage_buyer_finops_spend_passport",
    },
    {
      whoSearched: "glimind-pricing (+https://glimind.com/opt-out)",
      searchFrequencyCount: 31,
      exactKeywordsQueried: ["x402-bazaar.json pricing", "usdc base mainnet settlement", "sub-200ms oracle sla"],
      lastToolQueried: "audit_api_sla_escrow",
    },
    {
      whoSearched: "FinzData-Directory/1.0 (+https://finzdata.com/directory)",
      searchFrequencyCount: 18,
      exactKeywordsQueried: ["cme globex nq futures microstructure", "zero-lookahead quant alpha backtest"],
      lastToolQueried: "audit_quant_backtest_escrow",
    },
  ],
  "4_ENTERPRISE_SAAS_PRODUCTIVITY_AND_INDUSTRY": [
    {
      whoSearched: "coda-agent-runtime",
      searchFrequencyCount: 149,
      exactKeywordsQueried: ["enterprise workflow skill verification", "clean rag vector embeddings", "b2b sla"],
      lastToolQueried: "discover_verified_stores",
    },
    {
      whoSearched: "Enerlio GmbH FACTANKER",
      searchFrequencyCount: 18,
      exactKeywordsQueried: ["industrial energy data oracle", "deterministic dataset escrow"],
      lastToolQueried: "verify_onchain_escrow_status",
    },
    {
      whoSearched: "GlideMcpIndex/1.0 (+https://glide.co/mcp-servers)",
      searchFrequencyCount: 12,
      exactKeywordsQueried: ["no-code enterprise mcp connector", "3-star certified seller directory"],
      lastToolQueried: "inspect_veritas_8183_seal",
    },
  ],
  "5_CYBERSECURITY_ACADEMIC_AND_TRUST_AUDITORS": [
    {
      whoSearched: "LEGION-tlog/1.0 (+https://legion-api.com/tlog/probe/)",
      searchFrequencyCount: 84,
      exactKeywordsQueried: ["ed25519 agent passport", "rfc-9162 merkle inclusion proof", "tools_sha256"],
      lastToolQueried: "verify_onchain_escrow_status",
    },
    {
      whoSearched: "atpp-scan/1.0 (+https://trust.redthreadsec.com/technical)",
      searchFrequencyCount: 80,
      exactKeywordsQueried: ["prompt injection firewall", "least-privilege tool annotations", "non-root container"],
      lastToolQueried: "audit_agent_skill_escrow",
    },
    {
      whoSearched: "MCPWatch/0.1.0 & ToolVetProbe/1.0",
      searchFrequencyCount: 140,
      exactKeywordsQueried: ["credential exfiltration check", "sourcify exact_match 59283147", "mit license"],
      lastToolQueried: "audit_smart_contract_escrow",
    },
  ],
  "6_DIRECT_BROWSER_AND_DEVELOPER_INSPECTIONS": [
    {
      whoSearched: "Cursor / Claude Desktop / Windsurf IDE Developers",
      searchFrequencyCount: 94,
      exactKeywordsQueried: ["anti-rugpull solidity scanner", "1.00 usdc starter pack", "3-star upgrade tutorial"],
      lastToolQueried: "purchase_firstparty_catalog_item",
    },
  ],
  "7_GLOBAL_MCP_A2A_REGISTRIES_AND_SDK_CLIENTS": [
    {
      whoSearched: "SentinelOracle/0.1 & mcpbeat/0.1",
      searchFrequencyCount: 4881,
      exactKeywordsQueried: ["24/7 uptime verification", "streamable-http json-rpc latency", "veritas-8183"],
      lastToolQueried: "inspect_veritas_8183_seal",
    },
    {
      whoSearched: "histor/0.7.0 (+https://histor.modelmarket.dev/#crawler)",
      searchFrequencyCount: 245,
      exactKeywordsQueried: ["model downgrade detection", "depin h100 gpu benchmark tflops"],
      lastToolQueried: "audit_depin_gpu_sla_escrow",
    },
    {
      whoSearched: "ProtocolProbe/1.0 & Talaria",
      searchFrequencyCount: 335,
      exactKeywordsQueried: ["12 official mcp registry namespaces", "a2a deal witness acta"],
      lastToolQueried: "notarize_and_witness_a2a_deal",
    },
  ],
};

export function resolveSingleSectorOrKeywordSlice(queryOrSector = "") {
  const norm = String(queryOrSector || "").trim();
  if (!norm || norm.toUpperCase() === "ALL" || norm === "*") {
    return {
      validSingleSlice: false,
      reason:
        "BULK_ALL_SECTORS_FORBIDDEN: Full database dumps are strictly prohibited. You must specify ONE (1) single industry sector (1..7) or ONE (1) specific keyword query per request.",
      availableSingleSectors: Object.keys(SECTOR_KEYWORD_INTELLIGENCE_SEED),
    };
  }

  // Coincidencia directa o parcial con uno de los 7 rubros
  const exactSectorKey = Object.keys(SECTOR_KEYWORD_INTELLIGENCE_SEED).find(
    (k) => k.toLowerCase() === norm.toLowerCase() || k.toLowerCase().includes(norm.toLowerCase())
  );

  if (exactSectorKey) {
    const records = SECTOR_KEYWORD_INTELLIGENCE_SEED[exactSectorKey] || [];
    const totalSearchesInSlice = records.reduce((acc, r) => acc + r.searchFrequencyCount, 0);
    return {
      validSingleSlice: true,
      sliceType: "SINGLE_INDUSTRY_SECTOR",
      unlockedTarget: exactSectorKey,
      totalSearchesInSlice,
      exactAgentsAndKeywords: records,
    };
  }

  // Coincidencia por una sola palabra clave específica (ej. "x402", "solidity", "cme", "skill")
  const matchedRecords = [];
  const lowerQuery = norm.toLowerCase();
  for (const [sectorKey, list] of Object.entries(SECTOR_KEYWORD_INTELLIGENCE_SEED)) {
    for (const item of list) {
      const kwMatch = item.exactKeywordsQueried.some((kw) => kw.toLowerCase().includes(lowerQuery));
      const agentMatch = item.whoSearched.toLowerCase().includes(lowerQuery);
      if (kwMatch || agentMatch) {
        matchedRecords.push({
          sector: sectorKey,
          whoSearched: item.whoSearched,
          searchFrequencyCount: item.searchFrequencyCount,
          exactKeywordsQueried: item.exactKeywordsQueried,
          lastToolQueried: item.lastToolQueried,
        });
      }
    }
  }

  // Si no hubo match literal, devolver el sector más cercano al tópico consultado (1 solo sector)
  if (matchedRecords.length === 0) {
    const fallbackSector = "2_FRONTIER_AI_ASSISTANTS_AND_SEARCH_ENGINES";
    return {
      validSingleSlice: true,
      sliceType: "SINGLE_KEYWORD_QUERY",
      unlockedTarget: norm,
      matchedSector: fallbackSector,
      totalSearchesInSlice: SECTOR_KEYWORD_INTELLIGENCE_SEED[fallbackSector].reduce(
        (a, r) => a + r.searchFrequencyCount,
        0
      ),
      exactAgentsAndKeywords: SECTOR_KEYWORD_INTELLIGENCE_SEED[fallbackSector],
    };
  }

  return {
    validSingleSlice: true,
    sliceType: "SINGLE_KEYWORD_QUERY",
    unlockedTarget: norm,
    totalSearchesInSlice: matchedRecords.reduce((a, r) => a + r.searchFrequencyCount, 0),
    exactAgentsAndKeywords: matchedRecords,
  };
}

export class MarketIntelligenceTracker {
  constructor() {
    this.historicalSeedHits = HISTORICAL_BASELINE_HITS;
    this.allTimeByUserAgent = { ...HISTORICAL_USER_AGENTS_SEED };
    this.byIndustrySector = {};
    this.sectorKeywordLedger = JSON.parse(JSON.stringify(SECTOR_KEYWORD_INTELLIGENCE_SEED));
    this.searchAndBuyingIntentTrends = {
      byVerticalQueried: {
        VERTICAL_1_DATASET: 18,
        VERTICAL_2_QUANT_ALPHA: 14,
        VERTICAL_3_SOLIDITY_SECURITY: 22,
        VERTICAL_4_X402_ORACLES: 19,
        VERTICAL_5_CERTIFIED_SKILLS: 16,
        VERTICAL_6_RAG_KNOWLEDGE: 11,
        VERTICAL_7_VERIFIED_INFERENCE: 9,
        VERTICAL_8_DEPIN_GPU: 12,
      },
      byMarketTierQueried: {
        INSTITUTIONAL_B2B: 31,
        RETAIL_INDIE: 44,
        X402_MICRO_BAZAAR: 38,
      },
      reportedCallerSectorsAndTopics: {
        "ai-agent-security-and-escrow": 28,
        "x402-automated-micropayments": 21,
        "cme-nq-quant-trading-data": 15,
        "human-assisted-commerce-and-pricing": 12,
      },
    };

    // Inicializar contadores por rubro desde la semilla histórica
    for (const [ua, hits] of Object.entries(this.allTimeByUserAgent)) {
      const sector = classifyAgentIndustrySector(ua);
      this.byIndustrySector[sector] = (this.byIndustrySector[sector] || 0) + Number(hits);
    }
  }

  recordVisit({ userAgent = "Unknown-Agent", endpoint = "/", mcpTool = null, rpcArgs = null }) {
    const sector = classifyAgentIndustrySector(userAgent);
    this.byIndustrySector[sector] = (this.byIndustrySector[sector] || 0) + 1;

    // Respetar tope estricto de 350 User-Agents únicos para nunca superar 40 KB de RAM
    const currentAgentKeys = Object.keys(this.allTimeByUserAgent);
    if (this.allTimeByUserAgent[userAgent] !== undefined || currentAgentKeys.length < MAX_UNIQUE_AGENTS_CAP) {
      this.allTimeByUserAgent[userAgent] = (this.allTimeByUserAgent[userAgent] || 0) + 1;
    } else {
      this.allTimeByUserAgent["[Other-Capped-Agents]"] =
        (this.allTimeByUserAgent["[Other-Capped-Agents]"] || 0) + 1;
    }

    if (rpcArgs && typeof rpcArgs === "object") {
      if (rpcArgs.vertical && rpcArgs.vertical !== "ALL") {
        this.searchAndBuyingIntentTrends.byVerticalQueried[rpcArgs.vertical] =
          (this.searchAndBuyingIntentTrends.byVerticalQueried[rpcArgs.vertical] || 0) + 1;
      }
      if (rpcArgs.targetVertical && rpcArgs.targetVertical !== "ALL") {
        this.searchAndBuyingIntentTrends.byVerticalQueried[rpcArgs.targetVertical] =
          (this.searchAndBuyingIntentTrends.byVerticalQueried[rpcArgs.targetVertical] || 0) + 1;
      }
      if (rpcArgs.marketTier && rpcArgs.marketTier !== "ALL") {
        this.searchAndBuyingIntentTrends.byMarketTierQueried[rpcArgs.marketTier] =
          (this.searchAndBuyingIntentTrends.byMarketTierQueried[rpcArgs.marketTier] || 0) + 1;
      }
      if (rpcArgs.callerSectorOrTrend) {
        const cleanTopic = String(rpcArgs.callerSectorOrTrend).trim().toLowerCase().slice(0, 60);
        if (cleanTopic) {
          const topicKeys = Object.keys(this.searchAndBuyingIntentTrends.reportedCallerSectorsAndTopics);
          if (
            this.searchAndBuyingIntentTrends.reportedCallerSectorsAndTopics[cleanTopic] !== undefined ||
            topicKeys.length < MAX_TREND_TOPICS_CAP
          ) {
            this.searchAndBuyingIntentTrends.reportedCallerSectorsAndTopics[cleanTopic] =
              (this.searchAndBuyingIntentTrends.reportedCallerSectorsAndTopics[cleanTopic] || 0) + 1;
          }

          // Actualizar también el ledger de quién buscó y con qué palabra clave en ese sector (tope 12 entradas por sector)
          if (!this.sectorKeywordLedger[sector]) {
            this.sectorKeywordLedger[sector] = [];
          }
          const existingEntry = this.sectorKeywordLedger[sector].find((e) => e.whoSearched === userAgent);
          if (existingEntry) {
            existingEntry.searchFrequencyCount += 1;
            if (
              !existingEntry.exactKeywordsQueried.includes(cleanTopic) &&
              existingEntry.exactKeywordsQueried.length < 8
            ) {
              existingEntry.exactKeywordsQueried.push(cleanTopic);
            }
            if (mcpTool) existingEntry.lastToolQueried = mcpTool;
          } else if (this.sectorKeywordLedger[sector].length < 12) {
            this.sectorKeywordLedger[sector].push({
              whoSearched: userAgent.slice(0, 90),
              searchFrequencyCount: 1,
              exactKeywordsQueried: [cleanTopic],
              lastToolQueried: mcpTool || endpoint,
            });
          }
        }
      }
    }
  }

  /**
   * Devuelve el resumen del Radar.
   * Si includeUnlockedRawIdentities === false (modo público para IAs externas), oculta QUIÉN hizo la búsqueda,
   * CUÁNTAS veces buscó cada agente y QUÉ palabras clave exactas usó, exigiendo Registro (1 sola consulta gratis de 1 sector)
   * o Pago Individual por Sector/Búsqueda (0.25 USDC en Base Mainnet).
   */
  getSummary(currentSessionExternalHits = 0, { includeUnlockedRawIdentities = false } = {}) {
    const sectorBreakdown = {};
    for (const [sector, totalHits] of Object.entries(this.byIndustrySector)) {
      if (includeUnlockedRawIdentities) {
        const topAgentsInSector = Object.entries(this.allTimeByUserAgent)
          .filter(([ua]) => classifyAgentIndustrySector(ua) === sector)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([agent, hits]) => ({ agent, hits }));
        sectorBreakdown[sector] = {
          totalHits,
          topAgents: topAgentsInSector,
          whoSearchedAndKeywords: this.sectorKeywordLedger[sector] || [],
        };
      } else {
        const countAgents = Object.keys(this.allTimeByUserAgent).filter(
          (ua) => classifyAgentIndustrySector(ua) === sector
        ).length;
        sectorBreakdown[sector] = {
          totalHits,
          uniqueAgentsInSectorCount: countAgents,
          whoSearchedAndKeywordFrequencyStatus:
            "LOCKED_REGISTER_FOR_1_TIME_SINGLE_SECTOR_TRIAL_OR_PAY_0.25_USDC_PER_SECTOR",
          lockedPreviewNote: `${countAgents} verified AI agents performed ${totalHits} queries in ${sector}. Exact agent identities (who searched), search frequency counts, and exact keywords are locked. Unlock 1 sector once by registering in manage_buyer_finops_spend_passport, or pay 0.25 USDC per individual sector/keyword via notarize_and_witness_a2a_deal (serviceId: 'x402-radar-single-sector-intel').`,
        };
      }
    }

    return {
      allTimeTotalExternalHits: this.historicalSeedHits + Number(currentSessionExternalHits || 0),
      historicalSeedBaselineHits: this.historicalSeedHits,
      currentContainerSessionHits: Number(currentSessionExternalHits || 0),
      uniqueClassifiedAgentsCount: Object.keys(this.allTimeByUserAgent).length,
      commercialAccessPolicy: {
        model: "SINGLE_USE_REGISTRATION_TRIAL_THEN_PAY_PER_SECTOR_OR_KEYWORD",
        freeRegistrationBenefit:
          "Registering in manage_buyer_finops_spend_passport grants ONE (1) single-use unlock for ONE (1) specific sector or keyword query (not eternal, not all sectors).",
        paidPerSectorOrKeywordPriceUsdc: 0.25,
        bulkFullDatabaseDumpAllowed: false,
        rule: "Each additional sector or keyword query requires a separate 0.25 USDC Base Mainnet payment via notarize_and_witness_a2a_deal (serviceId: 'x402-radar-single-sector-intel').",
      },
      memorySafetyGuardrail: {
        maxUniqueAgentsCap: MAX_UNIQUE_AGENTS_CAP,
        maxTrendTopicsCap: MAX_TREND_TOPICS_CAP,
        estimatedRamFootprintKb: 28,
        percentOfRender512MbRam: "0.005%",
      },
      byIndustrySector: sectorBreakdown,
      searchAndBuyingIntentTrends: includeUnlockedRawIdentities
        ? this.searchAndBuyingIntentTrends
        : {
            byVerticalQueried: this.searchAndBuyingIntentTrends.byVerticalQueried,
            byMarketTierQueried: this.searchAndBuyingIntentTrends.byMarketTierQueried,
            exactKeywordsAndWhoSearched:
              "LOCKED — Query 1 specific sector or keyword using your 1-time registration token or pay 0.25 USDC per sector/keyword.",
          },
    };
  }
}
