# Family Growth Core Repository Evidence Audit — 2026-08-17

- Product: Phoenix Nova™ / Phoenix Family OS™ MVP
- Repository: `D:\CODEX\PhoenixNova\Phoenix Family OS\phoenix-family-os-mvp`
- Branch: `codex/phoenix-family-os-v0.1-sprint2`
- Baseline HEAD: `5c039f8205e735ab6bfbf94e7a819f8feeb3c108`
- Audit mode: **INSPECTION ONLY**
- Code/schema/migration/configuration changes: **0**
- Customer or child production data accessed: **0**
- Secrets accessed or displayed: **0**
- Family Growth Agent™ gate: **HOLD / NOT READY FOR DEPLOYMENT**

## 1. Executive Summary

The current repository is a native WeChat Mini Program local Demo. Its verified implementation chain is:

`Family/User local identity → Family record → Student record → Education Compass assessment → deterministic Growth Insight report → local Timeline events → local Advisor request/note`

It is not a production Family Growth Core implementation. There is no trusted database, migration ledger, server API, server-side authentication/RBAC, core consent lifecycle, audit log, Reminder contract, or official Growth Blueprint version model.

### Authoritative-baseline limitation

The task names these files as authoritative:

1. `01_Family_Growth_Core_Freeze_V1.0.md`
2. `02_Family_Growth_Core_Implementation_Gap_Report_V1.0.md`

Neither file was found by exact or bounded filename search inside the repository or its `D:\CODEX\PhoenixNova\Phoenix Family OS` parent directory. Therefore:

- the task text's explicit field/rule lists are used as the minimum auditable contract;
- full semantic equivalence to the unavailable Freeze document is **Unverified**;
- existing repository audit documents are historical/supporting context only and do not elevate an implementation claim;
- unresolved field semantics and permission architecture remain Decision Required.

### Core verdict

| Core contract | Result | Evidence-based conclusion |
| --- | --- | --- |
| Family Profile | **Partial** | Local `families` and `students` records, forms and ownership checks exist; relationships, provenance, consent, update timestamps and trusted persistence do not |
| Growth Blueprint | **Partial** | An adjacent Growth Insight `reports` implementation covers a small semantic subset; the official five-part Blueprint, versions, review and confirmed action sync do not exist |
| Family Timeline | **Partial** | Append-style local event feed exists; required category/date/status/owner/source/reminder/relations/history contract does not |
| Consent | **Missing** for Family Growth Core | A Partner Demo checkbox exists outside the core, without version/time/revoke/enforcement |
| Permission / RBAC | **Partial / Demo only** | Client role guards and some ownership checks exist; no server enforcement, Advisor assignment/authorization or revocation |
| Audit Log | **Missing** | Analytics and Timeline are not security audit logs |
| Reminder | **Missing** | No entity, rule engine, scheduler, route or test |
| Advisor access | **Partial / Demo only** | A shared local `admin` account reads every local family and writes notes; there is no distinct Advisor role or assignment scope |

## 2. Repository / Tech Stack Snapshot

| Area | Actual implementation |
| --- | --- |
| Client | Native WeChat Mini Program: JavaScript, WXML, WXSS, JSON, CommonJS |
| Package | `phoenix-family-os-mini-program-mvp@0.1.0` |
| WeChat configuration | `project.config.json`; base library `3.7.12`; `touristappid` Demo identifier |
| Routes | 15 pages declared by `app.json` |
| State | `Page.data`, `App.globalData.currentUserId`, `PFS_CURRENT_USER_ID` local storage |
| Data persistence | `services/store.js` uses `wx.getStorageSync` / `wx.setStorageSync` under `PFS_DB_V01` |
| Logical schema | `models/schema.js` field-name arrays; no database constraints |
| Repository | `services/repository.js`; generic local `all/getById/where/insert/update` plus domain helpers |
| Authentication | `services/auth.js`; `wx.login` handshake followed by shared local Demo identity |
| Authorization | `services/session.js` client role guard plus page-specific relationship checks |
| AI-adjacent logic | `services/ai-provider.js` delegates to deterministic `services/insight.js` local rules |
| Server/API | None found: no REST/GraphQL/server actions/controllers/cloud functions |
| Database migrations | None found; `store.load()` performs in-place local object normalization only |
| Seed data | `repository.initialize()` inserts one shared local `admin` Demo account |
| Test fixtures | Synthetic in-memory `Map` storage and synthetic family/student records in `tests/*.js` |
| Web Portal | None |

