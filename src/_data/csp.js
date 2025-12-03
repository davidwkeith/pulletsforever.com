export default {
  "base-uri": ["self"],
  "font-src": ["self"],
  "img-src": [
    "self",
    "mirrors.creativecommons.org",
    // Webmention avatars can come from various sources
    "webmention.io",
    "*.gravatar.com",
    "*.githubusercontent.com",
    "*.wp.com",
    "*.twitter.com",
    "*.twimg.com",
    "*.mastodon.social",
  ],
  "connect-src": [
    "self",
    // Webmention.io API for client-side fetching
    "https://webmention.io",
    // Cloudflare Web Analytics RUM endpoint
    "https://cloudflareinsights.com",
  ],
  "script-src-elem": [
    "self",
    "unsafe-inline",
    "https://static.cloudflareinsights.com/beacon.min.js",
    "https://static.cloudflareinsights.com/beacon.min.js/*",
  ],
  "style-src-elem": ["self", "sha256", "unsafe-inline"],
};