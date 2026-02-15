#!/usr/bin/env node
/**
 * Ping WebSub hub to notify subscribers of feed updates
 *
 * Sends a publish notification to the configured WebSub hub for both
 * the Atom and JSON feeds. The hub then fetches the updated feeds and
 * distributes changes to all verified subscribers.
 *
 * Usage: node scripts/ping-websub.js [--dry-run]
 *
 * Options:
 *   --dry-run  Show what would be sent without actually pinging
 *
 * @see https://www.w3.org/TR/websub/#publishing
 */

const SITE_URL = "https://pulletsforever.com";
const HUB_URL = "https://pubsubhubbub.superfeedr.com/";
const FEEDS = [
  `${SITE_URL}/feed.xml`,
  `${SITE_URL}/feed.json`,
];

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");

/**
 * Ping the WebSub hub for a single feed URL
 *
 * @param {string} feedUrl - The feed URL to notify the hub about
 * @returns {Promise<boolean>} - Whether the ping was accepted
 */
async function pingHub(feedUrl) {
  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would ping: ${HUB_URL}`);
    console.log(`            hub.mode=publish`);
    console.log(`            hub.url=${feedUrl}`);
    return true;
  }

  try {
    const response = await fetch(HUB_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "pulletsforever.com websub publisher",
      },
      body: new URLSearchParams({
        "hub.mode": "publish",
        "hub.url": feedUrl,
      }).toString(),
    });

    if (response.status === 204 || response.ok) {
      console.log(`  [OK] Hub accepted ping for ${feedUrl}`);
      return true;
    } else {
      const body = await response.text();
      console.warn(`  [!] Hub rejected (${response.status}): ${body}`);
      return false;
    }
  } catch (error) {
    console.error(`  [!] Error pinging hub: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log("WebSub Publisher");
  console.log("================");
  console.log(`Hub: ${HUB_URL}`);
  if (DRY_RUN) console.log("[DRY RUN MODE]");
  console.log("");

  let success = 0;
  let failed = 0;

  for (const feedUrl of FEEDS) {
    console.log(`Pinging for: ${feedUrl}`);
    const ok = await pingHub(feedUrl);
    if (ok) {
      success++;
    } else {
      failed++;
    }
  }

  console.log("");
  console.log("Summary");
  console.log("-------");
  console.log(`Accepted: ${success}`);
  if (failed > 0) console.log(`Failed: ${failed}`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
