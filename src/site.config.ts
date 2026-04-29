/**
 * Site-wide config consumed by layouts, feeds, and discovery endpoints.
 * Single source of truth for identity, IndieWeb endpoints, and head links.
 */

const site = "pulletsforever.com";
const url = `https://${site}`;
const title = "Pullets Forever";
const description =
  "Personal blog by David W. Keith covering technology, food, and creative projects.";
const language = "en";
const email = "dwk@pulletsforever.com";

const author = {
  name: "David W. Keith",
  email: "me@dwk.io",
  url: "https://dwk.io/",
  fediverse: "@dwk@xn--4t8h.dwk.io",
  bio: "Writing about technology, food, and creative projects. Based in Santa Clara, CA.",
  avatar: "/img/avatar.png",
  alternates: {
    mastodon: "https://xn--4t8h.dwk.io/@Dwk",
    keybase: "https://keybase.io/dwkeith",
    facebook: "https://www.facebook.com/davidwkeith",
    reddit: "https://www.reddit.com/user/dwkeith",
    github: "https://github.com/davidwkeith",
    linkedin: "https://www.linkedin.com/in/davidwkeith",
    blog: "https://pulletsforever.com",
  },
};

const webmention = {
  domain: site,
  endpoint: `https://webmention.io/${site}/webmention`,
  pingback: `https://webmention.io/${site}/xmlrpc`,
};

const indieauth = {
  authorization_endpoint: "https://indieauth.com/auth",
  token_endpoint: "https://indieauth.com/token",
};

const websub = {
  hub: "https://pubsubhubbub.superfeedr.com/",
};

const logo = {
  src: "/img/logo.svg",
  alt: "Stylized pullet head logo",
};

const schema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: title,
  description,
  image: `${url}/img/logo.svg`,
  url: `${url}/`,
  author: {
    "@type": "Person",
    name: author.name,
    url: author.url.replace(/\/$/, ""),
    email: `mailto:${email}`,
    sameAs: [
      author.alternates.mastodon,
      author.alternates.keybase,
      author.alternates.facebook,
      author.alternates.reddit,
      author.alternates.github,
      author.alternates.linkedin,
      author.alternates.blog,
    ],
  },
} as const;

interface HeadLink {
  rel: string;
  href: string;
  type?: string;
  title?: string;
}

const headLinks: HeadLink[] = [
  {
    rel: "code-repository",
    href: "https://github.com/davidwkeith/pulletsforever.com.git",
  },
  {
    rel: "content-repository",
    href: "https://github.com/davidwkeith/pulletsforever.com.git",
  },
  {
    rel: "issues",
    href: "https://github.com/davidwkeith/pulletsforever.com/issues",
    type: "text/html",
  },
  {
    rel: "code-license",
    href: "https://opensource.org/license/isc-license-txt",
    type: "text/html",
  },
  {
    rel: "content-license",
    href: "https://creativecommons.org/licenses/by/4.0/?ref=chooser-v1",
    type: "text/html",
  },
  {
    rel: "donation",
    href: "https://www.buymeacoffee.com/davidwkeith",
    type: "text/html",
  },
  { rel: "root", href: url, type: "text/html" },
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
  { rel: "webmention", href: webmention.endpoint },
  { rel: "pingback", href: webmention.pingback },
  { rel: "authorization_endpoint", href: indieauth.authorization_endpoint },
  { rel: "token_endpoint", href: indieauth.token_endpoint },
  { rel: "hub", href: websub.hub },
];

export const siteConfig = {
  site,
  url,
  title,
  description,
  language,
  email,
  hasRSSFeed: true,
  ogType: "website",
  colorScheme: "dark light",
  favicon: "/img/logo.svg",
  logo,
  author,
  webmention,
  indieauth,
  websub,
  schema,
  headLinks,
  atproto: {
    did: "",
  },
};

export type SiteConfig = typeof siteConfig;
export default siteConfig;
