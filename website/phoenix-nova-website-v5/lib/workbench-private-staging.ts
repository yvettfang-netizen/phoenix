/** Server-owned configuration for a built Worker behind an authenticated SSH tunnel. */
export function privateWorkbenchOrigin(env: Record<string, unknown>): string | null {
  if (env.SERVICE_WORKBENCH_PRIVATE_STAGING !== "1" || env.SERVICE_WORKBENCH_ENABLED !== "true" ||
      env.SERVICE_WORKBENCH_SYNTHETIC_PREVIEW !== "false") return null;
  const configured = env.SERVICE_WORKBENCH_STAGING_ORIGIN;
  if (typeof configured !== "string") return null;
  try {
    const url = new URL(configured);
    return url.protocol === "http:" && url.hostname === "127.0.0.1" && url.port &&
      url.origin === configured ? configured : null;
  } catch {
    return null;
  }
}

export function workbenchRequestAllowed(url: URL, env: Record<string, unknown>): boolean {
  if (env.SERVICE_WORKBENCH_PRIVATE_STAGING !== undefined) return url.origin === privateWorkbenchOrigin(env);
  return ["127.0.0.1", "localhost"].includes(url.hostname);
}

export function privateStagingHeaders(): Headers {
  return new Headers({
    "Cache-Control": "private, no-store",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
    "Referrer-Policy": "no-referrer",
  });
}
