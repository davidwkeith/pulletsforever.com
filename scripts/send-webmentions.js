#!/usr/bin/env node
/**
 * Send webmentions for outgoing links in blog posts
 *
 * Usage: node scripts/send-webmentions.js [--dry-run] [--force]
 *
 * Options:
 *   --dry-run  Show what would be sent without actually sending
 *   --force    Resend all mentions (ignore sent cache)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { JSDOM } from "jsdom";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUILD_DIR = path.join(__dirname, "../_site");
const CACHE_DIR = path.join(__dirname, "../.cache");
const SENT_FILE = path.join(CACHE_DIR, "webmentions-sent.json");
const SITE_URL = "https://pulletsforever.com";

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const FORCE = args.includes("--force");

/**
 * Read sent webmentions cache
 */
function readSentCache() {
  if (FORCE || !fs.existsSync(SENT_FILE)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(SENT_FILE, "utf8"));
  } catch {
    return {};
  }
}

/**
 * Write sent webmentions cache
 */
function writeSentCache(data) {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
  fs.writeFileSync(SENT_FILE, JSON.stringify(data, null, 2));
}

/**
 * Find all HTML files in the build directory (blog posts only)
 */
function findBlogPosts() {
  const posts = [];

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // Skip tag pages and non-post directories
        if (!["tags", ".well-known", "blog", "about"].includes(entry.name)) {
          walk(fullPath);
        }
      } else if (entry.name === "index.html") {
        // Check if it's a blog post (has h-entry class)
        const html = fs.readFileSync(fullPath, "utf8");
        if (html.includes('class="h-entry"')) {
          const relativePath = path.relative(BUILD_DIR, dir);
          posts.push({
            path: fullPath,
            url: `${SITE_URL}/${relativePath}/`,
          });
        }
      }
    }
  }

  walk(BUILD_DIR);
  return posts;
}

/**
 * Extract external links from HTML content
 */
function extractLinks(html, sourceUrl) {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const links = [];

  // Only look at links in the main content area
  const content = doc.querySelector(".e-content") || doc.body;
  const anchors = content.querySelectorAll('a[href^="http"]');

  for (const anchor of anchors) {
    const href = anchor.href;
    // Skip internal links and common non-webmention targets
    if (
      href.startsWith(SITE_URL) ||
      href.includes("github.com") ||
      href.includes("gitlab.com") ||
      href.includes("npmjs.com") ||
      href.includes("creativecommons.org") ||
      href.includes("greenweb.org")
    ) {
      continue;
    }
    links.push(href);
  }

  return [...new Set(links)]; // Dedupe
}

/**
 * Discover webmention endpoint for a URL
 */
async function discoverEndpoint(targetUrl) {
  try {
    const response = await fetch(targetUrl, {
      method: "GET",
      headers: {
        Accept: "text/html",
        "User-Agent": "pulletsforever.com webmention sender",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      return null;
    }

    // Check Link header first
    const linkHeader = response.headers.get("Link");
    if (linkHeader) {
      const match = linkHeader.match(/<([^>]+)>;\s*rel="?webmention"?/i);
      if (match) {
        return new URL(match[1], targetUrl).href;
      }
    }

    // Parse HTML for <link rel="webmention">
    const html = await response.text();
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const linkEl = doc.querySelector('link[rel="webmention"]');
    if (linkEl && linkEl.href) {
      return new URL(linkEl.getAttribute("href"), targetUrl).href;
    }

    const aEl = doc.querySelector('a[rel="webmention"]');
    if (aEl && aEl.href) {
      return new URL(aEl.getAttribute("href"), targetUrl).href;
    }

    return null;
  } catch (error) {
    console.warn(`  [!] Error discovering endpoint for ${targetUrl}: ${error.message}`);
    return null;
  }
}

/**
 * Send a webmention
 */
async function sendWebmention(endpoint, source, target) {
  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would send: ${source} -> ${target}`);
    return true;
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "pulletsforever.com webmention sender",
      },
      body: new URLSearchParams({ source, target }).toString(),
    });

    if (response.ok || response.status === 201 || response.status === 202) {
      console.log(`  [OK] Sent: ${source} -> ${target}`);
      return true;
    } else {
      console.warn(`  [!] Failed (${response.status}): ${source} -> ${target}`);
      return false;
    }
  } catch (error) {
    console.warn(`  [!] Error sending: ${error.message}`);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log("Webmention Sender");
  console.log("=================");
  if (DRY_RUN) console.log("[DRY RUN MODE]\n");

  const sent = readSentCache();
  const posts = findBlogPosts();

  console.log(`Found ${posts.length} blog posts\n`);

  let totalSent = 0;
  let totalSkipped = 0;

  for (const post of posts) {
    console.log(`Processing: ${post.url}`);
    const html = fs.readFileSync(post.path, "utf8");
    const links = extractLinks(html, post.url);

    if (links.length === 0) {
      console.log("  No external links found\n");
      continue;
    }

    console.log(`  Found ${links.length} external links`);

    for (const target of links) {
      const cacheKey = `${post.url}|${target}`;

      if (sent[cacheKey] && !FORCE) {
        totalSkipped++;
        continue;
      }

      const endpoint = await discoverEndpoint(target);
      if (!endpoint) {
        console.log(`  [-] No endpoint: ${target}`);
        continue;
      }

      console.log(`  [>] Endpoint found: ${endpoint}`);
      const success = await sendWebmention(endpoint, post.url, target);

      if (success) {
        totalSent++;
        sent[cacheKey] = {
          endpoint,
          sentAt: new Date().toISOString(),
        };
      }

      // Rate limit: wait 1 second between sends
      await new Promise((r) => setTimeout(r, 1000));
    }

    console.log("");
  }

  if (!DRY_RUN) {
    writeSentCache(sent);
  }

  console.log("Summary");
  console.log("-------");
  console.log(`Sent: ${totalSent}`);
  console.log(`Skipped (already sent): ${totalSkipped}`);
}

main().catch(console.error);
