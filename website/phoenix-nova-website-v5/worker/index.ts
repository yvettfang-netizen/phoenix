/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { wealthEdgeRequest, wealthEdgeResponse } from "../lib/wealth-edge";
import { privateStagingHeaders, privateWorkbenchOrigin } from "../lib/workbench-private-staging";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const values = env as unknown as Record<string, unknown>;
    if (values.SERVICE_WORKBENCH_PRIVATE_STAGING !== undefined) {
      const url = new URL(request.url);
      const headers = privateStagingHeaders();
      if (url.origin !== privateWorkbenchOrigin(values)) return new Response("Not found", { status: 404, headers });
      if (url.pathname === "/__service-project-staging/health" && request.method === "GET") {
        return Response.json({ status: "ok", runtime: "private-staging" }, { headers });
      }
      const staticAsset = /^(?:\/_next\/static\/|\/brand\/|\/images\/)/.test(url.pathname);
      const response = staticAsset && (request.method === "GET" || request.method === "HEAD")
        ? await env.ASSETS.fetch(request)
        : await routeRequest(request, env, ctx);
      const protectedResponse = new Response(response.body, response);
      headers.forEach((value, name) => protectedResponse.headers.set(name, value));
      return protectedResponse;
    }
    return routeRequest(request, env, ctx);
  },
};

async function routeRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const original=request;
    const routed=wealthEdgeRequest(request);
    if(routed instanceof Response)return wealthEdgeResponse(routed,original);
    request=routed;
    const url = new URL(request.url);

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    // This display hint is derived from the post-routing URL by the Worker,
    // never trusted from a client header. It has no authentication meaning.
    const headers = new Headers(request.headers);
    const healthLocale = /^\/(zh|en)\/(?:health(?:\/|$)|compass\/health(?:\/|$))/.exec(url.pathname)?.[1];
    headers.delete("x-phoenix-health-locale");
    if (healthLocale) headers.set("x-phoenix-health-locale", healthLocale);
    return wealthEdgeResponse(await handler.fetch(new Request(request, { headers }), env, ctx), original);
}

export default worker;