Relevant evidence:

- `models/schema.js`
- `services/store.js::{emptyDatabase,load,save,reset}`
- `services/repository.js::{initialize,insert,update,upsertFamily,upsertStudent,familyOverview}`
- `services/auth.js::{loginFamilyUser,loginAdvisorDemo}`
- `services/session.js::{currentUser,guard}`
- `app.json`, `project.config.json`, `package.json`, `tsconfig.json`

## 3. Existing Implementation Inventory

| Item | Actual module/entity | Route/API pattern | Tests | Classification |
| --- | --- | --- | --- | --- |
| Family Profile | `families`, `students`; `repository.upsertFamily/upsertStudent` | `pages/family-edit/index`, `pages/student-edit/index`; page calls local repository | `run-tests.js`, `user-entry-flow.test.js`, `sprint1-regression.test.js`, `submission-safety.test.js` | **Partial** |
| Growth Blueprint | No Blueprint entity; adjacent `assessments` + `reports` | `pages/compass-questionnaire/index` creates assessment/report; `pages/report/index` reads report | `run-tests.js`, `sprint1-regression.test.js` | **Partial** |
| Family Timeline | `timelineEvents`; `repository.addTimeline/eventsForFamily` | `pages/timeline/index` reads local events; domain writes insert events | `run-tests.js`, `partner-experience.test.js` | **Partial** |
| Consent | No core consent entity; `partnerApplications.privacy_consent` is Partner Demo-only | `pages/partner/apply/index` toggles a boolean | `partner-experience.test.js` checks boolean only | **Missing** for core |
| Permission/RBAC | Empty `permissions` placeholder; roles `family_user/admin/partner_expert` | `session.guard`; page-level ownership checks; no service/server enforcement | One cross-family report case; session-expiry/write checks | **Partial / Demo** |
| Audit Log | No audit entity/service | `analytics.track` records product events, not actor/action/access audit | Basic analytics insertion only | **Missing** |
| Reminder | No entity/service/route/scheduler | None | None | **Missing** |
| Advisor access | `advisorNotes`, `advisorRequests`; shared seeded `admin` account | `pages/admin-families`, `pages/admin-family`, `pages/advisor-request` | Local note/request and storage-failure paths | **Partial / Demo** |

## 4. Family Profile Field-by-Field Mapping

| Contract requirement | Classification | Actual evidence | Gap / qualification |
| --- | --- | --- | --- |
| Family ID | **Partial** | `families.id`; `utils/id.js::createId`; repository insert | Local timestamp/random ID only; no global unique constraint, server ownership or collision test |
| Family display name | **Implemented** in local Demo | `families.family_name`; `pages/family-edit/index.js/.wxml` | Saved/read locally; production persistence and validation absent |
| City / region | **Partial** | `families.location`; Family form free-text input | No structured city/region, normalization or provenance |
| Primary language | **Missing** | No schema/form match | Freeze semantics unavailable; no equivalent field found |
| Timezone | **Missing** | No schema/form match | Runtime timezone is not recorded as family data |
| Family focus areas | **Partial** | `families.goal`; student `interest/goal`; assessment answers | Single free-text goal is not structured focus areas |
| Current goals | **Partial** | `families.goal`; `students.goal`; `answers.future_goal` | No status, owner, source, version or history |
| Consent status | **Missing** | No field on `families/users/students` | Partner Demo `privacy_consent` is not Family Growth consent |
| Consent updated time | **Missing** | No consent time/version fields | `created_at` on Partner application is not consent lifecycle evidence |
| Parent / guardian relationship | **Partial** | `families.user_id`, `parent_name`; Family form | One owner/name only; no guardian type, multiple guardians or relationship validity |
| Adult family relationships | **Missing** | No member/adult relationship entity | `users` is an account record, not a family relationship graph |
| Child / dependent relationship | **Partial** | `students.family_id`; `repository.studentsForFamily` | Supports child-like records only; no relationship type, dependent status or history |
| Age or birth month/year | **Partial** | `students.age`; Child form | Free-text/current age; no birth month/year, calculation date, source or history |
| Grade / education stage | **Partial** | `students.grade`; assessment `school_stage` answer | Grade is persisted; stage is embedded in assessment answers rather than canonical profile |
| School | **Implemented** in local Demo | `students.school`; required Child form field | No source/update timestamp/history; collection minimization not justified |
| Curriculum | **Implemented** in local Demo | `students.education_system`; Child form selector | Optional local field; no controlled version/source |
| Education context | **Partial** | student `interest/goal`; Education Compass answers | No canonical, versioned education-context object; full Freeze meaning is Unverified |
| Source | **Missing** | No source field on family/student | User input and rule output are not tagged with provenance |
| Updated At | **Missing** | Family has `created_at`; Student has no timestamps | `repository.update` overwrites without `updated_at` |
| Relationship history | **Partial** | Creation events may enter `timelineEvents`; reports remain listed | Profile/member updates overwrite; no field-level or relationship change history |
| Protection of confirmed facts from AI overwrite | **Partial** | Current rule engine only creates reports and does not call `repository.update` on family/student | No `confirmed` state, provenance policy, server constraint or negative test; safety is incidental to current separation |

