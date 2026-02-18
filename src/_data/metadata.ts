import author from "./author.ts";
import head_links from "./head_links.ts";
import schema from "./schema.ts";

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

// IndieAuth configuration (using indieauth.com)
const indieauth = {
  authorization_endpoint: "https://indieauth.com/auth",
  token_endpoint: "https://indieauth.com/token",
};

// Micropub configuration
const micropub = {
  endpoint: `https://micropub.${site}/micropub`,
  media_endpoint: `https://micropub.${site}/media`,
};

// WebSub configuration (W3C standard for real-time feed notifications)
const websub = {
  hub: "https://pubsubhubbub.superfeedr.com/",
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
  description:
    "Personal blog by David W. Keith covering technology, food, and creative projects.",
  author: {
    ...author,
    email,
    bio: "Writing about technology, food, and creative projects. Based in Santa Clara, CA.",
    avatar: "/img/avatar.png",
  },
  cloudflare_insights: {
    token: "5049d90e34c84a5ba463d0541825cb30",
  },
  useNavigation: true,
  showSocialLinks: true,
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
    // IndieAuth discovery links
    { rel: "authorization_endpoint", href: indieauth.authorization_endpoint },
    { rel: "token_endpoint", href: indieauth.token_endpoint },
    // Micropub discovery links
    { rel: "micropub", href: micropub.endpoint },
    // WebSub discovery link
    { rel: "hub", href: websub.hub },
  ],
  indieauth,
  micropub,
  websub,
  schema,

  // AT Protocol / Bluesky configuration
  // Set `did` to your Bluesky DID to enable /.well-known/atproto-did
  atproto: {
    did: "",
  },
};
