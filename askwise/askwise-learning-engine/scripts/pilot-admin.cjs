// Offline operator tool. No HTTP endpoint, student data or credentials in stdout.
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
require.extensions[".ts"] = (module, file) => {
  const result = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true,
  } });
  module._compile(result.outputText, file);
};

async function main() {
  if (!process.env.ASKWISE_DB_PATH || !process.env.ASKWISE_AUTH_PATH) throw new Error("Set explicit private ASKWISE_DB_PATH and ASKWISE_AUTH_PATH first");
  if (!path.isAbsolute(process.env.ASKWISE_DB_PATH) || !path.isAbsolute(process.env.ASKWISE_AUTH_PATH)) throw new Error("Use absolute private paths");
  const command = process.argv[2];
  if (command === "restore") {
    const { restorePilotBackup } = require("../src/lib/pilot/backup.ts");
    await restorePilotBackup(process.argv[3], process.env.ASKWISE_DB_PATH);
    console.log("Database restored to new destination. Reprovision credentials; never restore old sessions.");
    return;
  }
  const db = require("../src/lib/db.ts");
  if (command === "init") {
    console.log("Pilot schema initialized; no students or history imported.");
  } else if (command === "provision") {
    const account = process.argv[3];
    const password = process.env.ASKWISE_BOOTSTRAP_PASSWORD;
    if (!account || !/^anon_[a-z0-9_]{1,32}$/.test(account) || !password || password.length < 12) throw new Error("Use anonymous account and bootstrap password >=12 characters");
    const { provisionCredential } = require("../src/lib/pilot/auth-core.ts");
    const id = db.provisionPilotStudent("pilot_" + account);
    provisionCredential(process.env.ASKWISE_AUTH_PATH, account, password, id);
    console.log("Anonymous account mapped to existing pilot student ID:", id);
  } else if (command === "backup") {
    await db.backupPilotDatabase(process.argv[3]);
    console.log("SQLite online backup completed. Auth sessions excluded.");
  } else throw new Error("Commands: init | provision anon_account | backup absolute_path | restore absolute_source");
}
main().catch(() => { console.error("Pilot operator command failed; check private paths, input and permissions."); process.exitCode = 1; });
