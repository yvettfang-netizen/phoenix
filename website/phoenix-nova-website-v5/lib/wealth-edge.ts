import {
  routeWealthRequest,
  WEALTH_HOST,
  WEALTH_ROBOTS_TXT,
  buildWealthSitemap,
} from "./wealth-routing";
import {
  wealthServices,
  wealthRegions,
  wealthArticles,
} from "./wealth-content";

/** Only the actual request URL chooses the surface. Forwarded headers are untrusted. */
export function wealthEdgeRequest(request: Request): Request | Response {
  const url = new URL(request.url),
    headers = new Headers(request.headers);
  headers.delete("x-phoenix-surface");
  if (url.hostname !== WEALTH_HOST) return new Request(request, { headers });
  if (request.method !== "GET" && request.method !== "HEAD")
    return new Response("Wealth preview does not expose data APIs", {
      status: request.method === "OPTIONS" ? 403 : 405,
      headers: {
        Allow: "GET, HEAD",
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  const result = routeWealthRequest(request.url);
  if (result.kind === "redirect")
    return new Response(null, {
      status: result.status,
      headers: {
        Location: result.location,
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  if (result.kind === "deny")
    return new Response("Not found", {
      status: result.status,
      headers: {
        "X-Robots-Tag": "noindex, nofollow",
        "Cache-Control": "no-store",
      },
    });
  if (result.kind === "robots" || result.kind === "sitemap")
    return new Response(
      request.method === "HEAD"
        ? null
        : result.kind === "robots"
          ? WEALTH_ROBOTS_TXT
          : buildWealthSitemap(
              wealthServices.map((s) => s.slug),
              wealthRegions.map((r) => r.slug),
              wealthArticles.map((a) => a.slug),
            ),
      {
        headers: {
          "Content-Type":
            result.kind === "robots"
              ? "text/plain; charset=utf-8"
              : "application/xml; charset=utf-8",
          "X-Robots-Tag": "noindex, nofollow, noarchive",
          "Cache-Control": "no-store",
        },
      },
    );
  if (result.kind === "rewrite") {
    url.pathname = result.path;
    const rsc = url.searchParams.get("_rsc");
    url.search = "";
    if (rsc && /^[a-z0-9_-]{1,100}$/i.test(rsc))
      url.searchParams.set("_rsc", rsc);
    headers.set("x-phoenix-surface", "wealth");
    return new Request(url, { method: request.method, headers });
  }
  return new Request(request, { headers });
}

/** No permissive CORS and no shared parent-domain cookies on the Wealth surface. */
export async function wealthEdgeResponse(
  response: Response,
  request: Request,
): Promise<Response> {
  if (new URL(request.url).hostname !== WEALTH_HOST) return response;
  const headers = new Headers(response.headers);
  headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );
  headers.set("Strict-Transport-Security", "max-age=31536000");
  headers.delete("Set-Cookie");
  headers.delete("Access-Control-Allow-Origin");
  headers.delete("Access-Control-Allow-Credentials");
  if (!(headers.get("Content-Type") ?? "").includes("text/html"))
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  const language = new URL(request.url).pathname.startsWith("/en")
    ? "en"
    : "zh-CN";
  const html = (await response.text()).replace(
      /<html\b([^>]*?)\blang="[^"]*"/,
      `<html$1lang="${language}"`,
    ),
    hashes = new Set<string>();
  for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
    if (!match[1]) continue;
    const digest = new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(match[1])),
    );
    hashes.add(`'sha256-${btoa(String.fromCharCode(...digest))}'`);
  }
  headers.set(
    "Content-Security-Policy",
    `default-src 'self'; script-src 'self' ${[...hashes].join(" ")}; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'`,
  );
  headers.set("Cache-Control", "no-store");
  headers.delete("Content-Length");
  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
