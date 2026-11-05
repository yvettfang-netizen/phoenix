/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { identityResponse, isCbiImportPath, isIdentityPath } from "../lib/cbi-runtime-boundary";
import { wealthEdgeRequest, wealthEdgeResponse } from "../lib/wealth-edge";

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
    const original=request;
    // Deny the original import/publication/rollback path before host routing or
    // body parsing. Neither a Wealth host nor a preview flag can enable it.
    if (isCbiImportPath(new URL(original.url).pathname)) {
      return identityResponse(await wealthEdgeResponse(new Response("Not found", { status: 404 }), original));
    }
    const routed=wealthEdgeRequest(request);
    if(routed instanceof Response)return wealthEdgeResponse(routed,original);
    request=routed;
    const url = new URL(request.url);

    if (isCbiImportPath(url.pathname)) {
      return identityResponse(new Response("Not found", { status: 404 }));
    }

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
    const response = await wealthEdgeResponse(await handler.fetch(new Request(request, { headers }), env, ctx), original);
    return isIdentityPath(url.pathname) ? identityResponse(response) : response;
  },
};

export default worker;
