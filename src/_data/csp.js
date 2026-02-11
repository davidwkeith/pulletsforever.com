export default {
  "default-src": ["self"],
  "base-uri": ["self"],
  "frame-ancestors": ["none"],
  "object-src": ["none"],
  "font-src": ["self"],
  "img-src": [
    "self",
    "https://mirrors.creativecommons.org",
    "https://app.greenweb.org",
    // Webmention avatars can come from various sources
    "https://webmention.io",
    "https://*.gravatar.com",
    "https://*.githubusercontent.com",
    "https://*.wp.com",
    "https://*.twitter.com",
    "https://*.twimg.com",
    "https://*.mastodon.social",
  ],
  "connect-src": [
    "self",
    // Webmention.io API for client-side fetching
    "https://webmention.io",
    // Cloudflare Web Analytics RUM endpoint
    "https://cloudflareinsights.com",
  ],
  "script-src": [
    "self",
    "unsafe-inline",
    "https://static.cloudflareinsights.com/beacon.min.js",
    "https://static.cloudflareinsights.com/beacon.min.js/*",
  ],
  "script-src-elem": [
    "self",
    "unsafe-inline",
    "https://static.cloudflareinsights.com/beacon.min.js",
    "https://static.cloudflareinsights.com/beacon.min.js/*",
  ],
  "style-src": ["self", "unsafe-inline"],
  "style-src-elem": ["self", "unsafe-inline"],
};
