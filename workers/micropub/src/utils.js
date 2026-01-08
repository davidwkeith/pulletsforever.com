/**
 * Shared utilities for Micropub endpoint
 */

/**
 * Standard CORS headers for Micropub responses
 */
export function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
  };
}

/**
 * Create a JSON response with CORS headers
 * @param {object} data - Response data
 * @param {number} status - HTTP status code
 * @returns {Response}
 */
export function jsonResponse(data, status = 200) {
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
 * @param {string} error - Error code (e.g., "invalid_request", "unauthorized")
 * @param {string} description - Human-readable error description
 * @param {number} status - HTTP status code
 * @returns {Response}
 */
export function errorResponse(error, description, status) {
  return jsonResponse({ error, error_description: description }, status);
}
