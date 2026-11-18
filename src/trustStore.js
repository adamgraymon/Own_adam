/**
 * Persistencia del historial de confianza (VERITAS MCP Trust).
 *
 * Backends, en orden de preferencia:
 *  1. Upstash Redis REST  (UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN)  -> sobrevive reinicios en Render free.
 *  2. Archivo JSON local   (TRUST_DATA_DIR, por defecto ./data)                -> útil en local o con disco persistente.
 *  3. Solo memoria         (si nada de lo anterior está disponible).
 *
 * Sin dependencias externas: usa fetch nativo. Las escrituras son "fire-and-forget" y nunca
 * bloquean ni rompen una respuesta MCP.
 */

import fs from "node:fs/promises";
import path from "node:path";

const FILE_NAME = "trust-snapshots.json";

function redisHashKey() {
  return process.env.TRUST_HISTORY_REDIS_KEY || "veritas:trust:snapshots:v1";
}

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

function dataFilePath() {
  return path.resolve(process.env.TRUST_DATA_DIR || "data", FILE_NAME);
}

async function redis(cmd) {
  const cfg = redisConfig();
  const res = await fetch(cfg.url, {
    method: "POST",
    redirect: "error",
    headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`Upstash HTTP ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error("Upstash command failed.");
  return json.result;
}

export const trustStoreStatus = {
  backend: "memory",
  loadedSnapshots: 0,
  lastLoadAt: null,
  lastSaveAt: null,
  saveErrors: 0,
  lastError: null,
};

export function activeBackend() {
  if (redisConfig()) return "upstash-redis";
  if (process.env.TRUST_PERSIST_FILE !== "0") return "local-file";
  return "memory";
}

/** Carga todas las fichas guardadas. Devuelve un array de [url, snapshot]. */
export async function loadTrustSnapshots() {
  const backend = activeBackend();
  trustStoreStatus.backend = backend;
  try {
    let entries = [];
    if (backend === "upstash-redis") {
      const flat = (await redis(["HGETALL", redisHashKey()])) || [];
      for (let i = 0; i + 1 < flat.length; i += 2) {
        try {
          entries.push([flat[i], JSON.parse(flat[i + 1])]);
        } catch {
          /* entrada corrupta: ignorar */
        }
      }
    } else if (backend === "local-file") {
      try {
        const obj = JSON.parse(await fs.readFile(dataFilePath(), "utf8"));
        entries = Object.entries(obj);
      } catch (err) {
        if (err.code !== "ENOENT") throw err;
      }
    }
    trustStoreStatus.loadedSnapshots = entries.length;
    trustStoreStatus.lastLoadAt = new Date().toISOString();
    return entries;
  } catch (err) {
    trustStoreStatus.lastError = `load: ${err.message}`;
    return [];
  }
}

let fileWriteChain = Promise.resolve();

/** Guarda (o actualiza) la ficha de un servidor. No lanza errores. */
export function saveTrustSnapshot(serverUrl, snapshot, allSnapshotsMap) {
  const backend = activeBackend();
  const done = () => (trustStoreStatus.lastSaveAt = new Date().toISOString());
  const fail = (err) => {
    trustStoreStatus.saveErrors += 1;
    trustStoreStatus.lastError = `save: ${err.message}`;
  };
  if (backend === "upstash-redis") {
    return redis(["HSET", redisHashKey(), serverUrl, JSON.stringify(snapshot)]).then(done, fail);
  }
  if (backend === "local-file" && allSnapshotsMap) {
    // Serializar escrituras y escribir de forma atómica (tmp + rename).
    fileWriteChain = fileWriteChain
      .then(async () => {
        const file = dataFilePath();
        await fs.mkdir(path.dirname(file), { recursive: true });
        const tmp = `${file}.tmp`;
        await fs.writeFile(tmp, JSON.stringify(Object.fromEntries(allSnapshotsMap)), "utf8");
        await fs.rename(tmp, file);
      })
      .then(done, fail);
    return fileWriteChain;
  }
  return Promise.resolve();
}
