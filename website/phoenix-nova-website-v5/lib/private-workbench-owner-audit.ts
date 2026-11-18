import type { AuthDatabase } from "./customer-auth";

const ownerActions = {
  revoke: "REVOKE",
  "expire-idle": "EXPIRE_IDLE",
  "expire-absolute": "EXPIRE_ABSOLUTE",
} as const;
export type PrivateWorkbenchOwnerAction = keyof typeof ownerActions;
type AuditBinding = Pick<AuthDatabase, "prepare">;
type Phase = "requested" | "applied" | "failed";

const userIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export async function runPrivateWorkbenchOwnerAction<T>(
  audit: AuditBinding,
  action: PrivateWorkbenchOwnerAction,
  affectedUserId: string | null,
  apply: () => T | Promise<T>,
): Promise<{ requestId: string; requestedAt: number; appliedAt: number; result: T }> {
  if (!Object.hasOwn(ownerActions, action) || affectedUserId !== null && !userIdPattern.test(affectedUserId)) {
    throw new Error("Invalid private workbench owner action");
  }
  const requestId = crypto.randomUUID();
  const record = async (phase: Phase) => {
    const event = `OWNER_CONTROL_${ownerActions[action]}_${phase.toUpperCase()}`;
    const time = Date.now();
    // For server-owned controls, actor_user_id identifies the affected account.
    const result = await audit.prepare("INSERT INTO core_auth_audit (id,actor_user_id,action,created_at) VALUES (?,?,?,?)")
      .bind(`${requestId}:owner-${phase}`, affectedUserId, event, time).run();
    if (result.meta?.changes !== 1) throw new Error("Private workbench owner audit write failed");
    return time;
  };

  const requestedAt = await record("requested");
  let result: T;
  try {
    result = await apply();
  } catch (error) {
    await record("failed");
    throw error;
  }
  // A terminal write failure does not imply that the state change failed.
  const appliedAt = await record("applied");
  return { requestId, requestedAt, appliedAt, result };
}
