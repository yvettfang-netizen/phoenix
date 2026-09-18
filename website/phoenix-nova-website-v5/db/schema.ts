import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";

// Canonical authentication IDs must survive the later Core SQL migration.
// No family, Student, document or assessment data is created by authentication.
export const authUsers = sqliteTable("core_auth_users", {
  id: text("id").primaryKey(),
  username: text("username").notNull(),
  passwordHash: text("password_hash").notNull(),
  recoveryHash: text("recovery_hash").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: integer("created_at").notNull(),
}, table => [uniqueIndex("core_auth_username_unique").on(table.username)]);

export const authSessions = sqliteTable("core_auth_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: text("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
  createdAt: integer("created_at").notNull(),
  lastSeenAt: integer("last_seen_at").notNull(),
  expiresAt: integer("expires_at").notNull(),
}, table => [index("core_auth_session_user_idx").on(table.userId), index("core_auth_session_expiry_idx").on(table.expiresAt)]);

export const authLimits = sqliteTable("core_auth_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  expiresAt: integer("expires_at").notNull(),
}, table => [index("core_auth_limit_expiry_idx").on(table.expiresAt)]);

export const authAudit = sqliteTable("core_auth_audit", {
  id: text("id").primaryKey(),
  actorUserId: text("actor_user_id"),
  action: text("action").notNull(),
  createdAt: integer("created_at").notNull(),
}, table => [index("core_auth_audit_actor_idx").on(table.actorUserId, table.createdAt)]);
