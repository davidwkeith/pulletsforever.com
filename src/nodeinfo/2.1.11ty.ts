export const data = {
  eleventyExcludeFromCollections: true,
  eleventyAllowMissingExtension: true,
  permalink: "/nodeinfo/2.1",
};

export function render(data: EleventyData): string {
  const postCount = data.collections?.posts?.length ?? 0;

  return JSON.stringify(
    {
      version: "2.1",
      software: {
        name: "eleventy",
        version: "3.0.0",
        repository: "https://github.com/11ty/eleventy",
        homepage: "https://www.11ty.dev",
      },
      protocols: ["activitypub"],
      services: {
        inbound: [],
        outbound: ["atom1.0"],
      },
      openRegistrations: false,
      usage: {
        users: { total: 1, activeHalfyear: 1, activeMonth: 1 },
        localPosts: postCount,
        localComments: 0,
      },
      metadata: {
        nodeName: data.metadata.title,
        nodeDescription: data.metadata.description,
      },
    },
    null,
    2,
  );
}
