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

export default function middleware(request: Request): Response {
  const expected = process.env.SITE_ACCESS_PASSWORD;
  if (expected == null || expected === "") {
    return new Response(
      "SITE_ACCESS_PASSWORD is not set. Add it in Vercel → Settings → Environment Variables.",
      {
        status: 503,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
        },
      },
    );
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
