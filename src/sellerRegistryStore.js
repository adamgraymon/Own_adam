/**
 * Persistent storage for external sellers registered via `register_and_certify_store`
 * and their public-registry consent (including consent withdrawal).
 *
 * Uses Upstash Redis (`veritas:seller-registry:v1`) when configured, or local file
 * (`data/seller-registry.json`) otherwise.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { activeBackend, executeUpstashCommand } from "./trustStore.js";

const FILE_NAME = "seller-registry.json";

function redisKey() {
  return process.env.SELLER_REGISTRY_REDIS_KEY || "veritas:seller-registry:v1";
}

function dataFilePath() {
  return path.resolve(process.env.TRUST_DATA_DIR || "data", FILE_NAME);
}

export async function loadSellerRegistryEntries() {
  const backend = activeBackend();
  try {
    const entries = [];
    if (backend === "upstash-redis") {
      const flat = (await executeUpstashCommand(["HGETALL", redisKey()])) || [];
      for (let i = 0; i + 1 < flat.length; i += 2) {
        try {
          entries.push([flat[i], JSON.parse(flat[i + 1])]);
        } catch {
          /* ignore corrupted entry */
        }
      }
    } else if (backend === "local-file") {
      try {
        const obj = JSON.parse(await fs.readFile(dataFilePath(), "utf8"));
        for (const [k, v] of Object.entries(obj)) entries.push([k, v]);
      } catch (err) {
        if (err.code !== "ENOENT") throw err;
      }
    }
    return entries;
  } catch {
    return [];
  }
}

let writeChain = Promise.resolve();

// Reports a new listing only when Upstash acknowledges creation of its hash field.
export function saveSellerRegistryEntry(storeId, record, allEntriesMap = null) {
  const backend = activeBackend();
  if (backend === "upstash-redis") {
    return executeUpstashCommand(["HSET", redisKey(), storeId, JSON.stringify(record)])
      .then(added => added === 1, () => false);
  }
  if (backend === "local-file" && allEntriesMap) {
    writeChain = writeChain
      .then(async () => {
        const file = dataFilePath();
        await fs.mkdir(path.dirname(file), { recursive: true });
        const tmp = `${file}.tmp`;
        await fs.writeFile(tmp, JSON.stringify(Object.fromEntries(allEntriesMap)), "utf8");
        await fs.rename(tmp, file);
      })
      .catch(() => {});
    return writeChain.then(() => false);
  }
  return Promise.resolve(false);
}

export async function enableSellerRegistryPersistence(ledger) {
  if (!ledger.persistedSellerEntries) ledger.persistedSellerEntries = new Map();
  const entries = await loadSellerRegistryEntries();
  for (const [storeId, record] of entries) {
    if (!record || typeof record !== "object") continue;
    ledger.persistedSellerEntries.set(storeId, record);
    if (record.withdrawn) {
      delete ledger.stores[storeId];
    } else if (record.id && record.publicRegistryConsent?.accepted === true) {
      ledger.stores[storeId] = record;
    }
  }
  ledger.persistSellerRecord = (storeId, record) => {
    ledger.persistedSellerEntries.set(storeId, record);
    return saveSellerRegistryEntry(storeId, record, ledger.persistedSellerEntries);
  };
  return { loadedSellers: entries.filter(([, r]) => r && !r.withdrawn).length };
}