Family Profile conclusion: **Partial**. It supports a local Demo form and family-to-student relation, not the frozen production data contract.

## 5. Growth Blueprint Contract Mapping

No `Blueprint`, Blueprint version, Blueprint action-item or Blueprint review entity exists. The closest implementation is the Education Compass assessment plus deterministic Growth Insight report.

| Contract area | Classification | Actual evidence | Gap |
| --- | --- | --- | --- |
| 1. Family Snapshot | **Partial** | `assessments.answers`; `reports.summary`; report links to assessment | Student data used by rules is not frozen into an input snapshot; family context is largely absent |
| 2. Growth Map | **Partial** | `currentStage`, `strength`, `potentialChallenge`, `suggestedDirection` | Flat generated strings, not a structured map with evidence/provenance |
| 3. Path & Priority | **Partial** | `suggestedDirection`, `nextAction` | No priority ranking, dependencies, alternatives, status or owner |
| 4. Action Plan | **Partial** | One free-text `nextAction` | No action-item entity, due date, owner, confirmation, completion or change history |
| 5. Timeline Sync | **Missing** | Questionnaire adds `compass_completed` and `report_generated` events | No confirmed Blueprint action → Timeline item flow or linkage |
| Input snapshot/version traceability | **Partial** | Report references an assessment; assessment stores answers | No full input snapshot, input hash/version, family/student snapshot or reproducibility guarantee |
| Historical Blueprint versions | **Missing** | Multiple reports may exist | No version chain, supersedes link, refresh reason or current-version selector |
| Refresh behavior | **Missing** | Retaking Compass creates another assessment/report | Not modeled as Blueprint refresh; no diff, merge or retention rule |
| Input Version | **Missing** | None | Schema version is storage schema, not Blueprint input version |
| Prompt Version | **Missing** | No prompt/model call | Current deterministic rules do not log a prompt version |
| Knowledge Version | **Missing** | None | No knowledge base/version evidence |
| Equivalent model/version logging | **Partial** | `recommendation.engine = phoenix_rule_engine_v0.1`; `PROVIDER_MODE=local_rules` | Engine string is stored, but not full code/config/input provenance |
| Missing-information handling | **Partial / Risk** | `insight.js::firstAnswer` and fallbacks | Missing values silently receive generic defaults; no explicit unknown/missing state |
| Advisor Review | **Partial / Demo** | Admin can read report and add a general family note | No Blueprint review assignment, review status, approval, edits or review audit |
| Confirmed Action Item → Timeline | **Missing** | No action-item or confirmation entity | Automatic report events are not confirmed action sync |

Growth Blueprint conclusion: **Partial**, based only on semantic overlap with the existing Growth Insight report. The official Growth Blueprint contract is not implemented end to end.

## 6. Family Timeline Contract Mapping

