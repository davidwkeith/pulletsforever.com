/**
 * Micropub endpoint for pulletsforever.com
 * https://www.w3.org/TR/micropub/
 */

import { verifyToken } from "./auth.js";
import { handleMediaUpload } from "./media.js";
import { createPost } from "./post.js";
import { handleQuery } from "./query.js";
import { corsHeaders, jsonResponse } from "./utils.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const requestId = crypto.randomUUID().slice(0, 8);

    // Log incoming request
    console.log(`[${requestId}] ${request.method} ${url.pathname}`);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders(),
      });
    }

    // Route requests
    if (url.pathname === "/media") {
      return handleMediaRoute(request, env, requestId);
    }

    if (url.pathname !== "/micropub") {
      return new Response("Not Found", { status: 404 });
    }

    try {
      // GET requests are queries (q=config, q=syndicate-to, etc.)
      if (request.method === "GET") {
        return handleQuery(url, env);
      }

      // POST requests require authentication
      if (request.method === "POST") {
        // Verify IndieAuth token
        const authResult = await verifyToken(request, env);
        if (!authResult.valid) {
          return jsonResponse({ error: "unauthorized", error_description: authResult.error }, 401);
        }

        // Parse the request body
        const contentType = request.headers.get("content-type") || "";
        let data;

        if (contentType.includes("application/json")) {
          data = await request.json();
        } else if (contentType.includes("application/x-www-form-urlencoded")) {
          const formData = await request.formData();
          data = formDataToMicropub(formData);
        } else if (contentType.includes("multipart/form-data")) {
          const formData = await request.formData();
          data = formDataToMicropub(formData);
        } else {
          return jsonResponse({ error: "invalid_request", error_description: "Unsupported content type" }, 400);
        }

        // Handle different actions
        const action = data.action || "create";

        if (action === "create") {
          // Check scope
          if (!authResult.scope.includes("create")) {
            return jsonResponse({ error: "insufficient_scope", error_description: "Token lacks create scope" }, 403);
          }

          const result = await createPost(data, env);
          if (result.error) {
            console.error(`[${requestId}] Post creation failed: ${result.error}`);
            return jsonResponse({ error: "server_error", error_description: result.error }, 500);
          }

          console.log(`[${requestId}] Post created: ${result.url}`);
          return new Response(null, {
            status: 201,
            headers: {
              ...corsHeaders(),
              Location: result.url,
            },
          });
        }

        if (action === "update" || action === "delete") {
          console.log(`[${requestId}] Unsupported action: ${action}`);
          return jsonResponse({ error: "not_implemented", error_description: `${action} not yet supported` }, 501);
        }

        return jsonResponse({ error: "invalid_request", error_description: "Unknown action" }, 400);
      }

      return new Response("Method Not Allowed", { status: 405 });
    } catch (err) {
      console.error(`[${requestId}] Micropub error:`, err);
      return jsonResponse({ error: "server_error", error_description: err.message }, 500);
    }
  },
};

/**
 * Handle media endpoint requests
 */
async function handleMediaRoute(request, env, requestId) {
  // Only POST is allowed for media uploads
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: {
        ...corsHeaders(),
        Allow: "POST",
      },
    });
  }

  try {
    // Verify IndieAuth token
    const authResult = await verifyToken(request, env);
    if (!authResult.valid) {
      console.log(`[${requestId}] Media auth failed: ${authResult.error}`);
      return jsonResponse({ error: "unauthorized", error_description: authResult.error }, 401);
    }

    // Check for media or create scope (media scope preferred, create scope also accepted)
    if (!authResult.scope.includes("media") && !authResult.scope.includes("create")) {
      console.log(`[${requestId}] Media insufficient scope`);
      return jsonResponse(
        { error: "insufficient_scope", error_description: "Token lacks media or create scope" },
        403
      );
    }

    const result = await handleMediaUpload(request, env);
    if (result.status === 201) {
      console.log(`[${requestId}] Media uploaded: ${result.headers.get("Location")}`);
    }
    return result;
  } catch (err) {
    console.error(`[${requestId}] Media upload error:`, err);
    return jsonResponse({ error: "server_error", error_description: err.message }, 500);
  }
}

/**
 * Convert FormData to Micropub JSON format
 */
function formDataToMicropub(formData) {
  const data = {
    type: ["h-entry"],
    properties: {},
  };

  for (const [key, value] of formData.entries()) {
    // Handle special keys
    if (key === "h") {
      data.type = [`h-${value}`];
      continue;
    }
    if (key === "action") {
      data.action = value;
      continue;
    }
    if (key === "url") {
      data.url = value;
      continue;
    }

    // Handle array notation (e.g., category[])
    const arrayKey = key.replace(/\[\]$/, "");

    // Add to properties
    if (!data.properties[arrayKey]) {
      data.properties[arrayKey] = [];
    }
    data.properties[arrayKey].push(value);
  }

  return data;
}
