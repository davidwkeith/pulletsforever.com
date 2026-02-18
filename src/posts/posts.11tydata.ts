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

      return {
        ...schema,
        "@type": "BlogPosting",
        headline: data.title,
        datePublished: data.date?.toISOString(),
        dateModified:
          (data.modified as Date | undefined)?.toISOString() ||
          data.date?.toISOString(),
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": canonicalUrl,
        },
      };
    },
  },
};
