import { randomBytes, randomUUID, createHash, scrypt, timingSafeEqual } from "node:crypto";

type Result = { meta?: { changes?: number } };
export interface Statement {
  bind(...values: (string | number | null)[]): Statement;
  first<T>(): Promise<T | null>;
  run(): Promise<Result>;
}
export interface AuthDatabase {
  prepare(sql: string): Statement;
  batch(statements: Statement[]): Promise<Result[]>;
}
export type AuthConfig = { db: AuthDatabase; origin: string; registration: boolean };
type User = { id: string; username: string; password_hash: string; recovery_hash: string; status: string; created_at: number };
type Session = { id: string; username: string; created_at: number; token_hash: string };
const IDLE_MS = 30 * 60_000;
const ABSOLUTE_MS = 12 * 60 * 60_000;
const MAX_BODY = 4096;
const HASH_PREFIX = "scrypt:32768:8:3";
// Nonexistent users perform the same expensive password check.
const DUMMY_HASH = `${HASH_PREFIX}:${"00".repeat(16)}:${"00".repeat(32)}`;
let hashBusy = false;

class AuthError extends Error {
  constructor(public code: string, public status = 400) { super(code); }
}
function digest(value: string) { return createHash("sha256").update(value).digest("hex"); }
function secret() { return randomBytes(32).toString("base64url"); }
function safeEqual(a: string, b: string) {
  const x = Buffer.from(a, "hex"), y = Buffer.from(b, "hex");
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
}
function username(value: unknown) {
  if (typeof value !== "string" || !/^[a-zA-Z0-9_]{3,32}$/.test(value)) throw new AuthError("INVALID_USERNAME");
  const name = value.toLowerCase();
  if (["admin", "administrator", "founder", "system", "support"].includes(name)) throw new AuthError("INVALID_USERNAME");
  return name;
}
function password(value: unknown, setting = false): string {
  if (typeof value !== "string" || value.length > 128 || Buffer.byteLength(value) > 512 || (setting ? [...value].length < 15 : value.length === 0)) throw new AuthError("INVALID_PASSWORD");
  if (setting && (/^(.)\1+$/u.test(value) || ["password123456789", "123456789012345", "1234567890123456", "qwertyuiopasdfgh"].includes(value.toLowerCase()))) throw new AuthError("WEAK_PASSWORD");
  return value;
}
async function derive(value: string, salt: string): Promise<string> {
  // 32 MiB scrypt alternative recommended by OWASP when Argon2 is unavailable.
  // Bound per-isolate memory; the durable limiter bounds retries across isolates.
  if (hashBusy) throw new AuthError("TRY_LATER", 429);
  hashBusy = true;
  try {
    return await new Promise((resolve, reject) => scrypt(value, Buffer.from(salt, "hex"), 32,
      { N: 32768, r: 8, p: 3, maxmem: 48 * 1024 * 1024 },
      (error, key) => error ? reject(error) : resolve(key.toString("hex"))));
  } finally { hashBusy = false; }
}
async function hashPassword(value: string) {
  const salt = randomBytes(16).toString("hex");
  return `${HASH_PREFIX}:${salt}:${await derive(value, salt)}`;
}
async function checkPassword(value: string, encoded: string) {
  const parts = encoded.split(":");
  if (parts.length !== 6 || parts.slice(0, 4).join(":") !== HASH_PREFIX || !/^[0-9a-f]{32}$/.test(parts[4]) || !/^[0-9a-f]{64}$/.test(parts[5])) return false;
  return safeEqual(await derive(value, parts[4]), parts[5]);
}
export function validAuthOrigin(value: string) {
  try {
    const url = new URL(value);
    return url.origin === value && !url.username && !url.password &&
      (url.protocol === "https:" || (url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)));
  } catch { return false; }
}
function cookieName(config: AuthConfig) { return config.origin.startsWith("https:") ? "__Host-phoenix-session" : "phoenix-local-session"; }
function sessionCookie(config: AuthConfig, token: string, expires = false) {
  return `${cookieName(config)}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${expires ? 0 : ABSOLUTE_MS / 1000}${config.origin.startsWith("https:") ? "; Secure" : ""}`;
}
function tokenFrom(request: Request, config: AuthConfig) {
  const values = (request.headers.get("cookie") ?? "").split(";").map(x => x.trim()).filter(x => x.startsWith(`${cookieName(config)}=`));
  if (values.length !== 1) return null;
  const value = values[0].slice(values[0].indexOf("=") + 1);
  return /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null;
}
function publicUser(user: { id: string; username: string; created_at: number }) {
  return { id: user.id, username: user.username, createdAt: user.created_at };
}
function audit(db: AuthDatabase, action: string, actor: string | null) {
  return db.prepare("INSERT INTO core_auth_audit (id,actor_user_id,action,created_at) VALUES (?,?,?,?)").bind(randomUUID(), actor, action, Date.now());
}
export async function readCustomerSession(request: Request, config: AuthConfig): Promise<Session | null> {
  const token = tokenFrom(request, config);
  if (!token) return null;
  const now = Date.now();
  const user = await config.db.prepare(`SELECT u.id,u.username,u.created_at,s.token_hash
    FROM core_auth_sessions s JOIN core_auth_users u ON u.id=s.user_id
    WHERE s.token_hash=? AND s.expires_at>? AND s.last_seen_at>? AND u.status='active'`)
    .bind(digest(token), now, now - IDLE_MS).first<Session>();
  if (user) await config.db.prepare("UPDATE core_auth_sessions SET last_seen_at=? WHERE token_hash=?").bind(now, digest(token)).run();
  return user;
}
async function limited(db: AuthDatabase, key: string, max: number, now = Date.now()) {
  const start = Math.floor(now / (15 * 60_000)) * 15 * 60_000;
  const count = await db.prepare(`INSERT INTO core_auth_limits (key,count,expires_at) VALUES (?,1,?)
    ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count`).bind(`${key}:${start}`, start + 15 * 60_000).first<{count: number}>();
  if (!count || count.count > max) throw new AuthError("TRY_LATER", 429);
}
function json(data: object, status = 200, cookie?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json", "Cache-Control": "no-store", "Pragma": "no-cache", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" };
  if (cookie) headers["Set-Cookie"] = cookie;
  if (status === 429) headers["Retry-After"] = "900";
  return new Response(JSON.stringify(data), { status, headers });
}
export function authUnavailable() { return json({ error: "AUTH_NOT_CONFIGURED" }, 503); }
async function body(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new AuthError("INVALID_REQUEST", 415);
  if (Number(request.headers.get("content-length")) > MAX_BODY) throw new AuthError("REQUEST_TOO_LARGE", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new AuthError("INVALID_REQUEST");
  const parts: Uint8Array[] = []; let length = 0;
  while (true) {
    const {value,done} = await reader.read(); if (done) break;
    length += value.length; if (length > MAX_BODY) { await reader.cancel(); throw new AuthError("REQUEST_TOO_LARGE", 413); }
    parts.push(value);
  }
  try {
    const raw = Buffer.concat(parts).toString("utf8");
    const value = JSON.parse(raw);
    if (!value || Array.isArray(value) || typeof value !== "object") throw new Error();
    return value;
  } catch { throw new AuthError("INVALID_REQUEST"); }
}

export async function handleCustomerAuth(request: Request, config: AuthConfig): Promise<Response> {
  try {
    if (!validAuthOrigin(config.origin)) return authUnavailable();
    const action = new URL(request.url).pathname.split("/").at(-1);
    if (request.method === "GET" && action === "session") {
      const user = await readCustomerSession(request, config);
      return json({ user: user ? publicUser(user) : null, registration: config.registration });
    }
    if (request.method !== "POST") return json({error: "METHOD_NOT_ALLOWED"}, 405);
    if (request.headers.get("origin") !== config.origin || request.headers.get("sec-fetch-site") === "cross-site") throw new AuthError("FORBIDDEN_ORIGIN", 403);
    if (!["register", "login", "logout", "logout-all", "password", "recover", "recovery-code"].includes(action ?? "")) return json({error:"NOT_FOUND"},404);
    const input = await body(request);
    const db = config.db;
    // Only trust the platform-provided edge address, never arbitrary forwarded headers.
    // Without a trusted address the shared 'unknown' bucket fails conservatively.
    const address = request.headers.get("cf-connecting-ip") ?? "unknown";
    if (action !== "logout" && action !== "logout-all") {
      await db.prepare("DELETE FROM core_auth_limits WHERE expires_at<=?").bind(Date.now()).run();
      await limited(db, `ip:${digest(address)}`, 30);
      await limited(db, "global", 300);
    }
    if (action === "register" || action === "login" || action === "recover") {
      const name = username(input.username);
      await limited(db, `name:${digest(name)}`, 10);
      if (action === "register") {
        if (!config.registration) throw new AuthError("REGISTRATION_CLOSED", 403);
        if (input.testAccount !== true) throw new AuthError("TEST_ACCOUNT_REQUIRED");
        const value = password(input.password, true);
        const passwordHash = await hashPassword(value);
        const recoveryCode = secret();
        const id = randomUUID(), now = Date.now();
        // Unique normalized username is enforced atomically by the database.
        const result = await db.prepare(`INSERT OR IGNORE INTO core_auth_users
          (id,username,password_hash,recovery_hash,status,created_at) VALUES (?,?,?,?,'active',?)`)
          .bind(id, name, passwordHash, digest(recoveryCode), now).run();
        if (result.meta?.changes !== 1) throw new AuthError("ACCOUNT_UNAVAILABLE", 409);
        await audit(db, "account_created", id).run();
        return json({ user: {id, username:name, createdAt:now}, recoveryCode }, 201);
      }
      const user = await db.prepare("SELECT * FROM core_auth_users WHERE username=?").bind(name).first<User>();
      if (action === "login") {
        const ok = await checkPassword(password(input.password), user?.password_hash ?? DUMMY_HASH);
        if (!ok || !user || user.status !== "active") {
          await audit(db, "login_failed", null).run();
          throw new AuthError("INVALID_CREDENTIALS", 401);
        }
        const token = secret(), now = Date.now();
        const old = tokenFrom(request, config);
        await db.batch([
          db.prepare("DELETE FROM core_auth_sessions WHERE token_hash=? OR expires_at<=?").bind(old ? digest(old) : "", now),
          db.prepare("DELETE FROM core_auth_limits WHERE expires_at<=?").bind(now),
          db.prepare(`INSERT INTO core_auth_sessions (token_hash,user_id,created_at,last_seen_at,expires_at)
            SELECT ?,id,?,?,? FROM core_auth_users WHERE id=? AND status='active' AND password_hash=?`)
            .bind(digest(token), now, now, now + ABSOLUTE_MS, user.id, user.password_hash),
          audit(db, "login_succeeded", user.id),
        ]);
        // A concurrent password reset or disable must not create a usable stale login.
        const current = await db.prepare("SELECT token_hash FROM core_auth_sessions WHERE token_hash=?").bind(digest(token)).first();
        if (!current) throw new AuthError("INVALID_CREDENTIALS", 401);
        return json({user:publicUser(user)}, 200, sessionCookie(config, token));
      }
      const code = typeof input.recoveryCode === "string" ? input.recoveryCode : "";
      if (!/^[A-Za-z0-9_-]{43}$/.test(code) || !safeEqual(digest(code), user?.recovery_hash ?? digest("missing")) || !user || user.status !== "active") throw new AuthError("INVALID_RECOVERY", 401);
      const newHash = await hashPassword(password(input.newPassword, true));
      const recoveryCode = secret();
      const result = await db.batch([
        db.prepare("UPDATE core_auth_users SET password_hash=?,recovery_hash=? WHERE id=? AND recovery_hash=? AND status='active'")
          .bind(newHash, digest(recoveryCode), user.id, digest(code)),
        db.prepare("DELETE FROM core_auth_sessions WHERE user_id=?").bind(user.id),
        audit(db, "account_recovered", user.id),
      ]);
      if (result[0].meta?.changes !== 1) throw new AuthError("INVALID_RECOVERY", 401);
      return json({recoveryCode, signInRequired:true}, 200, sessionCookie(config, "", true));
    }
    const user = await readCustomerSession(request, config);
    if (!user) throw new AuthError("SIGN_IN_REQUIRED", 401);
    if (action === "logout" || action === "logout-all") {
      await db.batch([
        action === "logout" ? db.prepare("DELETE FROM core_auth_sessions WHERE token_hash=?").bind(user.token_hash) : db.prepare("DELETE FROM core_auth_sessions WHERE user_id=?").bind(user.id),
        audit(db, action, user.id),
      ]);
      return json({ok:true},200,sessionCookie(config,"",true));
    }
    const row = await db.prepare("SELECT * FROM core_auth_users WHERE id=? AND status='active'").bind(user.id).first<User>();
    await limited(db,`reauth:${user.id}`,10);
    if (!row || !await checkPassword(password(input.currentPassword), row.password_hash)) throw new AuthError("INVALID_CREDENTIALS",401);
    const recoveryCode = secret();
    const newHash = action === "password" ? await hashPassword(password(input.newPassword,true)) : row.password_hash;
    const result = await db.batch([
      db.prepare("UPDATE core_auth_users SET password_hash=?,recovery_hash=? WHERE id=? AND password_hash=? AND status='active'")
        .bind(newHash,digest(recoveryCode),user.id,row.password_hash),
      db.prepare("DELETE FROM core_auth_sessions WHERE user_id=?").bind(user.id),
      audit(db,action === "password" ? "password_changed" : "recovery_rotated",user.id),
    ]);
    if (result[0].meta?.changes !== 1) throw new AuthError("TRY_AGAIN",409);
    return json({recoveryCode,signInRequired:true},200,sessionCookie(config,"",true));
  } catch (error) {
    if (error instanceof AuthError) return json({error:error.code},error.status);
    // Never return database errors, submitted credentials or a stack trace.
    return json({error:"AUTH_UNAVAILABLE"},503);
  }
}