| Contract requirement | Classification | Actual evidence | Gap |
| --- | --- | --- | --- |
| Item name | **Partial** | `timelineEvents.description` | Description is not a stable item name/title field |
| Category: Education / Identity / Family | **Partial** | `event_type` values and UI `EVENT_META` labels | No required category enum; Identity category has no implementation |
| Date Type | **Missing** | None | No event/due/start/inferred date semantics |
| Start Date | **Missing** | None | Single event timestamp is not a start date |
| Due Date | **Missing** | None | No due-date field |
| Source | **Missing** | None | Event source and duplicate provenance cannot be evaluated |
| Status | **Missing** | None | No Draft/Confirmed/Completed/Overdue/etc. state |
| Owner | **Missing** | None | No accountable user/advisor/member |
| Reminder Rule | **Missing** | None | No reminder entity/rule/scheduler |
| Related Member | **Missing** | Only `family_id`; descriptions may include a student name | No member foreign key |
| Related Blueprint | **Missing** | No Blueprint entity/link | Report-generated event is unlinked text |
| Related Document | **Missing** | No document entity/link | Not applicable in current schema but required where applicable |
| Change History | **Missing** | No history table/event revisions | Generic `repository.update` can overwrite records without ledger |

### Required behavior

| Behavior | Classification | Evidence / reason |
| --- | --- | --- |
| System suggestions start as Draft | **Missing** | No suggestion or Draft state |
| Inferred dates remain unconfirmed | **Missing** | No inferred date or confirmation state |
| Confirmed before strong reminders | **Missing** | No confirmation or reminder logic |
| Date changes preserve history | **Missing** | No due/start date or change ledger |
| Overdue does not automatically mean failure | **Unverified** | No overdue calculation/status exists |
| Duplicate handling preserves different sources | **Missing** | No source or duplicate policy; one Partner save path manually suppresses same-type duplicates |
| Append-only/audit-friendly history | **Partial** | Domain code inserts events and exposes no Timeline edit UI; no database immutability or service enforcement exists |

Family Timeline conclusion: **Partial**. It is a chronological local activity feed, not the frozen Timeline/Reminder contract.

## 7. API / Route Inventory

No network API exists. The actual operation pattern is a Mini Program page event calling a client service/repository that reads or rewrites one local storage object.

| Action | Actual route/function | Purpose/input/entity | Auth/authz | Consent/audit | Test evidence |
| --- | --- | --- | --- | --- | --- |
| Family login | `pages/welcome::start` → `auth.loginFamilyUser` | `wx.login`; creates/loads local `users` Demo identity | No server session/OpenID; shared local identity | No consent/access audit | `user-entry-flow.test.js` |
| Family read | `pages/home::onShow`; `family-edit::onLoad` → `familyForUser` | Current user's `families` record | Client `guard(family_user)` + user ID filter | None | `user-entry-flow.test.js` |
| Family create/update | `family-edit::save` → `upsertFamily` | Form → `families`; update `users` | Client role guard; current local user | Analytics only; no change audit/consent | user flow + storage-failure coverage |
| Child read/create/update | `student-edit::{onLoad,save}` → `getById/upsertStudent` | Form → `students` | Client guard and `student.family_id === family.id` | None | user flow + invalid-ID test |
| Assessment/report create | `compass-questionnaire::submit` | Answers → `assessments`; rules → `reports`; Timeline events | Rechecks family/student ownership before write | No explicit consent; analytics only | domain + submission-failure tests |
| Report read | `report::onLoad` | Report → assessment → student → family | Family user ownership check; `admin` bypass reads any family | No sensitive-read audit | missing/broken/cross-family report tests |
| Timeline read | `timeline::load` → `eventsForFamily` | Current family's `timelineEvents` | Client family guard and current family selection | No read audit | domain event assertion only |
| Timeline create | `repository.addTimeline` called by domain pages/services | `family_id`, type, description, current timestamp | No guard inside repository; relies on caller | No consent/source/audit ledger | event existence only |
| Advisor request create | `advisor-request::submit` | Family request form → `advisorRequests` + event | Family guard and current-family recheck | No sharing-consent object; analytics only | storage-failure/session checks; no success RBAC integration test |
| Admin family list | `admin-families::load` → `repository.all('families')` | Reads all local families | Client `guard(admin)` only; no assignment scope | No sensitive-read audit | No permission-negative test |
| Admin family detail | `admin-family::load` → `familyOverview` | Reads profile, children, reports, events, notes, requests | Page entry guard only; repository has no authorization | No consent/assignment/read audit | Domain overview only |
| Admin note create | `admin-family::addNote` | Note/status → `advisorNotes` + Timeline event | Client `guard(admin)`; any existing family ID | No assignment/consent/write audit | storage-failure test |
| Generic local data access | `repository::{all,getById,where,insert,update}` | Any logical table | **No authentication or authorization** | None | Repository behavior only |
| Local reset | `repository.resetDemoData` | Replaces whole local database | No UI route; no auth inside service | No delete audit/export/retention | Not covered |

