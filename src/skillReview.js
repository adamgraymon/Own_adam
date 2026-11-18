import { isMap, parseDocument } from "yaml";
import { scanAgentSkillIndicators } from "./multiVerticalAuditors.js";
import { activeBackend, executeUpstashCommand } from "./trustStore.js";

export const FREE_SKILL_REVIEW_TOOL = "review_agent_skill_free";
export const FREE_SKILL_REVIEW_SAMPLE_PATH = "/skills/review/sample.json";
export const SKILL_CATALOG_REDIS_KEY = "veritas:skill-catalog:v1";
export const SKILL_REVIEW_MAX_FILES = 8;
export const SKILL_REVIEW_MAX_FILE_BYTES = 32 * 1024;
export const SKILL_REVIEW_MAX_TOTAL_BYTES = 96 * 1024;
export const SKILL_REVIEW_MAX_PATH_LENGTH = 200;

const limitations = [
  "Static heuristics on the supplied text. A result with no findings does not certify a skill as safe.",
  "Checks required SKILL.md metadata and reports the first match of each static rule per file. It does not run files, fetch URLs or resolve dependencies.",
];

function invalidInput(reason) {
  return {
    ok: false,
    tool: FREE_SKILL_REVIEW_TOOL,
    priceUsdc: 0,
    status: "INVALID_SKILL_FILES",
    reason,
  };
}

function validateFiles(files) {
  if (!Array.isArray(files) || files.length < 1 || files.length > SKILL_REVIEW_MAX_FILES) {
    return `Provide between 1 and ${SKILL_REVIEW_MAX_FILES} text files.`;
  }

  let hasSkill = false;
  let totalBytes = 0;
  const paths = new Set();
  for (const file of files) {
    if (!file || typeof file !== "object" || Array.isArray(file) ||
        Object.keys(file).some(key => key !== "path" && key !== "content")) {
      return "Each file must contain only path and content.";
    }
    const { path, content } = file;
    if (
      typeof path !== "string" || path.length > SKILL_REVIEW_MAX_PATH_LENGTH ||
      /[\\:\u0000-\u001f\u007f]/.test(path) ||
      path.split("/").some(part => !part || part === "." || part === ".." || part.trim() !== part)
    ) {
      return "Use relative paths with forward slashes and no empty or traversal segments.";
    }
    if (typeof content !== "string" || content.includes("\0")) {
      return "Each file needs UTF-8 text in content.";
    }
    const key = path.normalize("NFC").toLowerCase();
    if (paths.has(key)) return "Each file path must be unique.";
    paths.add(key);
    if (path === "SKILL.md") hasSkill = true;

    const bytes = Buffer.byteLength(content, "utf8");
    if (bytes > SKILL_REVIEW_MAX_FILE_BYTES) {
      return `Each file can contain at most ${SKILL_REVIEW_MAX_FILE_BYTES} UTF-8 bytes.`;
    }
    totalBytes += bytes;
    if (totalBytes > SKILL_REVIEW_MAX_TOTAL_BYTES) {
      return `The review can contain at most ${SKILL_REVIEW_MAX_TOTAL_BYTES} UTF-8 bytes in total.`;
    }
  }
  return hasSkill ? null : "Include SKILL.md at the root of the supplied files.";
}

function metadataFindings(content) {
  const lines = content.split(/\r\n|\n|\r/);
  const missingHeader = {
    ruleId: "SKILL_FRONTMATTER_MISSING",
    severity: "error",
    line: 1,
    message: "SKILL.md must start with YAML frontmatter between two --- markers.",
  };
  const lastLine = lines.findIndex((line, index) => index > 0 && /^---[ \t]*$/.test(line));
  if (!/^\uFEFF?---[ \t]*$/.test(lines[0]) || lastLine < 0) return [missingHeader];

  let doc;
  try {
    doc = parseDocument(lines.slice(1, lastLine).join("\n"), {
      strict: true,
      prettyErrors: false,
      logLevel: "silent",
    });
  } catch {
    // Never include the parser's error excerpt in a report.
  }
  if (!doc || doc.errors.length || !isMap(doc.contents)) {
    return [{
      ruleId: "SKILL_FRONTMATTER_INVALID",
      severity: "error",
      line: 1,
      message: "The frontmatter must be a valid YAML mapping.",
    }];
  }

  return ["name", "description"].flatMap(field => {
    const value = doc.get(field);
    if (typeof value === "string" && value.trim()) return [];
    return [{
      ruleId: `SKILL_METADATA_${field.toUpperCase()}_MISSING`,
      severity: "error",
      line: 1,
      message: `The YAML frontmatter needs a non-empty ${field} string.`,
    }];
  });
}

