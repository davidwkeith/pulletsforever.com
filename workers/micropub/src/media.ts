/**
 * Micropub Media Endpoint
 * https://www.w3.org/TR/micropub/#media-endpoint
 */

import type { Env } from "./env.ts";
import { corsHeaders, errorResponse } from "./utils.ts";

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
const EXTENSIONS: Record<string, string> = {
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
 */
export async function handleMediaUpload(request: Request, env: Env): Promise<Response> {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return errorResponse("invalid_request", "Content-Type must be multipart/form-data", 400);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (err) {
    return errorResponse("invalid_request", `Failed to parse form data: ${(err as Error).message}`, 400);
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return errorResponse("invalid_request", "Missing 'file' field in form data", 400);
  }

  const maxSize = parseInt(env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return errorResponse(
      "invalid_request",
      `File size ${formatBytes(file.size)} exceeds maximum ${formatBytes(maxSize)}`,
      413,
    );
  }

  const mimeType = file.type || "application/octet-stream";
  if (!ALLOWED_TYPES.has(mimeType)) {
    return errorResponse(
      "invalid_request",
      `File type '${mimeType}' is not allowed. Supported types: images, video, audio`,
      400,
    );
  }

  const extension = EXTENSIONS[mimeType] || getExtensionFromName(file.name) || "bin";
  const timestamp = Date.now();
  const random = crypto.randomUUID().slice(0, 8);
  const filename = `${timestamp}-${random}.${extension}`;

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
    return errorResponse("server_error", "Failed to store file", 500);
  }

  const mediaUrl = `${env.MEDIA_URL}/${filename}`;

  return new Response(null, {
    status: 201,
    headers: {
      ...corsHeaders(),
      Location: mediaUrl,
    },
  });
}

function getExtensionFromName(filename: string): string | null {
  if (!filename) return null;
  const parts = filename.split(".");
  if (parts.length > 1) {
    return parts.pop()!.toLowerCase();
  }
  return null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
