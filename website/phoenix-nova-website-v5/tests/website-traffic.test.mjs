import assert from "node:assert/strict";
import { test } from "node:test";
import { recordWebsiteTraffic } from "../lib/website-traffic.ts";

const html = (status = 200) => new Response(null, { status, headers: { "content-type": "text/html; charset=utf-8" } });

test("counts public document responses using only fixed event, page and locale labels", () => {
  const events = [];
  const dataset = { writeDataPoint(point) { events.push(point); } };
  recordWebsiteTraffic(new Request("https://phoenixnova.com.cn/en/education?email=visitor%40example.test", {
    headers: { cookie: "session=synthetic", referer: "https://elsewhere.example/private" },
  }), html(), dataset);
  assert.deepEqual(events, [{ blobs: ["document_response.v1", "education", "en"], doubles: [1] }]);
});

test("excludes preview, private routes, failed responses, API calls and prefetches", () => {
  const events = [];
  const dataset = { writeDataPoint(point) { events.push(point); } };
  const requests = [
    [new Request("https://preview.example/en"), html()],
    [new Request("https://phoenixnova.com.cn/en/account"), html()],
    [new Request("https://phoenixnova.com.cn/zh/consultation"), html()],
    [new Request("https://phoenixnova.com.cn/api/website-consultations", { method: "POST" }), html()],
    [new Request("https://phoenixnova.com.cn/en"), html(503)],
    [new Request("https://phoenixnova.com.cn/en", { headers: { "sec-purpose": "prefetch" } }), html()],
    [new Request("https://phoenixnova.com.cn/en", { headers: { rsc: "1" } }), html()],
    [new Request("https://phoenixnova.com.cn/en"), Response.json({})],
  ];
  for (const [request, response] of requests) recordWebsiteTraffic(request, response, dataset);
  assert.deepEqual(events, []);
});

test("missing stats binding or a stats write failure does not interrupt a page response", () => {
  const req = new Request("https://phoenixnova.com.cn/zh");
  assert.doesNotThrow(() => recordWebsiteTraffic(req, html()));
  assert.doesNotThrow(() => recordWebsiteTraffic(req, html(), { writeDataPoint() { throw new Error("synthetic"); } }));
});
