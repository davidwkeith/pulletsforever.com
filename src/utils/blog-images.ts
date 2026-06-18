/**
 * Hero image resolution for the single-source `src/assets/blog/` layout.
 *
 * Body posts reference heroes as the virtual key `/images/blog/{file}`.
 * The rendered page resolves this via `MarkdocImage.astro`; the feeds and
 * the `text/markdown` view resolve it here to the same content-hashed
 * `_astro/…webp` asset, so no copy lives in `public/`.
 */
import { getImage } from "astro:assets";

/** Matches a `/images/blog/<file>.<ext>` token anywhere in a string. */
const BLOG_IMG_RE =
  /\/images\/blog\/[A-Za-z0-9._-]+\.(?:png|jpe?g|webp|gif|avif)/g;

/** Lazy glob of the single-source originals; loaders run only on demand. */
const blogImages = import.meta.glob<{ default: ImageMetadata }>(
  "../assets/blog/*.{png,jpg,jpeg,webp,gif,avif}",
);

/**
 * Replace every `/images/blog/<file>` token in `text` using `resolver`.
 * Tokens whose resolver returns `null` are left as-is. Pure: no Astro
 * dependency, so it is unit-testable with a stub resolver.
 */
export async function rewriteBlogImageUrls(
  text: string,
  resolver: (publicPath: string) => Promise<string | null>,
): Promise<string> {
  const tokens = [...new Set(text.match(BLOG_IMG_RE) ?? [])];
  if (tokens.length === 0) return text;

  const resolved = new Map<string, string>();
  await Promise.all(
    tokens.map(async (token) => {
      const url = await resolver(token);
      if (url) resolved.set(token, url);
    }),
  );

  return text.replace(BLOG_IMG_RE, (match) => resolved.get(match) ?? match);
}

/**
 * Resolve a `/images/blog/{file}` key to its hashed `_astro` URL via
 * astro:assets. Uses default `getImage` options to match the variant
 * `MarkdocImage.astro`'s `<Image>` already emits. Returns `null` for
 * non-blog paths or unknown files.
 */
export async function resolveBlogImage(
  publicPath: string,
): Promise<string | null> {
  if (!publicPath.startsWith("/images/blog/")) return null;
  const filename = publicPath.replace("/images/blog/", "");
  const loader = blogImages[`../assets/blog/${filename}`];
  if (!loader) return null;
  const mod = await loader();
  const img = await getImage({ src: mod.default });
  return img.src;
}