export function reviewAgentSkillFree(args = {}) {
  if (!args || typeof args !== "object" || Array.isArray(args) ||
      Object.keys(args).some(key => key !== "files")) {
    return invalidInput("Send files, or call with empty arguments to view the sample.");
  }
  if (!Object.hasOwn(args, "files")) return getFreeSkillReviewSample();

  const error = validateFiles(args.files);
  if (error) return invalidInput(error);

  const files = args.files.map(({ path, content }) => {
    const findings = scanAgentSkillIndicators(content).map(({ ruleId, index }) => ({
      ruleId,
      severity: "warning",
      line: content.slice(0, index).split(/\r\n|\n|\r/).length,
      message: "A static security indicator matched. Review the file at this line.",
    }));
    if (path === "SKILL.md") findings.push(...metadataFindings(content));
    findings.sort((a, b) => a.line - b.line || a.ruleId.localeCompare(b.ruleId));
    return { path, findings };
  });

  const findingsCount = files.reduce((total, file) => total + file.findings.length, 0);
  return {
    ok: true,
    tool: FREE_SKILL_REVIEW_TOOL,
    priceUsdc: 0,
    sample: false,
    verdict: findingsCount ? "REVIEW_REQUIRED" : "NO_FINDINGS",
    files,
    summary: {
      filesScanned: files.length,
      filesWithFindings: files.filter(file => file.findings.length).length,
      findingsCount,
    },
    limitations,
  };
}

export function getFreeSkillReviewSample() {
  const exampleInput = {
    files: [
      {
        path: "SKILL.md",
        content: "---\nname: sample-sorter\ndescription: Sorts supplied labels alphabetically.\n---\n# Sort labels\nReturn the labels in alphabetical order.",
      },
      {
        path: "references/notes.md",
        content: "# Fictional notes\nA typographic sample contains a zero-width space here: \u200b.",
      },
    ],
  };
  return { ...reviewAgentSkillFree(exampleInput), sample: true, exampleInput };
}

export async function enableSkillCatalogPersistence(ledger) {
  if (!ledger.skillCatalog) ledger.skillCatalog = new Map();
  if (activeBackend() === "upstash-redis") {
    try {
      const flat = (await executeUpstashCommand(["HGETALL", SKILL_CATALOG_REDIS_KEY])) || [];
      for (let i = 0; i + 1 < flat.length; i += 2) {
        try {
          ledger.skillCatalog.set(flat[i], JSON.parse(flat[i + 1]));
        } catch {
          /* ignore */
        }
      }
    } catch {
      /* ignore */
    }
  }
  return { loadedSkills: ledger.skillCatalog.size };
}

export async function saveEvaluatedSkillRecord(ledger, skillId, record) {
  if (ledger) {
    if (!ledger.skillCatalog) ledger.skillCatalog = new Map();
    ledger.skillCatalog.set(skillId, record);
  }
  if (activeBackend() === "upstash-redis") {
    await executeUpstashCommand(["HSET", SKILL_CATALOG_REDIS_KEY, skillId, JSON.stringify(record)]).catch(() => {});
  }
  return record;
}

export function listEvaluatedSkills(ledger, { limit = 100 } = {}) {
  const map = ledger?.skillCatalog;
  if (!map) return [];
  const items = [...map.values()];
  items.sort((a, b) => (a.findingsCount ?? 0) - (b.findingsCount ?? 0) || String(a.skillId).localeCompare(String(b.skillId)));
  return items.slice(0, limit);
}
