/**
 * Micropub Update and Delete handlers
 * https://www.w3.org/TR/micropub/#update
 * https://www.w3.org/TR/micropub/#delete
 */

import type { Env } from "./env.ts";
import type { MicropubData } from "./post.ts";
import { toYaml } from "./post.ts";

interface FindResult {
  filePath?: string;
  error?: string;
}

interface FetchResult {
  content?: string;
  error?: string;
}

interface GitLabResult {
  success?: boolean;
  error?: string;
}

interface Operations {
  replace?: Record<string, unknown>;
  add?: Record<string, unknown>;
  delete?: string[] | Record<string, unknown>;
}

/**
 * Extract slug from a post URL
 */
export function extractSlugFromUrl(url: string, siteUrl: string): string | null {
  try {
    const postUrl = new URL(url);
    const baseUrl = new URL(siteUrl);

    if (postUrl.host !== baseUrl.host) {
      return null;
    }

    const path = postUrl.pathname.replace(/^\/|\/$/g, "");
    return path || null;
  } catch {
    return null;
  }
}

/**
 * Find a post file in GitLab by its URL slug
 */
export async function findPostByUrl(url: string, env: Env): Promise<FindResult> {
  const slug = extractSlugFromUrl(url, env.SITE_URL);
  if (!slug) {
    return { error: "Invalid post URL" };
  }

  const projectId = encodeURIComponent(env.GITLAB_PROJECT_ID);
  const blogPath = env.BLOG_PATH || "src/posts";

  const treeUrl = `https://gitlab.com/api/v4/projects/${projectId}/repository/tree?path=${encodeURIComponent(blogPath)}&recursive=true&per_page=100`;

  try {
    const response = await fetch(treeUrl, {
      headers: {
        "PRIVATE-TOKEN": env.GITLAB_TOKEN,
      },
    });

    if (!response.ok) {
      return { error: `GitLab API error: ${response.status}` };
    }

    const files: { type: string; path: string }[] = await response.json();

    for (const file of files) {
      if (file.type !== "blob") continue;

      const directMatch = new RegExp(`^${blogPath}/${slug}\\.md$`);
      const indexMatch = new RegExp(`^${blogPath}/${slug}/index\\.md$`);

      if (directMatch.test(file.path) || indexMatch.test(file.path)) {
        return { filePath: file.path };
      }
    }

    return { error: "Post not found" };
  } catch (err) {
    return { error: `Failed to search repository: ${(err as Error).message}` };
  }
}

/**
 * Fetch file content from GitLab
 */
