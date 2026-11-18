import assert from "node:assert/strict";
import test from "node:test";
import { confirmPrivateDelivery } from "../lib/confirm-private-delivery.ts";

const response = () => new Response("{}", {
  headers: { "X-Phoenix-Delivery-Receipt": "synthetic-receipt-proof" },
});

test("delivery confirmation sends only the receipt with the current request signal", async t => {
  const signal = new AbortController().signal;
  const fetch = t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "/api/family-services/delivery-receipt");
    assert.equal(options.method, "POST");
    assert.equal(options.credentials, "same-origin");
    assert.equal(options.signal, signal);
    assert.deepEqual(JSON.parse(options.body), { receipt: "synthetic-receipt-proof" });
    return new Response(null, { status: 204 });
  });
  await confirmPrivateDelivery(response(), signal);
  assert.equal(fetch.mock.callCount(), 1);
});

test("private delivery fails closed when a receipt is missing or rejected", async t => {
  const signal = new AbortController().signal;
  const fetch = t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 401 }));
  await assert.rejects(confirmPrivateDelivery(new Response("{}"), signal), /receipt is missing/);
  assert.equal(fetch.mock.callCount(), 0);
  await assert.rejects(confirmPrivateDelivery(response(), signal), { status: 401 });
});
