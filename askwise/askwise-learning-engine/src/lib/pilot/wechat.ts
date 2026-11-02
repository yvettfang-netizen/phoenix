import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { issueVerifiedSession } from "./auth-core";
import { authStorePath } from "./paths";
import { isProvisionedPilotStudent } from "../db";

export async function wechatLogin(code: unknown) {
  const appid = process.env.ASKWISE_WECHAT_APPID;
  const secret = process.env.ASKWISE_WECHAT_SECRET;
  if (!appid || !secret) throw new Error("WECHAT_NOT_CONFIGURED");
  if (typeof code !== "string" || !code || code.length > 256) throw new Error("INVALID_INPUT");
  const url = new URL("https://api.weixin.qq.com/sns/jscode2session");
  url.search = new URLSearchParams({ appid, secret, js_code: code, grant_type: "authorization_code" }).toString();
  const result = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!result.ok) throw new Error("WECHAT_UNAVAILABLE");
  const payload = await result.json();
  if (payload.errcode || typeof payload.openid !== "string") throw new Error("WECHAT_LOGIN_REJECTED");
  const file = path.join(path.dirname(authStorePath), "wechat-mappings.json");
  if (!fs.existsSync(file)) throw new Error("WECHAT_MAPPING_MISSING");
  const digest = createHash("sha256").update(`${appid}:${payload.openid}`).digest("hex");
  const mapping = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, number>;
  const studentId = mapping[digest];
  if (!isProvisionedPilotStudent(studentId)) throw new Error("WECHAT_MAPPING_MISSING");
  return issueVerifiedSession(authStorePath, studentId);
}
