/**
 * Persistent storage for external sellers registered via `register_and_certify_store`
 * and their public-registry consent (including consent withdrawal).
 *
 * Uses Upstash Redis (`veritas:seller-registry:v1`) when configured, or local file
 * (`data/seller-registry.json`) otherwise. Public MCP registration requires a
 * confirmed Redis write. File and memory are available to legacy local callers.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { activeBackend, executeUpstashCommand } from "./trustStore.js";

const FILE_NAME = "seller-registry.json";

function redisKey() {
  return process.env.SELLER_REGISTRY_REDIS_KEY || "veritas:seller-registry:v1";
}

function notaryActasRedisKey() {
  return process.env.NOTARY_ACTAS_REDIS_KEY || "veritas:notary-actas:v1";
}

function buyerPassportsRedisKey() {
  return process.env.BUYER_PASSPORTS_REDIS_KEY || "veritas:buyer-passports:v1";
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

export function saveSellerRegistryEntry(storeId, record, allEntriesMap = null) {
  const backend = activeBackend();
  if (backend === "upstash-redis") {
    return executeUpstashCommand(["HSET", redisKey(), storeId, JSON.stringify(record)])
      .then(added => added === 0 || added === 1 ? { added: added === 1 } : null, () => null);
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
    return writeChain.then(() => null);
  }
  return Promise.resolve(null);
}

const SCANNER_PROBE_STORE_IDS = new Set(["probe-43923-store"]);

export async function enableSellerRegistryPersistence(ledger) {
  if (!ledger.persistedSellerEntries) ledger.persistedSellerEntries = new Map();
  const entries = await loadSellerRegistryEntries();
  for (const [storeId, record] of entries) {
    if (!record || typeof record !== "object") continue;
    const existing = ledger.stores?.[storeId];
    const isReservedSystemStore =
      existing &&
      (existing.isFirstParty === true || existing.isCoreSimStore === true || existing.isDemo === true);
    const isScannerProbe =
      SCANNER_PROBE_STORE_IDS.has(storeId) ||
      String(record.name || "").startsWith("OVERWRITE-PROOF-") ||
      String(record.endpoint || "").includes("attacker.example");
    if (isReservedSystemStore || isScannerProbe) {
      if (activeBackend() === "upstash-redis") {
        void executeUpstashCommand(["HDEL", redisKey(), storeId]).catch(() => {});
      }
      continue;
    }
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
  ledger.confirmSellerRecord = async (storeId, record) => {
    if (activeBackend() !== "upstash-redis") return null;
    const confirmation = await saveSellerRegistryEntry(storeId, record);
    if (confirmation) ledger.persistedSellerEntries.set(storeId, record);
    return confirmation;
  };

  // Cargar y persistir Actas Notariales (notarize_and_witness_a2a_deal) y Pasaportes Opt-in (manage_buyer_finops_spend_passport)
  if (activeBackend() === "upstash-redis") {
    try {
      const rawActas = (await executeUpstashCommand(["HGETALL", notaryActasRedisKey()])) || [];
      const loadedActas = [];
      for (let i = 0; i + 1 < rawActas.length; i += 2) {
        try {
          const parsed = JSON.parse(rawActas[i + 1]);
          if (parsed && parsed.actaId) loadedActas.push(parsed);
        } catch {
          /* ignore */
        }
      }
      if (loadedActas.length > 0) {
        loadedActas.sort((a, b) => String(b.timestampIso || "").localeCompare(String(a.timestampIso || "")));
        ledger.veritasNotaryRegistry = loadedActas.slice(0, 50);
      }
    } catch {
      /* ignore */
    }
    try {
      const rawBuyers = (await executeUpstashCommand(["HGETALL", buyerPassportsRedisKey()])) || [];
      for (let i = 0; i + 1 < rawBuyers.length; i += 2) {
        try {
          const buyerId = rawBuyers[i];
          const parsed = JSON.parse(rawBuyers[i + 1]);
          if (!parsed || typeof parsed !== "object") continue;
          if (parsed.withdrawn) {
            if (ledger.buyerDirectoryConsent) delete ledger.buyerDirectoryConsent[buyerId];
          } else if (parsed.buyerRecord && parsed.consent) {
            if (!ledger.buyerAgents) ledger.buyerAgents = {};
            if (!ledger.buyerAgents[buyerId]?.isDemo) {
              ledger.buyerAgents[buyerId] = parsed.buyerRecord;
            }
            if (!ledger.buyerDirectoryConsent) ledger.buyerDirectoryConsent = {};
            ledger.buyerDirectoryConsent[buyerId] = parsed.consent;
            if (!ledger.registeredVerifiedBuyerIds) ledger.registeredVerifiedBuyerIds = new Set();
            ledger.registeredVerifiedBuyerIds.add(buyerId);
          }
        } catch {
          /* ignore */
        }
      }
    } catch {
      /* ignore */
    }
  }

  ledger.persistNotaryActa = (actaRecord) => {
    if (!actaRecord?.actaId || activeBackend() !== "upstash-redis") return Promise.resolve(null);
    return executeUpstashCommand(["HSET", notaryActasRedisKey(), actaRecord.actaId, JSON.stringify(actaRecord)]).catch(
      () => null
    );
  };

  ledger.persistBuyerPassport = (buyerId, payload) => {
    if (!buyerId || activeBackend() !== "upstash-redis") return Promise.resolve(null);
    return executeUpstashCommand(["HSET", buyerPassportsRedisKey(), buyerId, JSON.stringify(payload)]).catch(
      () => null
    );
  };

  return { loadedSellers: entries.filter(([, r]) => r && !r.withdrawn).length };
}