## 8. Endpoint-Level RBAC Matrix

There is no endpoint-level or server-side RBAC. The table records actual page/service behavior, not a production permission guarantee.

Legend: `R/C/U` = read/create/update; `—` = no supported action; `Demo` = client-only behavior.

| Resource/action | Family User | Advisor | Admin | Confirm | Delete/archive |
| --- | --- | --- | --- | --- | --- |
| Own Family Profile | `R/C/U` Demo | No distinct Advisor role | `R` all local families | — | — |
| Other Family Profile | UI does not expose; repository can bypass | Not implemented | `R` all | — | — |
| Own Child records | `R/C/U` Demo with page ownership check | Not implemented | `R` all | — | — |
| Assessment/Report | `C/R` own; one cross-family report negative test | Not implemented | `R` all | — | — |
| Timeline | `R` own; system writes through caller | Not implemented | `R` all | — | — |
| Advisor Request | `C` own | Not implemented | `R` all | — | No status-update/archive flow |
| Advisor Note | Family cannot read note content directly | Not implemented | `C/R` for any family | — | — |
| Consent/Permission grant | — | — | — | — | — |
| Export/Delete/Revoke | — | — | — | — | — |

Specific findings:

- Family User cross-family protection is **Partial**: page-level checks exist and cross-family report access has one negative test, but generic repository functions are unguarded and all data is client-controlled.
- Advisor assigned + authorized family access is **Missing**: there is no `advisor` role, assignment entity, consent scope or server query constraint. The UI's “Advisor” uses the seeded `admin` identity.
- Admin control/audit is **Missing**: the shared local account reads every local family, with no enterprise identity, scope, sensitive-read audit or revocation.
- Revoke access blocking subsequent reads is **Missing**: no grant/revoke implementation or test exists.
- AI context minimization is **Partial**: questionnaire submission checks current family/student ownership and rules execute locally, but no authorization-aware context service, field allowlist or read audit exists.

## 9. Consent / Privacy / Audit Mapping

| Requirement | Classification | Evidence-based result |
| --- | --- | --- |
| Core consent storage | **Missing** | No family/member consent entity or field |
| Consent version/time | **Missing** | No version, accepted-at, revoked-at or policy reference |
| Revoke access | **Missing** | Empty `permissions` placeholder is never read or enforced |
| Permission enforcement | **Partial / Demo** | Client page guards only; no trusted boundary |
| Sensitive-data handling | **Partial / Risk** | Local-only rules avoid external AI transfer, but local Storage contains plain family/child data without lifecycle controls |
| Audit logging | **Missing** | `analyticsEvents` tracks product metrics, not actor/resource/action/outcome audit |
| Delete flow | **Missing** | `resetDemoData` is a whole-local-store utility, not an authenticated deletion workflow |
| Export flow | **Missing** | No export route/service/format/audit |
| Access revocation | **Missing** | No assignment/grant/revoke state |
| Data minimization | **Partial / Unverified** | Child name, age, school and grade are required; necessity/retention are not encoded. Partner Demo additionally collects contact data outside core |
| Confirmed facts vs AI inference | **Partial** | Current rules write separate reports, but facts lack source/confirmation policy and technical protection |

The Partner Experience `privacy_consent` checkbox does not satisfy Family Growth Core consent: it is a single boolean on a Partner application, has no policy version, dedicated timestamp, revoke flow, authorization effect or audit trail.

Only synthetic in-memory fixtures were referenced by tests. No runtime local customer database was opened and no real customer/child data was used.

## 10. Test Evidence Inventory

### Commands executed on 2026-08-17

The current Codex shell required the already-installed bundled Node directory in process-local `PATH`; no dependency installation occurred.

