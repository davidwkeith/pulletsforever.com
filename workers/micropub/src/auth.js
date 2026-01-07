/**
 * IndieAuth token verification
 * https://indieauth.spec.indieweb.org/#token-verification
 */

const TOKEN_ENDPOINT = "https://indieauth.com/token";

/**
 * Verify the IndieAuth bearer token
 * @param {Request} request
 * @param {object} env
 * @returns {Promise<{valid: boolean, scope?: string, me?: string, error?: string}>}
 */
export async function verifyToken(request, env) {
  // Extract bearer token from Authorization header
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return { valid: false, error: "Missing Authorization header" };
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return { valid: false, error: "Invalid Authorization header format" };
  }

  const token = match[1];

  // Verify token with indieauth.com
  try {
    const response = await fetch(TOKEN_ENDPOINT, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return { valid: false, error: `Token verification failed: ${response.status}` };
    }

    const data = await response.json();

    // Verify the "me" URL matches our site
    if (!data.me) {
      return { valid: false, error: "Token response missing 'me' field" };
    }

    const meUrl = normalizeUrl(data.me);
    const siteUrl = normalizeUrl(env.SITE_URL);

    if (meUrl !== siteUrl) {
      return { valid: false, error: `Token 'me' (${data.me}) does not match site URL (${env.SITE_URL})` };
    }

    // Parse scope
    const scope = data.scope ? data.scope.split(" ") : [];

    return {
      valid: true,
      me: data.me,
      scope,
      client_id: data.client_id,
    };
  } catch (err) {
    return { valid: false, error: `Token verification error: ${err.message}` };
  }
}

/**
 * Normalize URL for comparison (remove trailing slash, lowercase host)
 */
function normalizeUrl(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host.toLowerCase()}${parsed.pathname.replace(/\/$/, "")}`;
  } catch {
    return url;
  }
}
