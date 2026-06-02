import { next } from "@vercel/functions";

const REALM = "Admin Hungarian Helper";

function unauthorized(): Response {
  return new Response("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${REALM}"`,
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

/** Decodes Basic auth and returns the password part (username is ignored). */
function basicAuthPassword(authorization: string | null): string | null {
  if (!authorization) return null;
  const prefix = "basic ";
  if (!authorization.toLowerCase().startsWith(prefix)) return null;
  const b64 = authorization.slice(prefix.length).trim();
  let decoded: string;
  try {
    decoded = atob(b64);
  } catch {
    return null;
  }
  const colon = decoded.indexOf(":");
  if (colon === -1) return null;
  return decoded.slice(colon + 1);
}

/**
 * Site-wide Basic Auth for **staging / closed previews only**.
 *
 * - If `SITE_ACCESS_PASSWORD` is **unset or empty** → middleware passes through (**public site**, normal production).
 * - If set → all matched routes require Basic Auth with this password (username ignored).
 *
 * Do **not** set `SITE_ACCESS_PASSWORD` on the public US/production domain unless you intentionally want the entire site behind a password (SEO and sign-up will break).
 */
export default function middleware(request: Request): Response {
  const expected = process.env.SITE_ACCESS_PASSWORD;
  if (expected == null || expected === "") {
    return next();
  }

  const password = basicAuthPassword(request.headers.get("authorization"));
  if (password !== expected) {
    return unauthorized();
  }

  return next();
}

export const config = {
  matcher: "/:path*",
};
