/** Local frontend-only fallback for Windows hosts where workerd cannot start.
 * Node >=22.15. Uses the built application, an EMPTY cloudflare env, and no D1.
 * Not evidence of Workers/authentication/database runtime compatibility.
 */
import { registerHooks } from "node:module";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, sep, extname } from "node:path";
import { fileURLToPath } from "node:url";
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "cloudflare:workers") return { url: "data:text/javascript,export const env = Object.freeze({});", shortCircuit: true };
  return nextResolve(specifier, context);
} });
const { default: worker } = await import("../dist/server/index.js");
const root = fileURLToPath(new URL("../dist/client", import.meta.url));
const types = { ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".ico": "image/x-icon" };
const port = Number(process.env.HEALTH_TEST_PORT || "4387");
async function asset(request) {
  let path;
  try { path = resolve(root, "." + decodeURIComponent(new URL(request.url).pathname)); }
  catch { return new Response("Bad request", { status: 400 }); }
  if (!path.startsWith(root + sep)) return new Response("Not found", { status: 404 });
  try {
    if (!(await stat(path)).isFile()) return new Response("Not found", { status: 404 });
    return new Response(await readFile(path), { headers: { "content-type": types[extname(path)] || "application/octet-stream", "cache-control": "no-store" } });
  } catch { return new Response("Not found", { status: 404 }); }
}
const server = createServer(async (req, res) => {
  if (req.method !== "GET" || req.url?.startsWith("/api/")) { res.writeHead(403); res.end("Frontend preview only"); return; }
  try {
    const request = new Request(`http://127.0.0.1:${port}${req.url}`, { headers: req.headers });
    let response = await asset(request);
    if (response.status === 404) response = await worker.fetch(request, { ASSETS: { fetch: asset } }, { waitUntil() {}, passThroughOnException() {} });
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) { console.error(error); res.writeHead(500); res.end("Frontend preview adapter error"); }
});
server.listen(port, "127.0.0.1", () => console.log(`Frontend-only preview: http://127.0.0.1:${port}/zh/health`));
process.on("SIGTERM", () => server.close(() => process.exit(0)));
