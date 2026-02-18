import schema from "../_data/schema.ts";

export default {
  tags: ["posts"],
  layout: "layouts/post.webc",
  ogType: "article",
  permalink: "{{ page.fileSlug }}/",
  index: "/",
  eleventyComputed: {
    schema: (data: EleventyData) => {
      const baseUrl = "https://pulletsforever.com";
      const canonicalUrl = `${baseUrl}${data.page.url}`;

      const author = {
        "@type": "Person" as const,
        name: schema.author.name,
        url: schema.author.url,
      };

      return {
        ...schema,
        "@type": "BlogPosting",
        headline: data.title,
        ...(data.description && { description: data.description }),
        url: canonicalUrl,
        datePublished: data.date?.toISOString(),
        dateModified:
          (data.modified as Date | undefined)?.toISOString() ||
          data.date?.toISOString(),
        author,
        publisher: author,
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": canonicalUrl,
        },
      };
    },
  },
};
