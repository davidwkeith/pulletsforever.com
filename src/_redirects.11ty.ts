export const data = {
  eleventyExcludeFromCollections: true,
  permalink: "/_redirects",
};

export function render(): string {
  return `# Keep robot files together (rfc9309#2.3.1.2)
/robots.txt /.well-known/robots.txt 301
/ads.txt /.well-known/ads.txt 301
/app-ads.txt /.well-known/app-ads.txt 301
/sitemap.xml /.well-known/sitemap.xml 301

# Publish new posts to @pulletsforever.com@pulletsforever.com via Bridgy Fed
# https://fed.brid.gy/web/pulletsforever.com
/.well-known/host-meta* https://fed.brid.gy/.well-known/host-meta:splat 302
/.well-known/webfinger* https://fed.brid.gy/.well-known/webfinger 302

# Canonical avatar (draft spec by Terence Eden)
/.well-known/avatar /img/avatar.png 302`;
}
