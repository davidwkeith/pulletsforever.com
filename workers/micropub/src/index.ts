/**
 * Micropub endpoint for pulletsforever.com
 * https://www.w3.org/TR/micropub/
 */

import type { Env } from "./env.ts";
import type { MicropubData } from "./post.ts";
import { verifyToken } from "./auth.ts";
import { handleMediaUpload } from "./media.ts";
import { createPost } from "./post.ts";
import { handleQuery } from "./query.ts";
import { updatePost, deletePost } from "./update.ts";
import { corsHeaders, jsonResponse } from "./utils.ts";

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const requestId = crypto.randomUUID().slice(0, 8);

    console.log(`[${requestId}] ${request.method} ${url.pathname}`);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders(),
      });
    }

    if (url.pathname === "/media") {
      return handleMediaRoute(request, env, requestId);
    }

    if (url.pathname !== "/micropub") {
      return new Response("Not Found", { status: 404 });
    }

    try {
      if (request.method === "GET") {
        return handleQuery(url, env);
      }

      if (request.method === "POST") {
        const authResult = await verifyToken(request, env);
        if (!authResult.valid) {
          return jsonResponse({ error: "unauthorized", error_description: authResult.error }, 401);
        }

        const contentType = request.headers.get("content-type") || "";
        let data: MicropubData;

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

        const action = data.action || "create";

        if (action === "create") {
          if (!authResult.scope!.includes("create")) {
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
              Location: result.url!,
            },
          });
        }

        if (action === "update") {
          if (!authResult.scope!.includes("update")) {
            return jsonResponse({ error: "insufficient_scope", error_description: "Token lacks update scope" }, 403);
          }

          const result = await updatePost(data, env);
          if (result.error) {
            console.error(`[${requestId}] Post update failed: ${result.error}`);
            const status = result.error === "Post not found" ? 404 : result.error.includes("Missing") ? 400 : 500;
            return jsonResponse({ error: status === 404 ? "not_found" : "server_error", error_description: result.error }, status);
          }

          console.log(`[${requestId}] Post updated: ${data.url}`);
          return new Response(null, {
            status: 200,
            headers: corsHeaders(),
          });
        }

        if (action === "delete") {
          if (!authResult.scope!.includes("delete")) {
            return jsonResponse({ error: "insufficient_scope", error_description: "Token lacks delete scope" }, 403);
          }

          const result = await deletePost(data, env);
          if (result.error) {
            console.error(`[${requestId}] Post delete failed: ${result.error}`);
            const status = result.error === "Post not found" ? 404 : result.error.includes("Missing") ? 400 : 500;
            return jsonResponse({ error: status === 404 ? "not_found" : "server_error", error_description: result.error }, status);
          }

          console.log(`[${requestId}] Post deleted: ${data.url}`);
          return new Response(null, {
            status: 200,
            headers: corsHeaders(),
          });
        }

        return jsonResponse({ error: "invalid_request", error_description: "Unknown action" }, 400);
      }

      return new Response("Method Not Allowed", { status: 405 });
    } catch (err) {
      console.error(`[${requestId}] Micropub error:`, err);
      return jsonResponse({ error: "server_error", error_description: "Internal server error" }, 500);
    }
  },
};

async function handleMediaRoute(request: Request, env: Env, requestId: string): Promise<Response> {
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
    const authResult = await verifyToken(request, env);
    if (!authResult.valid) {
      console.log(`[${requestId}] Media auth failed: ${authResult.error}`);
      return jsonResponse({ error: "unauthorized", error_description: authResult.error }, 401);
    }

    if (!authResult.scope!.includes("media") && !authResult.scope!.includes("create")) {
      console.log(`[${requestId}] Media insufficient scope`);
      return jsonResponse(
        { error: "insufficient_scope", error_description: "Token lacks media or create scope" },
        403,
      );
    }

    const result = await handleMediaUpload(request, env);
    if (result.status === 201) {
      console.log(`[${requestId}] Media uploaded: ${result.headers.get("Location")}`);
    }
    return result;
  } catch (err) {
    console.error(`[${requestId}] Media upload error:`, err);
    return jsonResponse({ error: "server_error", error_description: "Internal server error" }, 500);
  }
}

function formDataToMicropub(formData: FormData): MicropubData {
  const data: MicropubData = {
    type: ["h-entry"],
    properties: {},
  };

  for (const [key, value] of formData.entries()) {
    if (key === "h") {
      data.type = [`h-${value}`];
      continue;
    }
    if (key === "action") {
      data.action = value as string;
      continue;
    }
    if (key === "url") {
      data.url = value as string;
      continue;
    }

    const arrayKey = key.replace(/\[\]$/, "");

    if (!data.properties![arrayKey]) {
      data.properties![arrayKey] = [];
    }
    (data.properties![arrayKey] as unknown[]).push(value);
  }

  return data;
}
