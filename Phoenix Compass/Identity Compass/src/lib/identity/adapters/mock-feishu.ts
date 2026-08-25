import type {
  FamilyIdentityContextRecord,
  IdentityLeadRecord,
  IdentityProfileRecord,
  IdentityRepositoryBundle,
} from "@/lib/identity/adapters/contracts";
import type {
  AssessmentId,
  FamilyId,
  NormalizedIdentityAssessment,
  UserId,
} from "@/lib/identity/types";

export const MOCK_FEISHU_STORAGE_KEY = "pn:identity:mock-feishu:v1";

type MockFeishuDatabase = {
  leads: Record<string, IdentityLeadRecord>;
  profiles: Record<string, IdentityProfileRecord>;
  families: Record<string, FamilyIdentityContextRecord>;
  assessments: Record<string, NormalizedIdentityAssessment>;
};

function emptyDatabase(): MockFeishuDatabase {
  return { leads: {}, profiles: {}, families: {}, assessments: {} };
}

function readDatabase(storage: Storage): MockFeishuDatabase {
  try {
    const raw = storage.getItem(MOCK_FEISHU_STORAGE_KEY);
    if (!raw) return emptyDatabase();
    const parsed = JSON.parse(raw) as Partial<MockFeishuDatabase>;
    return {
      leads: parsed.leads ?? {},
      profiles: parsed.profiles ?? {},
      families: parsed.families ?? {},
      assessments: parsed.assessments ?? {},
    };
  } catch {
    return emptyDatabase();
  }
}

function writeDatabase(storage: Storage, database: MockFeishuDatabase): void {
  storage.setItem(MOCK_FEISHU_STORAGE_KEY, JSON.stringify(database));
}

export function createMockFeishuRepositories(storage: Storage): IdentityRepositoryBundle {
  return {
    leads: {
      async upsert(record) {
        const database = readDatabase(storage);
        database.leads[record.assessment_id] = record;
        writeDatabase(storage, database);
      },
    },
    profiles: {
      async findByUserId(userId: UserId) {
        return readDatabase(storage).profiles[userId] ?? null;
      },
      async upsert(record) {
        const database = readDatabase(storage);
        database.profiles[record.user_id] = record;
        writeDatabase(storage, database);
      },
    },
    families: {
      async findByFamilyId(familyId: FamilyId) {
        return readDatabase(storage).families[familyId] ?? null;
      },
      async upsert(record) {
        const database = readDatabase(storage);
        database.families[record.family_id] = record;
        writeDatabase(storage, database);
      },
    },
    assessments: {
      async findByAssessmentId(assessmentId: AssessmentId) {
        return readDatabase(storage).assessments[assessmentId] ?? null;
      },
      async saveCompleted(record) {
        const database = readDatabase(storage);
        database.assessments[record.assessment_id] = record;
        writeDatabase(storage, database);
      },
    },
  };
}
