// const { getWebmentions, defaults } = require("@chrisburnell/eleventy-cache-webmentions");

export default {
  tags: [
    "posts"
  ],
  layout: "layouts/post.njk",
  ogType: "article",
  permalink: "{{ page.fileSlug }}/",
  index: "/",
  schema: { 
    "@type": "BlogPosting",
  },
  eleventyComputed: {
    // FIXME: email auth wasn't working at the time.
    // webmentions: (data) => {
    //   return getWebmentions({
    //       ...defaults,
    //       domain: "https://pulletsforever.com",
    //       feed: `https://webmention.io/api/mentions.jf2?domain=pulletsforever.com&token=${process.env.WEBMENTION_IO_TOKEN}&per-page=9001`,
    //       key: "children",
    //     }, "https://pulletsforever.com/" + data.page.url)
    // },
  }
};
