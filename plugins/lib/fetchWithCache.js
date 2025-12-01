import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(__dirname, "..", ".cache");
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR);

function getCacheKey(str) {
  return crypto.createHash("sha256").update(str).digest("hex");
}

export default async function fetchWithCache(url, ttlSeconds = 3600) {
  const cacheFile = path.join(CACHE_DIR, getCacheKey(url));
  const now = Date.now();

  if (fs.existsSync(cacheFile)) {
    try {
      const { timestamp, data } = JSON.parse(fs.readFileSync(cacheFile, "utf-8"));
      if (now - timestamp < ttlSeconds * 1000) return data;
    } catch (e) {
      fs.unlinkSync(cacheFile); // Corrupted cache file
    }
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed for ${url}: ${res.statusText}`);
  const data = await res.json();

  fs.writeFileSync(cacheFile, JSON.stringify({ timestamp: now, data }));
  return data;
}