| Command | Exit | Actual result and limitation |
| --- | ---: | --- |
| `pnpm test` | `0` | Six Node/static scripts completed; local domain flow, storage normalization, selected ownership/error paths and 15-page structure passed within their assertions |
| `pnpm typecheck` | `0` | `tsc --noEmit`; only `models/partner-experience.d.ts` and `data/partner-experiences.js` are in `tsconfig.files` |
| `pnpm build` | `0` | Runs `tests/validate-project.js`; static JS/JSON/route/resource/model check, not WeChat or production build |
| `pnpm lint` | NOT CONFIGURED | No lint script in `package.json` |
| WeChat compile/simulator/device | BLOCKED / NOT RUN | Developer Tools prerequisite failed; see `docs/codex-audit/SPRINT_2_TASK_3_WECHAT_ACCEPTANCE_REPORT_V1.0.md` |

### Coverage mapping

| Required area | Coverage | Evidence / limitation |
| --- | --- | --- |
| Unit/local rules | **Covered + evidence** | `tests/run-tests.js` exercises rule output and navigation utility |
| Local integration flow | **Partially covered** | In-memory family → student → assessment → report → Timeline → note |
| API | **Not covered** | No API exists |
| Family ownership | **Partially covered** | Cross-family report denied; invalid child and expired session covered |
| Advisor RBAC | **Not covered** | No assignment/authorization/revoke model or negative tests |
| Admin RBAC/audit | **Not covered** | Shared admin behavior only; no scoped/admin audit tests |
| Consent | **Not covered** for core | Partner boolean assertion only, outside Family Growth consent |
| Audit | **Not covered** | No audit implementation |
| Timeline state transition | **Not covered** | No Draft/Confirmed/Completed/Overdue state model |
| Blueprint versioning | **Not covered** | No Blueprint/version model |
| Blueprint → Timeline sync | **Not covered** | Only automatic report event insertion; no confirmed action sync |
| Delete/export/revoke | **Not covered** | No workflows |
| E2E | **Partially covered / runtime unverified** | Node page harness only; no WeChat compiler, simulator or device evidence |

## 11. Missing / Partial / Implemented / Unverified Summary

### Implemented in local Demo semantics

- Family display name field/form/save/read.
- Child school and curriculum fields/form/save/read.
- Local family-to-student linkage.
- Education Compass assessment answer persistence.
- Deterministic Growth Insight report persistence.
- Local chronological event feed.

These claims do not imply production readiness.

### Partial

- Family ID, location, goals, parent/child relationships, age/stage and relationship history.
- Growth Blueprint semantic subset through assessment/report.
- Timeline as an activity feed.
- Client ownership checks and Demo Admin access.
- Input/engine traceability and local integration tests.

### Missing

- Adult/member relationship model, primary language/timezone, provenance and update timestamps.
- Core consent lifecycle, access grant/revoke and permission enforcement.
- Security audit log, export/delete lifecycle and data-retention controls.
- Official Growth Blueprint model, versioning, review, structured action plan and confirmed Timeline sync.
- Timeline category/date/status/owner/source/reminder/link/change-history contract.
- Trusted authentication, database, migrations, API and server RBAC.
- Reminder implementation.

### Unverified

- Full semantics of the unavailable Freeze and Gap Report files.
- Production runtime, WeChat platform behavior, migration safety and closed-loop E2E.
- Overdue semantics and duplicate-source preservation because the relevant model is absent.

## 12. Required Migration Backlog — Future Work Only

No migration is authorized by this audit. The following requirements must be approved before implementation.

### MIG-01｜Trusted Family / Member / provenance contract

- Semantic requirement: canonical Family Profile, typed adult/guardian/dependent relationships, language/timezone, goals, source, confirmation and update history.
- Current implementation: local `families` and `students` arrays with free-text fields and overwrite updates.
- Gap: no trusted persistence, constraints, relationship types, provenance or history.
- Migration requirement: additive server tables/fields and relationship/history structures; exact design Decision Required.
- Nullable transition: new fields must initially allow null/unknown until users confirm values.
- Backfill/default: do not invent language, timezone, birth date, relationship type, source or consent; preserve unknown explicitly.
- Final constraints: unique stable Family ID, required foreign keys and validated relationship/status enums after reconciliation.
- API/UI implications: versioned DTOs, explicit unknown/confirm states and update concurrency handling.
- Permission/audit implications: family-scoped writes, sensitive reads and every fact change require actor/source/audit evidence.
- Rollback: additive/dual-read rollout with snapshot and reconciliation; never delete local data before verified migration.
- Tests: constraints, own/other-family negative cases, history, idempotent import, rollback and reconciliation.

