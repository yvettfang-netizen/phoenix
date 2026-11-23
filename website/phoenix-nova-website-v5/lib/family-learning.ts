import {readCustomerSession, type AuthConfig} from './family-p1-session';

export type PublishedTeacherArrangement = {
  teacherName: string;
  meeting: string | null;
  delivery: 'ONLINE' | 'IN_PERSON' | null;
};
export type PublishedStudyPlan = {period: string; goals: string[]};
export type LearningCourse = {
  title: string;
  teacherArrangement: PublishedTeacherArrangement | null;
  practiceTitle: string | null;
  status: 'ASSIGNED' | 'SUBMITTED' | 'REVIEWED';
};
export type LearningSubject = {ref: string; name: string; plan: PublishedStudyPlan | null; courses: LearningCourse[]};
export type FamilyLearning = {role: 'STUDENT' | 'PARENT'; students: LearningSubject[]};

/** A server-owned adapter must bind the session to an authorized Canonical Principal,
 * intersect live family/student scope with assignments and Consent, and recheck it
 * before delivery. No identity or subject selector is accepted from the browser. */
export interface FamilyLearningProvider {
  resolve(identity: {customerId: string; sessionHash: string}): Promise<{
    readAssignedProgress(): Promise<unknown>;
    assertCurrent(): Promise<void>;
  } | null>;
}

const headers = {'Cache-Control': 'private, no-store', 'Vary': 'Cookie'};
const failure = (status: number) => Response.json({error: 'FAMILY_LEARNING_UNAVAILABLE'}, {status, headers});
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const label = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= 180;

function publishedPlan(raw: unknown): PublishedStudyPlan | null {
  if (!record(raw) || raw.publication !== 'PUBLISHED' || !label(raw.period) ||
      !Array.isArray(raw.goals) || raw.goals.length > 8 || !raw.goals.every(label)) return null;
  return {period: raw.period, goals: raw.goals};
}

function publishedTeacher(raw: unknown): PublishedTeacherArrangement | null {
  if (!record(raw) || raw.publication !== 'PUBLISHED' || !label(raw.teacherName) ||
      !(raw.meeting === null || label(raw.meeting)) ||
      (raw.delivery !== null && raw.delivery !== 'ONLINE' && raw.delivery !== 'IN_PERSON')) return null;
  return {teacherName: raw.teacherName, meeting: raw.meeting, delivery: raw.delivery};
}

export function projectFamilyLearning(raw: unknown): FamilyLearning | null {
  if (!record(raw) || (raw.role !== 'STUDENT' && raw.role !== 'PARENT') || !Array.isArray(raw.students) ||
      raw.students.length > 20 || (raw.role === 'STUDENT' && raw.students.length > 1)) return null;
  const students: LearningSubject[] = [];
  for (const student of raw.students) {
    if (!record(student) || typeof student.ref !== 'string' || !/^stu_[a-f0-9]{32}$/.test(student.ref) ||
        students.some(item => item.ref === student.ref) || !label(student.name) ||
        !Array.isArray(student.courses) || student.courses.length > 20) return null;
    const courses: LearningCourse[] = [];
    for (const course of student.courses) {
      if (!record(course) || !label(course.title) || !(course.practiceTitle === null || label(course.practiceTitle)) ||
          (course.status !== 'ASSIGNED' && course.status !== 'SUBMITTED' && course.status !== 'REVIEWED')) return null;
      courses.push({title: course.title, teacherArrangement: publishedTeacher(course.teacherArrangement),
        practiceTitle: course.practiceTitle, status: course.status});
    }
    students.push({ref: student.ref, name: student.name, plan: publishedPlan(student.plan), courses});
  }
  return {role: raw.role, students};
}

export async function readFamilyLearning(request: Request, auth: AuthConfig | null, provider?: FamilyLearningProvider) {
  const url = new URL(request.url);
  if (request.method !== 'GET') return failure(405);
  if (url.search || request.headers.has('authorization') || request.headers.has('x-project-id') ||
      request.headers.get('sec-fetch-site') === 'cross-site' ||
      (request.headers.has('origin') && request.headers.get('origin') !== url.origin)) return failure(403);
  if (!auth) return failure(503);
  try {
    const session = await readCustomerSession(request, auth, {touch: false});
    if (!session) return failure(401);
    if (!provider) return failure(503);
    const scope = await provider.resolve({customerId: session.id, sessionHash: session.token_hash});
    if (!scope) return failure(403);
    await scope.assertCurrent();
    const result = projectFamilyLearning(await scope.readAssignedProgress());
    if (!result) return failure(503);
    const current = await readCustomerSession(request, auth, {touch: false});
    if (!current || current.id !== session.id || current.token_hash !== session.token_hash) return failure(401);
    await scope.assertCurrent();
    if (current.valid_until <= Date.now()) return failure(401);
    return Response.json(result, {headers});
  } catch {
    return failure(503);
  }
}
