import { DateTime } from "luxon";

const htmlDateString = (dateObj) =>
  DateTime.fromJSDate(dateObj, { zone: "utc" }).toFormat("yyyy-LL-dd");

export const data = {
  eleventyExcludeFromCollections: true,
  permalink: "/llms.txt",
};

export function render(data) {
  const { metadata, collections } = data;
  const posts = [...(collections.posts || [])]
    .filter((post) => !post.data.draft)
    .reverse();

  const lines = [];

  // H1: Site name (required)
  lines.push(`# ${metadata.title}`);
  lines.push("");

  // Blockquote: Site summary
  lines.push(`> ${metadata.description}`);
  lines.push("");

  // Body: author and site context
  lines.push(
    `${metadata.title} is a personal blog by ${metadata.author.name}.`,
  );
  lines.push(
    `Content is licensed under CC BY 4.0. Code is licensed under ISC.`,
  );
  lines.push("");

  // H2: Pages
  lines.push("## Pages");
  lines.push("");
  lines.push(`- [Blog](${metadata.url}/blog/): All posts`);
  lines.push(`- [Tags](${metadata.url}/tags/): Browse by topic`);
  lines.push(`- [Feed (Atom)](${metadata.url}/feed.xml): RSS/Atom feed`);
  lines.push(`- [Feed (JSON)](${metadata.url}/feed.json): JSON Feed`);
  lines.push("");

  // H2: Posts
  lines.push("## Posts");
  lines.push("");
  for (const post of posts) {
    const title = post.data.title || "Untitled";
    const date = htmlDateString(post.data.date);
    const url = `${metadata.url}${post.url}`;
    const desc = post.data.description ? `: ${post.data.description}` : "";
    lines.push(`- [${title}](${url}) (${date})${desc}`);
  }

  return lines.join("\n");
}
