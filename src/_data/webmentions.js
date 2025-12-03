import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(__dirname, "../../.cache");
const CACHE_FILE = path.join(CACHE_DIR, "webmentions.json");
const CACHE_MAX_AGE = 1000 * 60 * 60; // 1 hour

const DOMAIN = "pulletsforever.com";
const API_URL = "https://webmention.io/api/mentions.jf2";

/**
 * Read cached webmentions from disk
 */
function readCache() {
  if (!fs.existsSync(CACHE_FILE)) {
    return { lastFetched: null, children: [] };
  }
  try {
    const data = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
    return data;
  } catch (error) {
    console.warn("[webmentions] Cache read error:", error.message);
    return { lastFetched: null, children: [] };
  }
}

/**
 * Write webmentions to cache
 */
function writeCache(data) {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
  fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2));
}

/**
 * Fetch webmentions from webmention.io API
 */
async function fetchWebmentions(since = null) {
  const token = process.env.WEBMENTION_IO_TOKEN;

  if (!token) {
    console.warn("[webmentions] WEBMENTION_IO_TOKEN not set, skipping fetch");
    return [];
  }

  const url = new URL(API_URL);
  url.searchParams.set("domain", DOMAIN);
  url.searchParams.set("token", token);
  url.searchParams.set("per-page", "1000");

  if (since) {
    url.searchParams.set("since", since);
  }

  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    console.log(
      `[webmentions] Fetched ${data.children?.length || 0} webmentions`
    );
    return data.children || [];
  } catch (error) {
    console.error("[webmentions] Fetch error:", error.message);
    return [];
  }
}

/**
 * Merge new webmentions with cached ones, deduplicating by wm-id
 */
function mergeWebmentions(cached, fresh) {
  const seen = new Map();

  // Add cached first
  for (const mention of cached) {
    const id = mention["wm-id"];
    if (id) {
      seen.set(id, mention);
    }
  }

  // Add/update with fresh
  for (const mention of fresh) {
    const id = mention["wm-id"];
    if (id) {
      seen.set(id, mention);
    }
  }

  return Array.from(seen.values());
}

/**
 * Get all webmentions, using cache when available
 */
async function getWebmentions() {
  const cache = readCache();
  const now = Date.now();

  // Check if cache is fresh enough (skip fetch during development for speed)
  const cacheAge = cache.lastFetched ? now - cache.lastFetched : Infinity;
  if (cacheAge < CACHE_MAX_AGE && cache.children.length > 0) {
    console.log(
      `[webmentions] Using cached data (${cache.children.length} mentions, ${Math.round(cacheAge / 1000 / 60)}m old)`
    );
    return cache.children;
  }

  // Fetch new mentions since last fetch
  const since = cache.lastFetched
    ? new Date(cache.lastFetched).toISOString()
    : null;

  const fresh = await fetchWebmentions(since);
  const merged = mergeWebmentions(cache.children, fresh);

  // Update cache
  writeCache({
    lastFetched: now,
    children: merged,
  });

  console.log(`[webmentions] Total: ${merged.length} mentions cached`);
  return merged;
}

/**
 * Group webmentions by target URL
 */
function groupByTarget(mentions) {
  const grouped = {};

  for (const mention of mentions) {
    const target = mention["wm-target"];
    if (!target) continue;

    // Normalize URL to path
    try {
      const url = new URL(target);
      const path = url.pathname.replace(/\/$/, "") || "/";

      if (!grouped[path]) {
        grouped[path] = {
          likes: [],
          reposts: [],
          replies: [],
          mentions: [],
        };
      }

      // Categorize by wm-property
      const property = mention["wm-property"];
      switch (property) {
        case "like-of":
          grouped[path].likes.push(mention);
          break;
        case "repost-of":
          grouped[path].reposts.push(mention);
          break;
        case "in-reply-to":
          grouped[path].replies.push(mention);
          break;
        case "mention-of":
        default:
          grouped[path].mentions.push(mention);
          break;
      }
    } catch (error) {
      console.warn("[webmentions] Invalid target URL:", target);
    }
  }

  return grouped;
}

export default async function () {
  const mentions = await getWebmentions();
  return {
    all: mentions,
    byTarget: groupByTarget(mentions),
  };
}