export async function fetchFileFromGitLab(filePath: string, env: Env): Promise<FetchResult> {
  const projectId = encodeURIComponent(env.GITLAB_PROJECT_ID);
  const encodedPath = encodeURIComponent(filePath);
  const branch = env.GITLAB_BRANCH || "main";

  const url = `https://gitlab.com/api/v4/projects/${projectId}/repository/files/${encodedPath}?ref=${branch}`;

  try {
    const response = await fetch(url, {
      headers: {
        "PRIVATE-TOKEN": env.GITLAB_TOKEN,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { error: "File not found" };
      }
      return { error: `GitLab API error: ${response.status}` };
    }

    const data: { content: string } = await response.json();
    const content = atob(data.content);
    return { content };
  } catch (err) {
    return { error: `Failed to fetch file: ${(err as Error).message}` };
  }
}

/**
 * Parse a markdown file with YAML frontmatter
 */
export function parseMarkdownPost(content: string): { frontmatter: Record<string, unknown>; body: string } {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const yamlContent = match[1];
  const body = match[2].trim();

  const frontmatter = parseSimpleYaml(yamlContent);

  return { frontmatter, body };
}

/**
 * Parse simple YAML (supports strings, arrays, nested isn't needed for frontmatter)
 */
function parseSimpleYaml(yaml: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = yaml.split("\n");
  let currentKey: string | null = null;
  let inArray = false;

  for (const line of lines) {
    if (!line.trim()) continue;

    if (line.match(/^\s+-\s+/)) {
      if (currentKey && inArray) {
        let value = line.replace(/^\s+-\s+/, "").trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        (result[currentKey] as string[]).push(value);
      }
      continue;
    }

    const kvMatch = line.match(/^([a-zA-Z_-]+):\s*(.*)/);
    if (kvMatch) {
      const key = kvMatch[1];
      let value = kvMatch[2].trim();

      if (value === "" || value === "[]") {
        result[key] = [];
        currentKey = key;
        inArray = true;
      } else if (value.startsWith("[") && value.endsWith("]")) {
        const items = value.slice(1, -1).split(",").map((s) => {
          let item = s.trim();
          if ((item.startsWith('"') && item.endsWith('"')) || (item.startsWith("'") && item.endsWith("'"))) {
            item = item.slice(1, -1);
          }
          return item;
        }).filter((s) => s);
        result[key] = items;
        currentKey = null;
        inArray = false;
      } else {
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        result[key] = value;
        currentKey = null;
        inArray = false;
      }
    }
  }

  return result;
}

/**
 * Build a markdown file from frontmatter and body
 */
export function buildMarkdownPost(frontmatter: Record<string, unknown>, body: string): string {
  let markdown = "---\n";
  markdown += toYaml(frontmatter);
  markdown += "---\n";
  if (body) {
    markdown += "\n" + body + "\n";
  }
  return markdown;
}

/**
 * Apply Micropub operations to frontmatter and body
 */
export function applyOperations(
  frontmatter: Record<string, unknown>,
  body: string,
  operations: Operations,
): { frontmatter: Record<string, unknown>; body: string } {
  const newFrontmatter: Record<string, unknown> = { ...frontmatter };
  let newBody = body;

  const propMap: Record<string, string> = {
    name: "title",
    category: "tags",
    summary: "description",
    published: "date",
    "in-reply-to": "in-reply-to",
  };

  const mapProp = (prop: string): string => propMap[prop] || prop;

  if (operations.replace) {
    for (const [prop, values] of Object.entries(operations.replace)) {
      if (prop === "content") {
        const value = Array.isArray(values) ? values[0] : values;
        newBody = typeof value === "object" ? (value as { html?: string; value?: string }).html || (value as { html?: string; value?: string }).value || "" : (value as string) || "";
      } else {
        const key = mapProp(prop);
        const value = Array.isArray(values) ? (values.length === 1 ? values[0] : values) : values;
        newFrontmatter[key] = value;
      }
    }
  }

  if (operations.add) {
    for (const [prop, values] of Object.entries(operations.add)) {
      if (prop === "content") {
        const value = Array.isArray(values) ? values[0] : values;
        const textToAdd = typeof value === "object" ? (value as { html?: string; value?: string }).html || (value as { html?: string; value?: string }).value || "" : (value as string) || "";
        newBody = newBody ? newBody + "\n\n" + textToAdd : textToAdd;
      } else {
        const key = mapProp(prop);
        const existing = newFrontmatter[key];
        const toAdd = Array.isArray(values) ? values : [values];

        if (Array.isArray(existing)) {
          newFrontmatter[key] = [...existing, ...toAdd];
        } else if (existing) {
          newFrontmatter[key] = [existing, ...toAdd];
        } else {
          newFrontmatter[key] = toAdd.length === 1 ? toAdd[0] : toAdd;
        }
      }
    }
  }

  if (operations.delete) {
    if (Array.isArray(operations.delete)) {
      for (const prop of operations.delete) {
        if (prop === "content") {
          newBody = "";
        } else {
          const key = mapProp(prop);
          delete newFrontmatter[key];
        }
      }
    } else {
      for (const [prop, values] of Object.entries(operations.delete)) {
        if (prop === "content") {
          newBody = "";
        } else {
          const key = mapProp(prop);
          const existing = newFrontmatter[key];
          const toRemove = Array.isArray(values) ? values : [values];

          if (Array.isArray(existing)) {
            newFrontmatter[key] = existing.filter((v) => !toRemove.includes(v));
            if ((newFrontmatter[key] as unknown[]).length === 0) {
              delete newFrontmatter[key];
            }
          } else if (toRemove.includes(existing)) {
            delete newFrontmatter[key];
          }
        }
      }
    }
  }

  return { frontmatter: newFrontmatter, body: newBody };
}

/**
 * Update file in GitLab repository
 */
async function updateFileInGitLab({ filePath, content, message, env }: { filePath: string; content: string; message: string; env: Env }): Promise<GitLabResult> {
  const projectId = encodeURIComponent(env.GITLAB_PROJECT_ID);
  const encodedPath = encodeURIComponent(filePath);
  const branch = env.GITLAB_BRANCH || "main";

  const url = `https://gitlab.com/api/v4/projects/${projectId}/repository/files/${encodedPath}`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "PRIVATE-TOKEN": env.GITLAB_TOKEN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      branch,
      content,
      commit_message: message,
      encoding: "text",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return { error: `GitLab API error: ${response.status} - ${errorText}` };
  }

  return { success: true };
}

/**
 * Delete file from GitLab repository
 */
async function deleteFileFromGitLab({ filePath, message, env }: { filePath: string; message: string; env: Env }): Promise<GitLabResult> {
  const projectId = encodeURIComponent(env.GITLAB_PROJECT_ID);
  const encodedPath = encodeURIComponent(filePath);
  const branch = env.GITLAB_BRANCH || "main";

  const url = `https://gitlab.com/api/v4/projects/${projectId}/repository/files/${encodedPath}`;

  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      "PRIVATE-TOKEN": env.GITLAB_TOKEN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      branch,
      commit_message: message,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return { error: `GitLab API error: ${response.status} - ${errorText}` };
  }

  return { success: true };
}

/**
 * Update a post via Micropub
 */
export async function updatePost(data: MicropubData, env: Env): Promise<GitLabResult> {
  const url = data.url;
  if (!url) {
    return { error: "Missing url parameter" };
  }

  if (!data.replace && !data.add && !data.delete) {
    return { error: "Update requires at least one of: replace, add, delete" };
  }

  const findResult = await findPostByUrl(url, env);
  if (findResult.error) {
    return { error: findResult.error };
  }

  const fetchResult = await fetchFileFromGitLab(findResult.filePath!, env);
  if (fetchResult.error) {
    return { error: fetchResult.error };
  }

  const { frontmatter, body } = parseMarkdownPost(fetchResult.content!);

  const updated = applyOperations(frontmatter, body, {
    replace: data.replace,
    add: data.add,
    delete: data.delete,
  });

  const newContent = buildMarkdownPost(updated.frontmatter, updated.body);

  const updateResult = await updateFileInGitLab({
    filePath: findResult.filePath!,
    content: newContent,
    message: `Update post: ${updated.frontmatter.title || url}`,
    env,
  });

  if (updateResult.error) {
    return { error: updateResult.error };
  }

  return { success: true };
}

/**
 * Delete a post via Micropub
 */
export async function deletePost(data: MicropubData, env: Env): Promise<GitLabResult> {
  const url = data.url;
  if (!url) {
    return { error: "Missing url parameter" };
  }

  const findResult = await findPostByUrl(url, env);
  if (findResult.error) {
    return { error: findResult.error };
  }

  const deleteResult = await deleteFileFromGitLab({
    filePath: findResult.filePath!,
    message: `Delete post: ${url}`,
    env,
  });

  if (deleteResult.error) {
    return { error: deleteResult.error };
  }

  return { success: true };
}
