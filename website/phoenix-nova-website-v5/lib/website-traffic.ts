import { PUBLIC_HOME_ORIGIN } from "./homepage-v6-seo";

type TrafficPoint = { blobs: [string, string, string]; doubles: [number] };
export type WebsiteTrafficDataset = { writeDataPoint(point: TrafficPoint): void };

const publicPages: Readonly<Record<string, string>> = {
  "": "home",
  "/education": "education",
  "/identity": "identity",
  "/wealth": "wealth",
  "/health": "health",
  "/about": "about",
};

/** Counts successful document responses, without visitor identifiers or URL parameters. */
export function recordWebsiteTraffic(request: Request, response: Response, dataset?: WebsiteTrafficDataset) {
  if (!dataset || request.method !== "GET" || response.status !== 200 ||
      !response.headers.get("content-type")?.toLowerCase().startsWith("text/html")) return;
  const url = new URL(request.url);
  if (url.origin !== PUBLIC_HOME_ORIGIN) return;
  if (request.headers.get("rsc") ||
      request.headers.get("next-router-prefetch") ||
      /prefetch|prerender/i.test(request.headers.get("sec-purpose") ?? "") ||
      /prefetch|prerender/i.test(request.headers.get("purpose") ?? "")) return;

  const match = /^\/(zh|en)(\/[^/]+)?\/?$/.exec(url.pathname);
  if (!match) return;
  const path = match[2] ?? "";
  if (!Object.hasOwn(publicPages, path)) return;
  try {
    dataset.writeDataPoint({ blobs: ["document_response.v1", publicPages[path], match[1]], doubles: [1] });
  } catch {
    // Availability of the website is independent of traffic accounting.
  }
}
