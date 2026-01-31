/**
 * Micropub Update and Delete handlers
 * https://www.w3.org/TR/micropub/#update
 * https://www.w3.org/TR/micropub/#delete
 */

import { toYaml } from "./post.js";

/**
 * Extract slug from a post URL
 * @param {string} url - Full post URL (e.g., "https://pulletsforever.com/my-post/")
 * @param {string} siteUrl - Site base URL (e.g., "https://pulletsforever.com")
 * @returns {string|null} The slug or null if URL doesn't match site
 */
export function extractSlugFromUrl(url, siteUrl) {
  try {
    const postUrl = new URL(url);
    const baseUrl = new URL(siteUrl);

    // Verify the URL belongs to this site
    if (postUrl.host !== baseUrl.host) {
      return null;
    }

    // Extract slug from path (e.g., "/my-post/" -> "my-post")
    const path = postUrl.pathname.replace(/^\/|\/$/g, "");
    return path || null;
  } catch {
    return null;
  }
}

/**
 * Find a post file in GitLab by its URL slug
 * @param {string} url - Post URL
 * @param {object} env - Worker environment
 * @returns {Promise<{filePath?: string, sha?: string, error?: string}>}
 */
export async function findPostByUrl(url, env) {
  const slug = extractSlugFromUrl(url, env.SITE_URL);
  if (!slug) {
    return { error: "Invalid post URL" };
  }

  const projectId = encodeURIComponent(env.GITLAB_PROJECT_ID);
  const blogPath = env.BLOG_PATH || "src/posts";

  // Search for files matching the slug in the posts directory
  // Files can be either {slug}.md or {slug}/index.md
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

    const files = await response.json();

    // Look for matching files
    for (const file of files) {
      if (file.type !== "blob") continue;

      // Match {slug}.md
      const directMatch = new RegExp(`^${blogPath}/${slug}\\.md$`);
      // Match {slug}/index.md
      const indexMatch = new RegExp(`^${blogPath}/${slug}/index\\.md$`);

      if (directMatch.test(file.path) || indexMatch.test(file.path)) {
        return { filePath: file.path };
      }
    }

    return { error: "Post not found" };
  } catch (err) {
    return { error: `Failed to search repository: ${err.message}` };
  }
}

/**
 * Fetch file content from GitLab
 * @param {string} filePath - Path to file in repository
 * @param {object} env - Worker environment
 * @returns {Promise<{content?: string, error?: string}>}
 */
export async function fetchFileFromGitLab(filePath, env) {
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

    const data = await response.json();
    // GitLab returns content as base64
    const content = atob(data.content);
    return { content };
  } catch (err) {
    return { error: `Failed to fetch file: ${err.message}` };
  }
}

/**
 * Parse a markdown file with YAML frontmatter
 * @param {string} content - Raw markdown content
 * @returns {{frontmatter: object, body: string}}
 */
export function parseMarkdownPost(content) {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const yamlContent = match[1];
  const body = match[2].trim();

  // Parse YAML manually (simple key-value and arrays)
  const frontmatter = parseSimpleYaml(yamlContent);

  return { frontmatter, body };
}

/**
 * Parse simple YAML (supports strings, arrays, nested isn't needed for frontmatter)
 * @param {string} yaml - YAML content
 * @returns {object}
 */
