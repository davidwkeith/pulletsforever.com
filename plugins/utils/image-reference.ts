const TRAILING_MARKDOWN_TITLE_RE =
  /^(.+?)\s+(?:"([^"]*)"|'([^']*)'|\(([^)]*)\)|&quot;([^&]*)&quot;)$/;

export function parseMarkdownImageInner(
  inner: string,
): { path: string; title: string } {
  if (!inner) {
    return { path: "", title: "" };
  }

  let raw = inner.trim();
  let title = "";

  const withTitle = raw.match(TRAILING_MARKDOWN_TITLE_RE);
  if (withTitle) {
    raw = withTitle[1].trim();
    title =
      withTitle[2] || withTitle[3] || withTitle[4] || withTitle[5] || "";
  }

  if (raw.startsWith("<") && raw.endsWith(">")) {
    raw = raw.slice(1, -1).trim();
  }

  return { path: raw, title };
}

export function normalizeImageReference(imagePath: string): string {
  return parseMarkdownImageInner(imagePath).path;
}

export function extractFirstImageReference(
  content: string,
): string | null {
  if (!content) return null;

  const markdownImage = content.match(/!\[[^\]]*\]\(([^)]+)\)/);
  if (markdownImage) {
    return normalizeImageReference(markdownImage[1]);
  }

  const htmlImage = content.match(/<img[^>]+src=["']([^"']+)["']/);
  if (htmlImage) {
    return htmlImage[1];
  }

  return null;
}
