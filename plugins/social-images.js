import satori from "satori";
import { html as satoriHtml } from "satori-html";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { createHash } from "crypto";
import { extractFirstImageReference, normalizeImageReference } from "./utils/image-reference.js";

const OUTPUT_DIR = "_site/img/social-cards";
const URL_PATH = "/img/social-cards";
const IMAGE_WIDTH = 470;
const IMAGE_HEIGHT = 470;
const IMAGE_X = 650;
const IMAGE_Y = 80;

// Load fonts at module level (Inter 600 + 700 from src/fonts/)
const FONT_DIR = path.join("src", "fonts");
const fonts = [
  {
    name: "Inter",
    data: fs.readFileSync(path.join(FONT_DIR, "inter-600.ttf")),
    weight: 600,
    style: "normal",
  },
  {
    name: "Inter",
    data: fs.readFileSync(path.join(FONT_DIR, "inter-700.ttf")),
    weight: 700,
    style: "normal",
  },
];

// Pre-render the logo SVG to a base64 PNG data URI
// (Satori doesn't support SVG <mask> elements, so we rasterize once at startup)
let logoDataUri = "";
async function initLogo() {
  const logoPath = path.join("src", "img", "logo.svg");
  if (fs.existsSync(logoPath)) {
    const pngBuffer = await sharp(logoPath)
      .resize(64, 64)
      .png()
      .toBuffer();
    logoDataUri = `data:image/png;base64,${pngBuffer.toString("base64")}`;
  }
}

// Escape HTML special characters for text content
// Only escape characters that affect HTML structure; quotes/apostrophes
// are safe in text nodes and must remain literal for Satori rendering
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
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

function makeCardId(title, pageInputPath) {
  const baseSlug = slugify(title || "post") || "post";
  const hash = createHash("sha1")
    .update(pageInputPath || title || baseSlug)
    .digest("hex")
    .slice(0, 10);
  return `${baseSlug}-${hash}`;
}

// Generate the social card HTML template for Satori
function generateCardHtml(title, siteName, hasImage = false) {
  const titleMaxWidth = hasImage ? "540px" : "1040px";

  const logoImg = logoDataUri
    ? `<img src="${logoDataUri}" width="64" height="64" style="width: 64px; height: 64px; flex-shrink: 0;" />`
    : "";

  return `<div style="display: flex; width: 1200px; height: 630px; background: linear-gradient(135deg, #ABB8C0, #A0ACB3); padding: 40px;">
  <div style="display: flex; flex-direction: column; justify-content: space-between; width: 1120px; height: 550px; background: #404040; border-radius: 16px; padding: 40px;">
    <div style="display: flex; flex-direction: row; align-items: center; flex: 1;">
      <div style="display: flex; max-width: ${titleMaxWidth}; color: #1095C1; font-family: Inter; font-size: 48px; font-weight: 700; line-height: 1.2; overflow: hidden; word-wrap: break-word;">${escapeHtml(title)}</div>
      ${hasImage ? `<div style="display: flex; width: ${IMAGE_WIDTH}px; height: ${IMAGE_HEIGHT}px; border-radius: 12px; background: #404040; margin-left: auto; flex-shrink: 0;"></div>` : ""}
    </div>
    <div style="display: flex; flex-direction: row; align-items: center;">
      ${logoImg}
      <span style="color: #ffffff; font-family: Inter; font-size: 32px; font-weight: 600; margin-left: 16px;">${escapeHtml(siteName)}</span>
    </div>
  </div>
</div>`;
}

// Render HTML to PNG using Satori + resvg-js
async function renderHtmlToPng(htmlString) {
  const vdom = satoriHtml(htmlString);
  const svg = await satori(vdom, {
    width: 1200,
    height: 630,
    fonts,
  });
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: 1200 },
  });
  return resvg.render().asPng();
}

// Track pending social cards to generate (keyed by slug)
// Value: { title, imagePath } - imagePath updated if found later
const pendingCards = new Map();

// Extract first image path from markdown content
function extractFirstImage(content) {
  return extractFirstImageReference(content);
}

// Resolve image path relative to page
function resolveImagePath(imagePath, pageInputPath) {
  const normalizedImagePath = normalizeImageReference(imagePath);
  if (!normalizedImagePath || !pageInputPath) return null;

  // Skip external URLs
  if (normalizedImagePath.startsWith("http://") || normalizedImagePath.startsWith("https://")) {
    return null;
  }

  // Absolute path from src root
  if (normalizedImagePath.startsWith("/")) {
    return path.join("src", normalizedImagePath.replace(/^\/+/, ""));
  }

  // Relative path - resolve from page directory
  const pageDir = path.dirname(pageInputPath);
  return path.normalize(path.join(pageDir, normalizedImagePath));
}

// Generate social card with optional image composite
async function generateSocialCard(title, imagePath, outputPath) {
  const siteName = "Pullets Forever";
  const hasImage = imagePath && fs.existsSync(imagePath);

  // Render the card template to PNG via Satori
  const htmlString = generateCardHtml(title, siteName, hasImage);
  const cardPng = await renderHtmlToPng(htmlString);

  let pipeline = sharp(cardPng);

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
  // Initialize logo and ensure output directory exists at start
  eleventyConfig.on("eleventy.before", async () => {
    await initLogo();
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    pendingCards.clear();
  });

  // Generate all social cards after build completes
  eleventyConfig.on("eleventy.after", async () => {
    const promises = [];
    for (const [cardId, { title, imagePath }] of pendingCards) {
      const outputPath = path.join(OUTPUT_DIR, `${cardId}.png`);
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

    const cardId = makeCardId(title, pageInputPath);
    const resolvedImagePath = resolveImagePath(imagePath, pageInputPath);

    // Queue card for generation, updating imagePath if we find one
    const existing = pendingCards.get(cardId);
    if (!existing || (!existing.imagePath && resolvedImagePath)) {
      pendingCards.set(cardId, { title, imagePath: resolvedImagePath });
    }

    return `${URL_PATH}/${cardId}.png`;
  });
}
