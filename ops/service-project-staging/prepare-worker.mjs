import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";

const [website, state, action] = process.argv.slice(2);
if (!website || !state || !["start", "worker-smoke"].includes(action)) throw new Error("Invalid staging action");
const secrets = parseEnv(readFileSync(path.join(state, "worker.env"), "utf8"));
if (Object.keys(secrets).join() !== "WORKBENCH_STAGING_IDENTITY_KEY" ||
    !/^[A-Za-z0-9_-]{32,256}$/.test(secrets.WORKBENCH_STAGING_IDENTITY_KEY)) {
  throw new Error("worker.env must contain a valid WORKBENCH_STAGING_IDENTITY_KEY only");
}
const dist = path.join(website, "dist");
const worker = JSON.parse(readFileSync(path.join(dist, "server/wrangler.json"), "utf8"));
const origin = "http://127.0.0.1:4775";
const config = {
  name: "phoenix-service-project-private-staging",
  main: path.join(dist, "server/index.js"),
  compatibility_date: worker.compatibility_date,
  compatibility_flags: worker.compatibility_flags,
  rules: worker.rules,
  no_bundle: true,
  workers_dev: false,
  preview_urls: false,
  observability: { enabled: false },
  dev: { ip: "127.0.0.1", port: 4775, local_protocol: "http", enable_containers: false },
  assets: { binding: "ASSETS", directory: path.join(dist, "client"), run_worker_first: true },
  d1_databases: [{
    binding: "DB",
    database_name: "phoenix-service-project-private-staging-auth",
    database_id: "c33882fb-9dca-43cc-9809-0bf6e3697322",
    migrations_dir: path.join(dist, ".openai/drizzle"),
  }],
  vars: {
    SERVICE_WORKBENCH_PRIVATE_STAGING: "1",
    SERVICE_WORKBENCH_STAGING_ORIGIN: origin,
    SERVICE_WORKBENCH_ENABLED: "true",
    SERVICE_WORKBENCH_SYNTHETIC_PREVIEW: "false",
    CUSTOMER_CANONICAL_BRIDGE_ENABLED: "true",
    SERVICE_WORKBENCH_API_ORIGIN: "http://127.0.0.1:4776",
    WORKBENCH_STAGING_IDENTITY_ORIGIN: "http://127.0.0.1:4777",
    CUSTOMER_AUTH_ENABLED: "1",
    CUSTOMER_AUTH_REGISTRATION_ENABLED: "0",
    CUSTOMER_AUTH_ORIGIN: origin,
    FAMILY_CENTER_V2_ENABLED: "true",
  },
};
writeFileSync(path.join(state, "worker.config.json"), JSON.stringify(config, null, 2) + "\n", { mode: 0o600 });
