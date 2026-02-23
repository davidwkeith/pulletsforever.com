/**
 * IndieAuth token verification
 * https://indieauth.spec.indieweb.org/#token-verification
 */

import type { Env } from "./env.ts";

const TOKEN_ENDPOINT = "https://indieauth.com/token";

interface TokenResult {
  valid: boolean;
  scope?: string[];
  me?: string;
  client_id?: string;
  error?: string;
}

/**
 * Verify the IndieAuth bearer token
 */
export async function verifyToken(request: Request, env: Env): Promise<TokenResult> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return { valid: false, error: "Missing Authorization header" };
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return { valid: false, error: "Invalid Authorization header format" };
  }

  const token = match[1];

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

    const data: { me?: string; scope?: string; client_id?: string } = await response.json();

    if (!data.me) {
      return { valid: false, error: "Token response missing 'me' field" };
    }

    const meUrl = normalizeUrl(data.me);
    const siteUrl = normalizeUrl(env.SITE_URL);

    if (meUrl !== siteUrl) {
      return { valid: false, error: `Token 'me' (${data.me}) does not match site URL (${env.SITE_URL})` };
    }

    const scope = data.scope ? data.scope.split(" ") : [];

    return {
      valid: true,
      me: data.me,
      scope,
      client_id: data.client_id,
    };
  } catch (err) {
    return { valid: false, error: `Token verification error: ${(err as Error).message}` };
  }
}

/**
 * Normalize URL for comparison (remove trailing slash, lowercase host)
 */
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host.toLowerCase()}${parsed.pathname.replace(/\/$/, "")}`;
  } catch {
    return url;
  }
}
