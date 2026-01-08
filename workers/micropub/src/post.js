/**
 * Post creation via GitLab API
 */

/**
 * Create a new post from Micropub data
 * @param {object} data - Micropub data (JSON format)
 * @param {object} env - Worker environment
 * @returns {Promise<{url?: string, error?: string}>}
 */
export async function createPost(data, env) {
  const props = data.properties || {};

  // Extract properties (Micropub values are always arrays)
  const name = getFirst(props.name);
  const content = getFirst(props.content);
  const published = getFirst(props.published) || new Date().toISOString();
  const categories = props.category || [];
  const summary = getFirst(props.summary);
  const inReplyTo = getFirst(props["in-reply-to"]);
  const photos = props.photo || [];
  const slug = getFirst(props["mp-slug"]) || generateSlug(name, published);

  // Determine post type
  const isNote = !name;
  const isReply = !!inReplyTo;

  // Build frontmatter
  const frontmatter = {
    title: name || `Note: ${formatDate(published)}`,
    date: published.split("T")[0], // YYYY-MM-DD
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

  // Build markdown content
  let markdown = "---\n";
  markdown += toYaml(frontmatter);
  markdown += "---\n\n";

  // Add photos at the beginning (before text content)
  for (const photo of photos) {
    const { url, alt } = parsePhotoValue(photo);
    markdown += `![${alt}](${url})\n\n`;
  }

  // Handle content (could be string or object with html/value)
  const bodyContent = typeof content === "object" ? content.html || content.value || "" : content || "";
  markdown += bodyContent;

  // Determine file path
  const year = new Date(published).getFullYear();
  const filePath = `${env.BLOG_PATH}/${year}/${slug}.md`;

  // Commit to GitLab
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

    // Return the URL of the new post
    const postUrl = `${env.SITE_URL}/${slug}/`;
    return { url: postUrl };
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * Commit a file to GitLab repository
 */
async function commitToGitLab({ filePath, content, message, env }) {
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
    return { error: `GitLab API error: ${response.status} - ${errorText}` };
  }

  return { success: true };
}

/**
 * Generate a URL slug from title or timestamp
 */
function generateSlug(title, published) {
  if (title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50);
  }

  // For notes without titles, use timestamp
  const date = new Date(published);
  return `note-${date.getTime()}`;
}

/**
 * Format date for display
 */
function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Get first element of array or return value if not array
 */
function getFirst(value) {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

/**
 * Parse a photo value which can be a string URL or an object with value/alt
 * @param {string|object} photo - Photo URL or object with value and alt
 * @returns {{url: string, alt: string}}
 */
function parsePhotoValue(photo) {
  if (typeof photo === "string") {
    return { url: photo, alt: "" };
  }
  // Object format: { value: "url", alt: "description" }
  return {
    url: photo.value || photo.url || "",
    alt: photo.alt || "",
  };
}

/**
 * Convert object to YAML frontmatter
 */
function toYaml(obj, indent = 0) {
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
      yaml += toYaml(value, indent + 1);
    } else {
      // Quote strings that might need it
      const needsQuotes = typeof value === "string" && (value.includes(":") || value.includes("#") || value.includes("'") || value.includes('"'));
      yaml += `${prefix}${key}: ${needsQuotes ? JSON.stringify(value) : value}\n`;
    }
  }

  return yaml;
}
