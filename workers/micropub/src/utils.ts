/**
 * Shared utilities for Micropub endpoint
 */

/**
 * Standard CORS headers for Micropub responses
 */
export function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
  };
}

/**
 * Create a JSON response with CORS headers
 */
export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders(),
      "Content-Type": "application/json",
    },
  });
}

/**
 * Create an error response in Micropub format
 */
export function errorResponse(error: string, description: string, status: number): Response {
  return jsonResponse({ error, error_description: description }, status);
}
