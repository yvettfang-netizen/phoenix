/** Test-only adapter for the built worker. Binds loopback, never deploys. */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, sep, extname } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../dist/client", import.meta.url));
const { default: worker } = await import(new URL("../dist/server/index.js", import.meta.url));
const types = { ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".ico": "image/x-icon" };
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
const port = Number(process.env.HEALTH_TEST_PORT || "4387");
const server = createServer(async (req, res) => {
  try {
    const request = new Request(`http://127.0.0.1:${port}${req.url}`, { headers: req.headers, method: "GET" });
    let response = await asset(request);
    if (response.status === 404) response = await worker.fetch(request, { ASSETS: { fetch: asset } }, { waitUntil() {}, passThroughOnException() {} });
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch { res.writeHead(500); res.end("Preview adapter error"); }
});
server.listen(port, "127.0.0.1");
process.on("SIGTERM", () => server.close(() => process.exit(0)));

