export const data = {
  eleventyExcludeFromCollections: true,
  eleventyAllowMissingExtension: true,
  permalink: "/.well-known/api-catalog",
};

export function render(data: EleventyData): string {
  const url = data.metadata.url;

  return JSON.stringify(
    {
      linkset: [
        {
          anchor: `${url}/.well-known/api-catalog`,
          item: [
            { href: `${url}/feed.xml`, type: "application/atom+xml" },
            { href: `${url}/feed.json`, type: "application/feed+json" },
            {
              href: data.metadata.micropub.endpoint,
              type: "application/json",
            },
            {
              href: data.metadata.webmention.endpoint,
              type: "application/x-www-form-urlencoded",
            },
            {
              href: data.metadata.websub.hub,
              type: "application/x-www-form-urlencoded",
            },
          ],
        },
        {
          anchor: data.metadata.micropub.endpoint,
          "service-desc": [
            { href: "https://micropub.spec.indieweb.org/", type: "text/html" },
          ],
        },
        {
          anchor: data.metadata.webmention.endpoint,
          "service-desc": [
            { href: "https://www.w3.org/TR/webmention/", type: "text/html" },
          ],
        },
      ],
    },
    null,
    2,
  );
}
