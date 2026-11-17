/** Import has no approved Canonical adapter or staff authorization contract.
 * Keep denial ahead of routing and body parsing, regardless of environment flags. */
export const CBI_PRODUCTION_IMPORT_ENABLED = false;

// Normalize only boundary recognition, never the request URL or host routing.
const boundaryPath = (path: string) => path.replace(/\/{2,}/g, "/");

function decodedPath(pathname: string) {
  let path = boundaryPath(pathname);
  for (let depth = 0; depth < 4 && path.includes("%"); depth++) {
    try { path = boundaryPath(decodeURIComponent(path)); }
    catch { return { path, invalid: true }; }
  }
  return { path, invalid: path.includes("%") };
}

const identityScope = (path: string) => /^\/(zh|en)\/identity(?:\/|$)/i.test(path)
  || /^\/api\/identity\/cbi(?:\/|$)/i.test(path);

export function isCbiImportPath(pathname: string): boolean {
  const { path, invalid } = decodedPath(pathname);
  return (invalid && identityScope(path))
    || /^\/(zh|en)\/identity\/import-review(?:\/|$)/i.test(path)
    || /^\/api\/identity\/cbi\/(import|publish|rollback)(?:\/|$)/i.test(path);
}

export function isIdentityPath(pathname: string): boolean {
  return identityScope(decodedPath(pathname).path);
}

export function identityResponse(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  headers.set("Cache-Control", "private, no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "no-referrer");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
