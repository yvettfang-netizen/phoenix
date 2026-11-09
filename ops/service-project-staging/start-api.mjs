import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseEnv } from "node:util";

const [server, privateFile] = process.argv.slice(2);
if (!server || !privateFile) throw new Error("Invalid private API invocation");
const env = parseEnv(readFileSync(privateFile, "utf8"));
const keys = ["PHOENIX_STAGING_DB_NAME", "PHOENIX_STAGING_APP_DSN", "PHOENIX_STAGING_BINDER_DSN", "WORKBENCH_STAGING_IDENTITY_KEY"];
if (Object.keys(env).length !== keys.length || keys.some(key => !env[key])) {
  throw new Error("server.env must contain the four required settings");
}
if (env.PHOENIX_STAGING_DB_NAME !== "phoenix_service_project_staging") {
  throw new Error("Package requires the dedicated phoenix_service_project_staging database");
}
const workerSecrets = parseEnv(readFileSync(path.join(path.dirname(privateFile), "worker.env"), "utf8"));
if (env.WORKBENCH_STAGING_IDENTITY_KEY !== workerSecrets.WORKBENCH_STAGING_IDENTITY_KEY) {
  throw new Error("Private identity machine keys do not match");
}
for (const key of Object.keys(process.env)) {
  if (key.startsWith("PHOENIX_STAGING_") || key.startsWith("PHOENIX_SERVICE_WORKBENCH_") ||
      key === "WORKBENCH_STAGING_IDENTITY_KEY") delete process.env[key];
}
Object.assign(process.env, env, {
  PHOENIX_SERVICE_WORKBENCH_MODE: "private-staging",
  PHOENIX_SERVICE_WORKBENCH_HOST: "127.0.0.1",
  PHOENIX_SERVICE_WORKBENCH_PORT: "4776",
  PHOENIX_STAGING_IDENTITY_URL: "http://127.0.0.1:4777",
});
await import(pathToFileURL(path.join(server, "dist/services/service-workbench-staging-main.js")).href);
