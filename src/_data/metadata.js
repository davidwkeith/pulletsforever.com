import author from "./author.js";
import head_links from "./head_links.js";
import schema from "./schema.js";

const site = "pulletsforever.com";
const title = "Pullets Forever";
const email = "dwk@pulletsforever.com";

// Webmention.io configuration
const webmention = {
  domain: site,
  endpoint: `https://webmention.io/${site}/webmention`,
  pingback: `https://webmention.io/${site}/xmlrpc`,
  // API token loaded from WEBMENTION_IO_TOKEN environment variable at build time
};

export default {
  // Global metadata
  language: "en",
  ogType: "website",
  hasRSSFeed: true,
  colorScheme: "dark light",

  // Site-specific metadata
  title,
  site,
  url: `https://${site}`,
  favicon: "img/logo.svg",
  logo: {
    src: "/img/logo.svg",
    alt: "Stylized pullet head logo",
  },
  description: "Pullet surprise writing.",
  author: {
    ...author,
    email,
  },
  cloudflare_insights: {
    token: "5049d90e34c84a5ba463d0541825cb30",
  },
  useNavigation: true,
  webmention,
  head_links: [
    ...head_links,
    {
      rel: "alternate",
      href: "/feed.xml",
      type: "application/atom+xml",
      title: `${title} (Atom)`,
    },
    {
      rel: "alternate",
      href: "/feed.json",
      type: "application/feed+json",
      title: `${title} (JSON)`,
    },
    { rel: "reply-to", href: email },
    // Webmention discovery links
    { rel: "webmention", href: webmention.endpoint },
    { rel: "pingback", href: webmention.pingback },
  ],
  schema,
};
