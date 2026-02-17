export const data = {
  permalink: "/.well-known/sitemap.xml",
  eleventyExcludeFromCollections: true,
};

export function render(data) {
  const { metadata, collections } = data;

  const urls = collections.all
    .filter((page) => !page.data.draft)
    .map(
      (page) => `    <url>
        <loc>${metadata.url}${page.url}</loc>
        <lastmod>${page.date.toISOString()}</lastmod>
        <changefreq>${page.data.changeFreq || "yearly"}</changefreq>
    </url>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="utf-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}