### MIG-02｜Growth Blueprint / version / action contract

- Semantic requirement: five official sections, reproducible inputs, versions, refresh, review and confirmed actions.
- Current implementation: `assessments` and `reports` with generated strings and an engine label.
- Gap: no Blueprint, input snapshot/version, prompt/knowledge version, review state or action entity.
- Migration requirement: approved Blueprint/version/action structures linked to Family and Members.
- Nullable transition: legacy reports remain readable and are not silently promoted to approved Blueprints.
- Backfill/default: legacy reports may be marked `legacy_growth_insight`; do not fabricate versions, confirmations or approvals.
- Final constraints: one immutable version identity, explicit current/superseded state and action ownership/confirmation rules.
- API/UI implications: preview, confirm, refresh/diff, Advisor review and action lifecycle endpoints/screens.
- Permission/audit implications: authorized minimum context, generation/review/confirm actor logs and no AI overwrite of confirmed facts.
- Rollback: preserve all versions; disable new writes without deleting generated history.
- Tests: reproducibility, missing data, version ordering, review, confirmation, authorization and failure recovery.

### MIG-03｜Timeline / Reminder / change-history contract

- Semantic requirement: typed item, category, date type/start/due, source, status, owner, reminder, related entities and history.
- Current implementation: `timelineEvents(id,family_id,event_type,description,date)`.
- Gap: the event feed cannot represent the frozen state machine or reminder rules.
- Migration requirement: additive Timeline item/history/reminder structures or approved equivalent.
- Nullable transition: inferred/due/source/link fields stay nullable and explicitly unconfirmed.
- Backfill/default: existing events can remain historical events; do not invent category, due date, owner or source.
- Final constraints: family ownership, valid states, stable relations and append-only history guarantees.
- API/UI implications: Draft → Confirmed transitions, date edit history, duplicate-source display and reminder preview/confirm.
- Permission/audit implications: only authorized actors can confirm/change; sensitive reads and strong reminders must be auditable.
- Rollback: retain original events and suspend schedulers first; no destructive reverse migration.
- Tests: transitions, inferred dates, overdue semantics, duplicate sources, history immutability, scheduler idempotency and revocation.

### MIG-04｜Consent / access grants / security audit

- Semantic requirement: versioned consent, assignment, scopes, revoke, access enforcement and immutable audit.
- Current implementation: empty Partner `permissions` placeholder and unrelated Partner checkbox.
- Gap: no core consent or RBAC enforcement.
- Migration requirement: approved consent/grant/revoke/audit structures at a trusted service boundary.
- Nullable transition: existing Demo records default to no production access, not implied consent.
- Backfill/default: no consent may be inferred from prior local use or Partner checkbox.
- Final constraints: active grant required for Advisor access; revocation effective immediately; audit append-only.
- API/UI implications: consent presentation/version, grant/revoke screens, access-denied responses, export/delete workflows.
- Permission/audit implications: this migration defines the permission model and therefore requires product/security approval before code.
- Rollback: deny-by-default feature flag; preserve consent/audit history; never roll back by deleting audit records.
- Tests: role/action matrix, assignment, scope, expiry/revoke, subsequent-read denial, audit completeness and tamper resistance.

### MIG-05｜Local Demo to trusted datastore transition

- Semantic requirement: safe adoption without mixing devices, users or Demo identities.
- Current implementation: one local object under `PFS_DB_V01` and shared `local_family_user`.
- Gap: local records cannot be reliably attributed to a production identity.
- Migration requirement: explicit opt-in/import and reconciliation flow after real identity exists.
- Nullable transition: imported records remain pending ownership confirmation.
- Backfill/default: never auto-attach all local data to the first authenticated user.
- Final constraints: verified ownership, idempotent operation key and migration ledger before activation.
- API/UI implications: preview, confirm, conflict handling and recoverable failure states.
- Permission/audit implications: imported data access is denied until ownership is confirmed and audited.
- Rollback: keep local snapshot until server reconciliation passes; reversible server import transaction.
- Tests: duplicate import, cross-user device, partial failure, retry, rollback and data-count reconciliation.

## 13. Required Code Backlog — Not Authorized

