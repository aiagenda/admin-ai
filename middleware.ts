import { next } from "@vercel/functions";

const REALM = "GovLetter";

/** Static/PWA assets must stay public even when SITE_ACCESS_PASSWORD is set (otherwise manifest/sw 401). */
const PUBLIC_PATH_PREFIXES = [
  "/manifest.json",
  "/robots.txt",
  "/sitemap.xml",
  "/sw.js",
  "/favicon.ico",
  "/apple-touch-icon.png",
  "/icon-192.png",
  "/icon-512.png",
  "/coming-soon.html",
];

function isPublicAsset(pathname: string): boolean {
  if (PUBLIC_PATH_PREFIXES.some((p) => pathname === p)) return true;
  if (pathname.startsWith("/downloads/")) return true;
  if (pathname.startsWith("/assets/")) return true;
  if (pathname.startsWith("/.well-known/")) return true;
  if (/^\/google[a-z0-9]+\.html$/.test(pathname)) return true;
  return false;
}

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
 * Basic Auth only when SITE_ACCESS_PASSWORD is set (staging).
 * Public assets (manifest, icons, sw) are always reachable.
 */
export default function middleware(request: Request): Response {
  const url = new URL(request.url);
  if (isPublicAsset(url.pathname)) {
    return next();
  }

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
