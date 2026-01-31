import schema from "../_data/schema.js";

export default {
  tags: [
    "posts"
  ],
  layout: "layouts/post.njk",
  ogType: "article",
  permalink: "{{ page.fileSlug }}/",
  index: "/",
  eleventyComputed: {
    schema: (data) => {
      const baseUrl = "https://pulletsforever.com";
      const canonicalUrl = `${baseUrl}${data.page.url}`;

      return {
        ...schema,
        "@type": "BlogPosting",
        headline: data.title,
        datePublished: data.date?.toISOString(),
        dateModified: data.modified?.toISOString() || data.date?.toISOString(),
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": canonicalUrl,
        },
      };
    },
  },
};
