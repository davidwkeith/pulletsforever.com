/**
 * Micropub Media Endpoint
 * https://www.w3.org/TR/micropub/#media-endpoint
 */

import { errorResponse } from "./utils.js";

// Allowed MIME types for upload
// Note: SVG intentionally excluded due to XSS risk (can contain JavaScript)
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/heif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "audio/mpeg",
  "audio/mp4",
  "audio/ogg",
]);

// File extension mapping for content types
const EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/ogg": "ogg",
};

/**
 * Handle media upload request
 * @param {Request} request
 * @param {object} env - Worker environment with MEDIA_BUCKET binding
 * @returns {Promise<Response>}
 */
export async function handleMediaUpload(request, env) {
  // Verify content type
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return errorResponse("invalid_request", "Content-Type must be multipart/form-data", 400);
  }

  // Parse the multipart form data
  let formData;
  try {
    formData = await request.formData();
  } catch (err) {
    return errorResponse("invalid_request", `Failed to parse form data: ${err.message}`, 400);
  }

  // Get the file from the form data
  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return errorResponse("invalid_request", "Missing 'file' field in form data", 400);
  }

  // Validate file size
  const maxSize = parseInt(env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return errorResponse(
      "invalid_request",
      `File size ${formatBytes(file.size)} exceeds maximum ${formatBytes(maxSize)}`,
      413
    );
  }

  // Validate file type
  const mimeType = file.type || "application/octet-stream";
  if (!ALLOWED_TYPES.has(mimeType)) {
    return errorResponse(
      "invalid_request",
      `File type '${mimeType}' is not allowed. Supported types: images, video, audio`,
      400
    );
  }

  // Generate unique filename
  const extension = EXTENSIONS[mimeType] || getExtensionFromName(file.name) || "bin";
  const timestamp = Date.now();
  const random = crypto.randomUUID().slice(0, 8);
  const filename = `${timestamp}-${random}.${extension}`;

  // Upload to R2
  try {
    await env.MEDIA_BUCKET.put(filename, file.stream(), {
      httpMetadata: {
        contentType: mimeType,
      },
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("R2 upload error:", err);
    return errorResponse("server_error", `Failed to store file: ${err.message}`, 500);
  }

  // Return the URL of the uploaded file
  const mediaUrl = `${env.MEDIA_URL}/${filename}`;

  return new Response(null, {
    status: 201,
    headers: {
      "Access-Control-Allow-Origin": "*",
      Location: mediaUrl,
    },
  });
}

/**
 * Get file extension from filename
 */
function getExtensionFromName(filename) {
  if (!filename) return null;
  const parts = filename.split(".");
  if (parts.length > 1) {
    return parts.pop().toLowerCase();
  }
  return null;
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
