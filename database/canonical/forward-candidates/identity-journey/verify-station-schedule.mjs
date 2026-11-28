import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { handleIdentityStationQueue } from "../../../../website/phoenix-nova-website-v5/lib/identity-journey-station-schedule.ts";

const site = new URL("../../../../website/phoenix-nova-website-v5/", import.meta.url);
const require = createRequire(new URL("package.json", site));

export async function verifyStationSchedule({ queue, afterDenied, verifyReceipt }) {
  const { build } = require("esbuild");
  const { Miniflare, convertV4MiniflareOptions, Response: BindingResponse } = require("miniflare");
  const { outputFiles } = await build({
    stdin: {
      resolveDir: fileURLToPath(site),
      contents: `
        import { runIdentityStationSchedule } from "./lib/identity-journey-station-schedule";
        export default {
          async scheduled({ cron }, env) { await runIdentityStationSchedule(cron, env); },
        };
      `,
    },
    bundle: true, write: false, format: "esm", target: "es2022", platform: "browser",
  });
  const cron = "*/5 * * * *";
  const operations = [];
  const worker = new Miniflare(convertV4MiniflareOptions({
    modules: true,
    script: outputFiles[0].text,
    compatibilityDate: "2026-03-17",
    compatibilityFlags: ["service_binding_extra_handlers"],
    bindings: { FAMILY_IDENTITY_STATION_SCHEDULE_ENABLED: "true", FAMILY_IDENTITY_STATION_CRON: cron },
    serviceBindings: {
      async FAMILY_IDENTITY_STATION_QUEUE(request) {
        operations.push(new URL(request.url).pathname);
        const response = await handleIdentityStationQueue(request, queue);
        return new BindingResponse(await response.text(), { status: response.status, headers: response.headers });
      },
    },
  }));
  try {
    const scheduled = await worker.getWorker();
    assert.equal((await scheduled.scheduled({ cron: "0 * * * *" })).outcome, "ok");
    assert.deepEqual(operations, []);
    assert.equal((await scheduled.scheduled({ cron })).outcome, "ok");
    assert.deepEqual(operations.splice(0), ["/claim", "/publish", "/defer"]);
    verifyReceipt(0);
    afterDenied();
    assert.equal((await scheduled.scheduled({ cron })).outcome, "ok");
    assert.deepEqual(operations.splice(0), ["/claim", "/publish"]);
    verifyReceipt(1);
    assert.equal((await scheduled.scheduled({ cron })).outcome, "ok");
    assert.deepEqual(operations, ["/claim"]);
    verifyReceipt(1);
    console.log("PASS workerd scheduled trigger, private queue binding, Canonical withdrawal and backoff, authorized publication and unique receipt");
  } finally {
    await worker.dispose();
  }
}