function parseSimpleYaml(yaml) {
  const result = {};
  const lines = yaml.split("\n");
  let currentKey = null;
  let inArray = false;

  for (const line of lines) {
    // Skip empty lines
    if (!line.trim()) continue;

    // Array item
    if (line.match(/^\s+-\s+/)) {
      if (currentKey && inArray) {
        let value = line.replace(/^\s+-\s+/, "").trim();
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        result[currentKey].push(value);
      }
      continue;
    }

    // Key-value pair
    const kvMatch = line.match(/^([a-zA-Z_-]+):\s*(.*)/);
    if (kvMatch) {
      const key = kvMatch[1];
      let value = kvMatch[2].trim();

      if (value === "" || value === "[]") {
        // Empty value or empty array - start of array
        result[key] = [];
        currentKey = key;
        inArray = true;
      } else if (value.startsWith("[") && value.endsWith("]")) {
        // Inline array: [item1, item2]
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
        // Regular value
        // Remove quotes if present
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
 * @param {object} frontmatter - Frontmatter object
 * @param {string} body - Post body content
 * @returns {string}
 */
export function buildMarkdownPost(frontmatter, body) {
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
 * @param {object} frontmatter - Current frontmatter
 * @param {string} body - Current body content
 * @param {object} operations - Operations to apply { replace, add, delete }
 * @returns {{frontmatter: object, body: string}}
 */
export function applyOperations(frontmatter, body, operations) {
  const newFrontmatter = { ...frontmatter };
  let newBody = body;

  // Property name mapping from Micropub to frontmatter
  const propMap = {
    name: "title",
    category: "tags",
    summary: "description",
    published: "date",
    "in-reply-to": "in-reply-to",
  };

  const mapProp = (prop) => propMap[prop] || prop;

  // Handle replace operations
  if (operations.replace) {
    for (const [prop, values] of Object.entries(operations.replace)) {
      if (prop === "content") {
        // Content is special - it's the body
        const value = Array.isArray(values) ? values[0] : values;
        newBody = typeof value === "object" ? value.html || value.value || "" : value || "";
      } else {
        const key = mapProp(prop);
        const value = Array.isArray(values) ? (values.length === 1 ? values[0] : values) : values;
        newFrontmatter[key] = value;
      }
    }
  }

  // Handle add operations
  if (operations.add) {
    for (const [prop, values] of Object.entries(operations.add)) {
      if (prop === "content") {
        // Append to body
        const value = Array.isArray(values) ? values[0] : values;
        const textToAdd = typeof value === "object" ? value.html || value.value || "" : value || "";
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

  // Handle delete operations
  if (operations.delete) {
    if (Array.isArray(operations.delete)) {
      // Delete entire properties
      for (const prop of operations.delete) {
        if (prop === "content") {
          newBody = "";
        } else {
          const key = mapProp(prop);
          delete newFrontmatter[key];
        }
      }
    } else {
      // Delete specific values from properties
      for (const [prop, values] of Object.entries(operations.delete)) {
        if (prop === "content") {
          newBody = "";
        } else {
          const key = mapProp(prop);
          const existing = newFrontmatter[key];
          const toRemove = Array.isArray(values) ? values : [values];

          if (Array.isArray(existing)) {
            newFrontmatter[key] = existing.filter((v) => !toRemove.includes(v));
            if (newFrontmatter[key].length === 0) {
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
 * @param {object} params - Update parameters
 * @returns {Promise<{success?: boolean, error?: string}>}
 */
async function updateFileInGitLab({ filePath, content, message, env }) {
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
 * @param {object} params - Delete parameters
 * @returns {Promise<{success?: boolean, error?: string}>}
 */
async function deleteFileFromGitLab({ filePath, message, env }) {
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
 * @param {object} data - Micropub update data
 * @param {object} env - Worker environment
 * @returns {Promise<{success?: boolean, error?: string}>}
 */
export async function updatePost(data, env) {
  const url = data.url;
  if (!url) {
    return { error: "Missing url parameter" };
  }

  // Validate at least one operation is provided
  if (!data.replace && !data.add && !data.delete) {
    return { error: "Update requires at least one of: replace, add, delete" };
  }

  // Find the post file
  const findResult = await findPostByUrl(url, env);
  if (findResult.error) {
    return { error: findResult.error };
  }

  // Fetch current content
  const fetchResult = await fetchFileFromGitLab(findResult.filePath, env);
  if (fetchResult.error) {
    return { error: fetchResult.error };
  }

  // Parse the markdown
  const { frontmatter, body } = parseMarkdownPost(fetchResult.content);

  // Apply operations
  const updated = applyOperations(frontmatter, body, {
    replace: data.replace,
    add: data.add,
    delete: data.delete,
  });

  // Build new markdown
  const newContent = buildMarkdownPost(updated.frontmatter, updated.body);

  // Commit to GitLab
  const updateResult = await updateFileInGitLab({
    filePath: findResult.filePath,
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
 * @param {object} data - Micropub delete data
 * @param {object} env - Worker environment
 * @returns {Promise<{success?: boolean, error?: string}>}
 */
export async function deletePost(data, env) {
  const url = data.url;
  if (!url) {
    return { error: "Missing url parameter" };
  }

  // Find the post file
  const findResult = await findPostByUrl(url, env);
  if (findResult.error) {
    return { error: findResult.error };
  }

  // Delete from GitLab
  const deleteResult = await deleteFileFromGitLab({
    filePath: findResult.filePath,
    message: `Delete post: ${url}`,
    env,
  });

  if (deleteResult.error) {
    return { error: deleteResult.error };
  }

  return { success: true };
}
