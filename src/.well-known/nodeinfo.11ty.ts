export const data = {
  eleventyExcludeFromCollections: true,
  eleventyAllowMissingExtension: true,
  permalink: "/.well-known/nodeinfo",
};

export function render(data: EleventyData): string {
  return JSON.stringify(
    {
      links: [
        {
          rel: "http://nodeinfo.diaspora.software/ns/schema/2.1",
          href: `${data.metadata.url}/nodeinfo/2.1`,
        },
      ],
    },
    null,
    2,
  );
}
