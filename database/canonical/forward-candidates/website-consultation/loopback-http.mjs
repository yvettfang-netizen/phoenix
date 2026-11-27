import { once } from "node:events";
import { createServer } from "node:http";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

/** The approved TLS reverse proxy connects to this loopback listener. */
export async function listenConsultationLoopback({ publicOrigin, handler, port = 0 }) {
  const origin = new URL(publicOrigin);
  if (origin.protocol !== "https:" || origin.origin !== publicOrigin ||
      typeof handler !== "function" || !Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error("Invalid consultation listener configuration");
  }

  const server = createServer({
    requestTimeout: 10000, headersTimeout: 5000, keepAliveTimeout: 3000, maxHeaderSize: 16384,
  }, async (inbound, outbound) => {
    const deny = status => {
      outbound.writeHead(status, { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8",
        "X-Content-Type-Options": "nosniff", "Connection": "close" });
      outbound.end();
    };
    try {
      if (inbound.headers.host !== origin.host || !/^\/(?!\/)[^\\]*$/.test(inbound.url ?? "")) {
        deny(404);
        return;
      }
      const length = inbound.headers["content-length"];
      if (length !== undefined && (!/^\d+$/.test(length) || Number(length) > 2048)) {
        deny(413);
        return;
      }
      const headers = new Headers();
      const allowed = new Set(["accept", "authorization", "content-type", "cookie",
        "idempotency-key", "origin", "sec-fetch-site"]);
      for (const [name, value] of Object.entries(inbound.headers)) {
        if (typeof value === "string" && allowed.has(name)) headers.set(name, value);
      }
      const method = inbound.method ?? "GET";
      const init = { method, headers };
      if (method === "POST") {
        init.body = Readable.toWeb(inbound);
        init.duplex = "half";
      }
      const response = await handler(new Request(publicOrigin + inbound.url, init));
      outbound.writeHead(response.status, Object.fromEntries(response.headers));
      if (response.body) await pipeline(Readable.fromWeb(response.body), outbound);
      else outbound.end();
    } catch {
      if (outbound.headersSent) outbound.destroy();
      else deny(503);
    } finally {
      inbound.resume();
    }
  });
  const ready = once(server, "listening");
  server.listen(port, "127.0.0.1");
  await ready;
  return {
    port: server.address().port,
    close: () => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())),
  };
}