1. Trusted authentication/session and server-side Family scope.
2. Canonical Family/Member service with provenance, confirmation and history.
3. Official Growth Blueprint generation/version/review/confirm workflow.
4. Timeline state machine, related-entity links and Reminder scheduler boundary.
5. Server-side Family User / Advisor / Admin RBAC with assignment and consent enforcement.
6. Consent/revoke, security audit, export and deletion workflows.
7. Authorization-aware AI/context loader with explicit field allowlist and version recording.
8. Replace generic client repository trust with authenticated API contracts while preserving the local Demo behind a clear environment boundary.

Each item requires an approved ADR/product/security decision before implementation.

## 14. Required Test Backlog

1. Database constraint, migration forward/rollback and reconciliation tests.
2. Full endpoint-level Family User / Advisor / Admin positive and negative matrix.
3. Advisor assigned + consented family tests and revoke-then-read denial.
4. Sensitive-read/write audit completeness and append-only integrity.
5. Consent version, decline, update and revoke lifecycle.
6. Confirmed-fact protection against AI/inference overwrite.
7. Blueprint input/version reproducibility, refresh/diff and historical retention.
8. Advisor review and confirmed action → Timeline synchronization.
9. Timeline Draft/Confirmed/Completed/Overdue transitions, inferred date confirmation and duplicate-source behavior.
10. Reminder idempotency, timezone, failure/retry and revoked-access behavior.
11. Export/delete/retention and recovery tests.
12. WeChat compiler, simulator, device and closed-loop E2E with synthetic data only.

## 15. Risks / Rollback Considerations

- P0: shared Demo identity and client-controlled Storage can cause cross-user attribution and privacy failure if real data is introduced.
- P0: current Admin/Advisor Demo access reads all local families without assignment, consent or audit.
- P0: treating Growth Insight reports as production Growth Blueprints would misstate product and data contracts.
- P1: future local-to-server migration could attach records to the wrong family unless ownership confirmation and reconciliation are explicit.
- P1: current multi-write assessment/report/Timeline flow has no transaction or complete idempotency.
- P1: missing provenance/confirmation makes later fact-versus-inference reconciliation difficult.
- P2: limited typecheck/lint/E2E coverage reduces change confidence.

This audit performed no production change, migration or destructive action. Rollback for this task is documentation-only: remove the uncommitted audit report or, if later committed, revert that documentation commit. Future data changes must use additive, reversible migrations with snapshots, dual-read/reconciliation where appropriate and no destructive rollback of audit/history.

## 16. Decision Required Items

Report to Jimmy before implementation:

1. Provide or restore the exact authoritative Freeze and Gap Report files; full contract semantics are otherwise Unverified.
2. Approve the canonical meanings/taxonomies for Family Member relationships, language/timezone, focus areas, age/birth representation, Source and confirmed facts.
3. Approve the official Growth Blueprint version/refresh/review/action semantics.
4. Approve Timeline date types, states, categories, duplicate-source handling and Reminder confirmation rules.
5. Approve the Family User / Advisor / Admin assignment, consent, revoke and audit permission model.
6. Approve the trusted datastore/API architecture and local Demo migration policy.
7. Approve privacy minimization, retention, export and deletion rules for child/minor data.

These are semantic, security/privacy, permission and architecture decisions. They were not silently resolved in this audit.

## 17. Recommended Next Single Engineering Action

**Restore and project-owner approve `01_Family_Growth_Core_Freeze_V1.0.md` and `02_Family_Growth_Core_Implementation_Gap_Report_V1.0.md` at versioned, repository-verifiable locations, so the next Architecture/Data Contract Review can resolve the currently Unverified semantics before any schema, API or RBAC implementation begins.**

## 18. Family Growth Agent™ Readiness Gate

No readiness condition is fully proven across database, API, RBAC, consent/audit and runtime E2E. The existing local deterministic rules must not be described as a deployable Family Growth Agent™.

**Family Growth Agent™ Readiness**

* Product Contract: `Frozen`
* Database Evidence: `Partial`
* API Evidence: `Partial`
* Permission/RBAC Evidence: `Partial`
* Consent/Audit Evidence: `Unverified`
* Runtime/Test Evidence: `Partial`
* Closed-loop E2E: `Partial`
* Deployment Gate: `HOLD`
