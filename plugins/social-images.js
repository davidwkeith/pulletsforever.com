import sharp from "sharp";
import fs from "fs";
import path from "path";

const OUTPUT_DIR = "_build/social-cards";
const URL_PATH = "/social-cards";
const IMAGE_WIDTH = 470;
const IMAGE_HEIGHT = 470;
const IMAGE_X = 650;
const IMAGE_Y = 80;

// Wrap title text to multiple lines
function wrapText(text, maxCharsPerLine = 30) {
  const words = text.split(" ");
  const lines = [];
  let currentLine = "";

  for (const word of words) {
    if ((currentLine + " " + word).trim().length <= maxCharsPerLine) {
      currentLine = (currentLine + " " + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines.slice(0, 4); // Max 4 lines
}

// Escape XML special characters
function escapeXml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Generate slug from title
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

// Generate SVG template (hasImage adjusts layout for image placeholder)
function generateSvg(title, siteName, hasImage = false) {
  // Narrower text area when image is present
  const maxChars = hasImage ? 22 : 32;
  const lines = wrapText(title, maxChars);
  const lineHeight = 58;
  const startY = 200 + ((4 - lines.length) * lineHeight) / 2;

  const titleLines = lines
    .map((line, i) => {
      const y = startY + i * lineHeight;
      return `<text x="80" y="${y}" fill="#1095C1" font-family="system-ui, -apple-system, sans-serif" font-size="48" font-weight="700">${escapeXml(line)}</text>`;
    })
    .join("\n    ");

  // Image placeholder rect (will be composited over by Sharp)
  const imagePlaceholder = hasImage
    ? `<rect x="${IMAGE_X}" y="${IMAGE_Y}" width="${IMAGE_WIDTH}" height="${IMAGE_HEIGHT}" rx="12" fill="#2a2a2a"/>`
    : "";

  return `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ABB8C0"/>
      <stop offset="100%" stop-color="#A0ACB3"/>
    </linearGradient>
    <mask id="logo-eye">
      <rect x="0" y="0" width="100%" height="100%" fill="white" />
      <circle cx="280" cy="230" r="50" fill="black" />
    </mask>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Content card -->
  <rect x="40" y="40" width="1120" height="550" rx="16" fill="#404040"/>

  <!-- Image placeholder -->
  ${imagePlaceholder}

  <!-- Title -->
  <g>
    ${titleLines}
  </g>

  <!-- Logo (64x64, positioned bottom-left of card) -->
  <g transform="translate(80, 476) scale(0.125)">
    <polygon fill="#1095c1" points="45,95 110,95 110,0" />
    <polygon fill="#1095c1" points="120,95 185,95 185,0" />
    <polygon fill="#1095c1" points="195,95 260,95 260,0" />
    <polygon fill="#1095c1" points="375,300 375,400 500,350" />
    <rect y="110" x="10" width="350" height="390" ry="10%" rx="10%" fill="#1095c1" mask="url(#logo-eye)" />
  </g>

  <!-- Site name -->
  <text x="160" y="540" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="32" font-weight="600">${escapeXml(siteName)}</text>
</svg>`;
}

// Track pending social cards to generate (keyed by slug)
// Value: { title, imagePath } - imagePath updated if found later
const pendingCards = new Map();

// Extract first image path from markdown content
function extractFirstImage(content) {
  if (!content) return null;
  // Match markdown image: ![alt](path) or HTML img: <img src="path"
  const mdMatch = content.match(/!\[[^\]]*\]\(([^)]+)\)/);
  if (mdMatch) return mdMatch[1];
  const htmlMatch = content.match(/<img[^>]+src=["']([^"']+)["']/);
  if (htmlMatch) return htmlMatch[1];
  return null;
}

// Resolve image path relative to page
function resolveImagePath(imagePath, pageInputPath) {
  if (!imagePath || !pageInputPath) return null;

  // Skip external URLs
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return null;
  }

  // Absolute path from src root
  if (imagePath.startsWith("/")) {
    return path.join("src", imagePath);
  }

  // Relative path - resolve from page directory
  const pageDir = path.dirname(pageInputPath);
  return path.join(pageDir, imagePath);
}

// Generate social card with optional image composite
async function generateSocialCard(title, imagePath, outputPath) {
  const siteName = "Pullets Forever";
  const hasImage = imagePath && fs.existsSync(imagePath);
  const svg = generateSvg(title, siteName, hasImage);

  let pipeline = sharp(Buffer.from(svg));

  if (hasImage) {
    try {
      // Resize and prepare the post image
      const postImage = await sharp(imagePath)
        .resize(IMAGE_WIDTH, IMAGE_HEIGHT, {
          fit: "cover",
          position: "center",
        })
        .png()
        .toBuffer();

      // Composite the image onto the social card
      pipeline = pipeline.composite([
        {
          input: postImage,
          left: IMAGE_X,
          top: IMAGE_Y,
        },
      ]);
    } catch (err) {
      console.error(`Error processing image "${imagePath}":`, err.message);
      // Continue without the image
    }
  }

  await pipeline.png().toFile(outputPath);
}

export default function (eleventyConfig) {
  // Ensure output directory exists at start
  eleventyConfig.on("eleventy.before", () => {
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    pendingCards.clear();
  });

  // Generate all social cards after build completes
  eleventyConfig.on("eleventy.after", async () => {
    const promises = [];
    for (const [slug, { title, imagePath }] of pendingCards) {
      const hasImage = imagePath && fs.existsSync(imagePath);
      const filename = hasImage ? `${slug}-img.png` : `${slug}.png`;
      const outputPath = path.join(OUTPUT_DIR, filename);

      promises.push(
        generateSocialCard(title, imagePath, outputPath).catch((err) => {
          console.error(`Error generating social image for "${title}":`, err.message);
        })
      );
    }
    await Promise.all(promises);
  });

  // Filter to extract first image from page content
  eleventyConfig.addFilter("firstImage", function (content) {
    return extractFirstImage(content);
  });

  // Generate social card URL (accepts title and optional image info)
  eleventyConfig.addFilter("socialImageUrl", function (title, imagePath, pageInputPath) {
    if (!title) return "";

    const slug = slugify(title);
    const resolvedImagePath = resolveImagePath(imagePath, pageInputPath);

    // Queue card for generation, updating imagePath if we find one
    const existing = pendingCards.get(slug);
    if (!existing || (!existing.imagePath && resolvedImagePath)) {
      pendingCards.set(slug, { title, imagePath: resolvedImagePath });
    }

    // Determine filename based on whether image exists
    // Note: We check file existence here to return correct URL
    const hasImage = resolvedImagePath && fs.existsSync(resolvedImagePath);
    const filename = hasImage ? `${slug}-img.png` : `${slug}.png`;

    return `${URL_PATH}/${filename}`;
  });
}
