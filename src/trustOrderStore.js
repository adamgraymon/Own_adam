import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_DIRECTORY = fileURLToPath(new URL("../data/trust-orders/", import.meta.url));
const DEFAULT_REDIS_PREFIX = "veritas:trust-orders:local:v1";

function storageConfig() {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!redisUrl && !redisToken) {
    return { directory: path.resolve(process.env.TRUST_ORDER_DATA_DIR || DEFAULT_DIRECTORY) };
  }
  if (!redisUrl || !redisToken) {
    throw new Error("Paid trust orders require both Upstash REST environment variables.");
  }

  let url;
  try {
    url = new URL(redisUrl);
  } catch {
    throw new Error("The Upstash REST URL is invalid.");
  }
  const localHttp = url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (!(url.protocol === "https:" || localHttp) || url.username || url.password || url.search || url.hash) {
    throw new Error("Use an HTTPS Upstash REST URL without credentials or query parameters.");
  }
  return {
    redisUrl: url.href,
    redisToken,
    prefix: process.env.TRUST_ORDER_REDIS_PREFIX?.trim() || DEFAULT_REDIS_PREFIX,
  };
}

function storageId(paymentHash, kind) {
  const hash = typeof paymentHash === "string" ? paymentHash.trim().toLowerCase() : "";
  if (!/^0x[0-9a-f]{64}$/.test(hash)) {
    throw new Error("A valid Base transaction hash is required for a trust order.");
  }
  return `${kind}:${hash}`;
}

function readJson(value) {
  if (value === null) return null;
  const record = JSON.parse(value);
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw new Error("Invalid trust order record.");
  }
  return record;
}

async function redisCommand(config, command) {
  const response = await fetch(config.redisUrl, {
    method: "POST",
    redirect: "error",
    headers: { Authorization: `Bearer ${config.redisToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error("Upstash request failed.");
  const payload = await response.json();
  if (payload.error || !Object.hasOwn(payload, "result")) throw new Error("Upstash command failed.");
  return payload.result;
}

function localPath(config, id) {
  return path.join(config.directory, `${id.replace(":", "-")}.json`);
}

async function readLocal(filename) {
  try {
    return readJson(await fs.readFile(filename, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

async function insertLocal(config, id, json) {
  await fs.mkdir(config.directory, { recursive: true, mode: 0o700 });
  const filename = localPath(config, id);
  const tempFile = path.join(config.directory, `.${randomUUID()}.tmp`);
  const file = await fs.open(tempFile, "wx", 0o600);
  try {
    try {
      await file.writeFile(json, "utf8");
      await file.sync();
    } finally {
      await file.close();
    }

    try {
      // Publish the finished file atomically. A competing writer keeps its record.
      await fs.link(tempFile, filename);
      return readJson(json);
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      return await readLocal(filename);
    }
  } finally {
    await fs.unlink(tempFile).catch(() => {});
  }
}

async function readRecord(paymentHash, kind) {
  const id = storageId(paymentHash, kind);
  const config = storageConfig();
  try {
    return config.redisUrl
      ? readJson(await redisCommand(config, ["GET", `${config.prefix}:${id}`]))
      : await readLocal(localPath(config, id));
  } catch {
    throw new Error("Paid trust order storage could not be read.");
  }
}

async function insertRecord(paymentHash, kind, record) {
  const id = storageId(paymentHash, kind);
  const config = storageConfig();
  try {
    const json = JSON.stringify(record);
    const normalized = readJson(json);
    if (!normalized) throw new Error("Missing trust order record.");
    if (config.redisUrl) {
      const key = `${config.prefix}:${id}`;
      const inserted = await redisCommand(config, ["SET", key, json, "NX"]);
      if (inserted === "OK") return normalized;
      if (inserted !== null) throw new Error("Unexpected Redis SET response.");
      const existing = readJson(await redisCommand(config, ["GET", key]));
      if (existing) return existing;
      throw new Error("Winning trust order record could not be read.");
    }
    const existing = await insertLocal(config, id, json);
    if (existing) return existing;
    throw new Error("Winning trust order record could not be read.");
  } catch {
    throw new Error("Paid trust order storage could not be updated.");
  }
}

export async function readTrustPaymentOrder(paymentHash) {
  return readRecord(paymentHash, "order");
}

export async function reserveTrustPaymentOrder(paymentHash, order) {
  return insertRecord(paymentHash, "order", order);
}

export async function readTrustPaymentReport(paymentHash) {
  return readRecord(paymentHash, "report");
}

export async function saveTrustPaymentReport(paymentHash, report) {
  return insertRecord(paymentHash, "report", report);
}

export function createTrustOrderLocalStore(directoryName) {
  const config = {
    directory: path.resolve(process.env.TRUST_ORDER_DATA_DIR || DEFAULT_DIRECTORY, directoryName),
  };
  return {
    read(kind, key) {
      return readLocal(localPath(config, storageId(key, kind)));
    },
    insert(kind, key, record) {
      return insertLocal(config, storageId(key, kind), JSON.stringify(record));
    },
  };
}
