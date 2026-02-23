/**
 * Post creation via GitLab API
 */

import type { Env } from "./env.ts";

interface PhotoValue {
  value?: string;
  url?: string;
  alt?: string;
}

interface ContentValue {
  html?: string;
  value?: string;
}

interface MicropubProperties {
  name?: string[];
  content?: (string | ContentValue)[];
  published?: string[];
  category?: string[];
  summary?: string[];
  "in-reply-to"?: string[];
  photo?: (string | PhotoValue)[];
  "mp-slug"?: string[];
  [key: string]: unknown;
}

export interface MicropubData {
  type?: string[];
  properties?: MicropubProperties;
  action?: string;
  url?: string;
  replace?: Record<string, unknown>;
  add?: Record<string, unknown>;
  delete?: string[] | Record<string, unknown>;
}

interface PostResult {
  url?: string;
  error?: string;
}

interface CommitResult {
  success?: boolean;
  error?: string;
}

/**
 * Create a new post from Micropub data
 */
export async function createPost(data: MicropubData, env: Env): Promise<PostResult> {
  const props = data.properties || {};

  const name = getFirst(props.name);
  const content = getFirst(props.content);
  const published = getFirst(props.published) || new Date().toISOString();
  const categories = props.category || [];
  const summary = getFirst(props.summary);
  const inReplyTo = getFirst(props["in-reply-to"]);
  const photos = props.photo || [];
  const slug = getFirst(props["mp-slug"]) || generateSlug(name as string, published as string);

  if (!name && !content && photos.length === 0) {
    return { error: "Post must have at least a title, content, or photo" };
  }

  const frontmatter: Record<string, unknown> = {
    title: name || `Note: ${formatDate(published as string)}`,
    date: (published as string).split("T")[0],
  };

  if (summary) {
    frontmatter.description = summary;
  }

  if (categories.length > 0) {
    frontmatter.tags = categories;
  }

  if (inReplyTo) {
    frontmatter["in-reply-to"] = inReplyTo;
  }

  let markdown = "---\n";
  markdown += toYaml(frontmatter);
  markdown += "---\n\n";

  for (const photo of photos) {
    const { url, alt } = parsePhotoValue(photo);
    markdown += `![${alt}](${url})\n\n`;
  }

  const bodyContent = typeof content === "object" ? (content as ContentValue).html || (content as ContentValue).value || "" : (content as string) || "";
  markdown += bodyContent;

  const year = new Date(published as string).getFullYear();
  const filePath = `${env.BLOG_PATH}/${year}/${slug}.md`;

  try {
    const commitResult = await commitToGitLab({
      filePath,
      content: markdown,
      message: `Add post: ${frontmatter.title}`,
      env,
    });

    if (commitResult.error) {
      return { error: commitResult.error };
    }

    const postUrl = `${env.SITE_URL}/${slug}/`;
    return { url: postUrl };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

/**
 * Commit a file to GitLab repository
 */
async function commitToGitLab({ filePath, content, message, env }: { filePath: string; content: string; message: string; env: Env }): Promise<CommitResult> {
  const projectId = encodeURIComponent(env.GITLAB_PROJECT_ID);
  const apiUrl = `https://gitlab.com/api/v4/projects/${projectId}/repository/files/${encodeURIComponent(filePath)}`;

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "PRIVATE-TOKEN": env.GITLAB_TOKEN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      branch: env.GITLAB_BRANCH,
      content: content,
      commit_message: message,
      encoding: "text",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`GitLab API error: ${response.status} - ${errorText}`);
    return { error: `GitLab API error: ${response.status}` };
  }

  return { success: true };
}

/**
 * Generate a URL slug from title or timestamp
 */
export function generateSlug(title: string | null | undefined, published: string): string {
  if (title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50);
  }

  const date = new Date(published);
  return `note-${date.getTime()}`;
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getFirst<T>(value: T[] | T | undefined): T | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

/**
 * Parse a photo value which can be a string URL or an object with value/alt
 */
export function parsePhotoValue(photo: string | PhotoValue): { url: string; alt: string } {
  if (typeof photo === "string") {
    return { url: photo, alt: "" };
  }
  return {
    url: photo.value || photo.url || "",
    alt: photo.alt || "",
  };
}

/**
 * Convert object to YAML frontmatter
 */
export function toYaml(obj: Record<string, unknown>, indent = 0): string {
  let yaml = "";
  const prefix = "  ".repeat(indent);

  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      yaml += `${prefix}${key}:\n`;
      for (const item of value) {
        yaml += `${prefix}  - ${JSON.stringify(item)}\n`;
      }
    } else if (typeof value === "object" && value !== null) {
      yaml += `${prefix}${key}:\n`;
      yaml += toYaml(value as Record<string, unknown>, indent + 1);
    } else {
      const needsQuotes = typeof value === "string" && (value.includes(":") || value.includes("#") || value.includes("'") || value.includes('"'));
      yaml += `${prefix}${key}: ${needsQuotes ? JSON.stringify(value) : value}\n`;
    }
  }

  return yaml;
}
