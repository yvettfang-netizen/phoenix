// View models only: never a customer registry, identity resolver or persistence layer.
export type Domain = 'education' | 'identity' | 'health' | 'wealth';
export type ModuleState = 'loading' | 'empty' | 'no-permission' | 'unavailable' | 'stale' | 'error' | 'ready';
export type FamilyView = { id: string; name: string; members: { id: string; name: string; relation: string }[] };
export type ServiceView = { id: string; domain: Domain; title: string; status: string; subject: string; next: string };
export type DateView = { id: string; title: string; domain: Domain; date: string | null; verified: boolean; source: string; service: string };
export type ReportView = { id: string; title: string; subject: string; source: string };
export type DashboardView = { families: FamilyView[]; services: ServiceView[]; dates: DateView[]; reports: ReportView[] };
export const emptyDashboard = (): DashboardView => ({ families: [], services: [], dates: [], reports: [] });
export const domains: Domain[] = ['education', 'identity', 'health', 'wealth'];
export function centerV2Enabled(env: Record<string, unknown>) { return env.FAMILY_CENTER_V2_ENABLED === 'true'; }
export function centerDemoEnabled(env: Record<string, unknown>, mode: string | undefined, authenticated: boolean) {
  return centerV2Enabled(env) && mode === 'development' && !authenticated && env.FAMILY_CENTER_V2_DEMO_ENABLED === 'true';
}
export function preferredServices(services: ServiceView[], pin: Domain | null) {
  return [...services].sort((a, b) => Number(b.domain === pin) - Number(a.domain === pin));
}
export function verifiedDates(dates: DateView[]) {
  return dates.filter(d => d.verified && d.source && /^\d{4}-\d{2}-\d{2}$/.test(d.date ?? '') && Number.isFinite(Date.parse(d.date!)) && new Date(d.date!).toISOString().slice(0,10) === d.date).sort((a,b) => a.date!.localeCompare(b.date!));
}
export function scopedDashboard(data: DashboardView, member: string | null): DashboardView {
  // Selection only narrows an already-authorized projection. It never grants authority.
  const services = data.services.filter(s => !member || s.subject === member);
  return { ...data, services, dates: data.dates.filter(d => services.some(s => s.id === d.service)), reports: data.reports.filter(r => !member || r.subject === member) };
}
export function parseCanonicalSummaries(f: unknown, s: unknown): DashboardView {
  const family = f as {schemaVersion?: string; family?: {familyRef?: string; displayName?: string}};
  const students = s as {schemaVersion?: string; items?: {studentRef: string; displayName: string}[]};
  const name = (n: unknown): n is string => typeof n === 'string' && n.length > 0 && n.length <= 200;
  if (!family || Object.keys(family).sort().join(',') !== 'family,schemaVersion' || family.schemaVersion !== 'family-summary.v2' ||
    !family.family || Object.keys(family.family).sort().join(',') !== 'displayName,familyRef' || !/^fam_[a-f0-9]{32}$/.test(family.family.familyRef ?? '') || !name(family.family.displayName) ||
    !students || Object.keys(students).sort().join(',') !== 'items,schemaVersion' || students.schemaVersion !== 'student-summary.v2' || !Array.isArray(students.items) || students.items.length > 100 ||
    !students.items.every(x => x && Object.keys(x).sort().join(',') === 'displayName,studentRef' && /^stu_[a-f0-9]{32}$/.test(x.studentRef) && name(x.displayName)) || new Set(students.items.map(x => x.studentRef)).size !== students.items.length) throw new Error('PROJECTION_UNAVAILABLE');
  return { ...emptyDashboard(), families: [{ id: family.family.familyRef!, name: family.family.displayName, members: students.items.map(x => ({id:x.studentRef, name:x.displayName, relation:'student'})) }] };
}
