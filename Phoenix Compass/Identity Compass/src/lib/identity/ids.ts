import type { AssessmentId, FamilyId, IdentityIds, UserId } from "@/lib/identity/types";

export const IDENTITY_CONTEXT_KEY = "pn:identity:context:v1";
export const IDENTITY_ASSESSMENT_ID_KEY = "pn:identity:assessment-id:v1";

type PersistentIdentityContext = Readonly<{
  family_id: FamilyId;
  user_id: UserId;
}>;

type IdFactory = () => string;

function defaultIdFactory(): string {
  return globalThis.crypto.randomUUID();
}

function isPrefixedId(value: unknown, prefix: string): value is `${typeof prefix}${string}` {
  return typeof value === "string" && value.startsWith(prefix) && value.length > prefix.length;
}

function readPersistentContext(storage: Storage): PersistentIdentityContext | null {
  try {
    const raw = storage.getItem(IDENTITY_CONTEXT_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (!isPrefixedId(value.family_id, "fam_") || !isPrefixedId(value.user_id, "usr_")) return null;
    return { family_id: value.family_id as FamilyId, user_id: value.user_id as UserId };
  } catch {
    return null;
  }
}

export function getOrCreateIdentityIds(
  persistentStorage: Storage,
  assessmentStorage: Storage,
  idFactory: IdFactory = defaultIdFactory,
): IdentityIds {
  let context = readPersistentContext(persistentStorage);
  if (!context) {
    context = {
      family_id: `fam_${idFactory()}`,
      user_id: `usr_${idFactory()}`,
    };
    persistentStorage.setItem(IDENTITY_CONTEXT_KEY, JSON.stringify(context));
  }

  let assessmentId = assessmentStorage.getItem(IDENTITY_ASSESSMENT_ID_KEY);
  if (!isPrefixedId(assessmentId, "asm_")) {
    assessmentId = `asm_${idFactory()}`;
    assessmentStorage.setItem(IDENTITY_ASSESSMENT_ID_KEY, assessmentId);
  }

  return { ...context, assessment_id: assessmentId as AssessmentId };
}

export function startNewIdentityAssessment(assessmentStorage: Storage): void {
  assessmentStorage.removeItem(IDENTITY_ASSESSMENT_ID_KEY);
}
