// Microformat links to add to each page
// From http://microformats.org/wiki/existing-rel-values#HTML5_link_type_extensions

interface HeadLink {
  rel: string;
  href: string;
  type?: string;
  title?: string;
}

// TODO: Import from Schema.org data
const headLinks: HeadLink[] = [
  {
    rel: "code-repository",
    href: "https://gitlab.com/dwk-io/pulletsforever.com.git",
  },
  {
    rel: "content-repository",
    href: "https://gitlab.com/dwk-io/pulletsforever.com.git",
  },
  {
    rel: "issues",
    href: "https://gitlab.com/dwk-io/pulletsforever.com/-/issues",
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
  { rel: "root", href: "https://{{site}}", type: "text/html" },
];

export default headLinks;
