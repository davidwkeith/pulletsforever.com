// Microformat links to add to each page
// From http://microformats.org/wiki/existing-rel-values#HTML5_link_type_extensions

// TODO: Import from Shcema.org data
export default [
  {
    rel: "code-repository",
    href: "https://gitlab.com/davidwkeith/static-websites.git",
  },
  {
    rel: "content-repository",
    href: "https://gitlab.com/davidwkeith/static-websites.git",
  },
  {
    rel: "issues",
    href: "https://gitlab.com/davidwkeith/static-websites/-/issues",
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
  { rel: "webmention", href: "https://webmention.io/{{site}}/webmention" },
  // http://www.hixie.ch/specs/pingback/pingback
  { rel: "pingback", href: "https://webmention.io/{{site}}/xmlrpc" },
  {
    rel: "donation",
    href: "https://www.buymeacoffee.com/davidwkeith",
    type: "text/html",
  },
  { rel: "root", href: "https://{{site}}", type: "text/html" },
];