import author from "./author.js";
import head_links from "./head_links.js";
import schema from "./schema.js";

const site = "pulletsforever.com";
const title = "Pullets Forever";
const email = "dwk@pulletsforever.com";

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
  head_links: [
    ...head_links,
    {
      rel: "alternate",
      href: "/feed.json",
      type: "application/feed+json",
      title,
    },
    { rel: "reply-to", href: email },
  ],
  schema,
};
