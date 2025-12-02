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
};
