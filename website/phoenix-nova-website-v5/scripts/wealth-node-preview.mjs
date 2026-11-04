/** Synthetic Host rehearsal on loopback. No DNS, TLS, API, DB or authentication evidence. */
import { register } from "node:module";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, sep, extname } from "node:path";
import { fileURLToPath } from "node:url";
register("./wealth-preview-loader.mjs", import.meta.url);
const { default: worker } = await import("../dist/server/index.js");
const root = fileURLToPath(new URL("../dist/client", import.meta.url)),
  port = Number(process.env.WEALTH_PREVIEW_PORT || 4481),
  host = process.env.WEALTH_PREVIEW_HOST || "wealth.phoenixnova.com.cn";
const mime = {
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};
async function asset(request) {
  let path;
  try {
    path = resolve(
      root,
      "." + decodeURIComponent(new URL(request.url).pathname),
    );
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  if (!path.startsWith(root + sep))
    return new Response("Not found", { status: 404 });
  try {
    if (!(await stat(path)).isFile()) throw Error();
    return new Response(await readFile(path), {
      headers: {
        "content-type": mime[extname(path)] || "application/octet-stream",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
const server = createServer(async (req, res) => {
  try {
    const headers = new Headers(req.headers);
    headers.set("host", host);
    const request = new Request(`https://${host}${req.url}`, {
      method: req.method,
      headers,
    });
    let response = await asset(request);
    if (response.status === 404)
      response = await worker.fetch(
        request,
        { ASSETS: { fetch: asset } },
        { waitUntil() {}, passThroughOnException() {} },
      );
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(
      req.method === "HEAD"
        ? undefined
        : Buffer.from(await response.arrayBuffer()),
    );
  } catch (error) {
    console.error(error.name);
    res.writeHead(500);
    res.end("Preview unavailable");
  }
});
server.listen(port, "127.0.0.1", () =>
  console.log(
    `Wealth Host rehearsal: http://127.0.0.1:${port}/zh and /en (frontend only)`,
  ),
);
process.on("SIGTERM", () => server.close(() => process.exit(0)));
