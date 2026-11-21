# Phoenix Nova | Unified engineering authority and SQL collision audit

**Audit date:** 2026-11-21. **Coordinating stream:** 架构审查与产品设计.
**Status:** Source/CI review; restricted migrations remain Draft/HOLD. Evidence is tied to exact GitHub SHA, not assistant claims or other chat windows.

## Repository authorities

- `yvettfang-netizen/phoenix`: connected, `main@f1d8af3f9338b4cb8a1afca48c6d85f1396d9da3`; formal Canonical PostgreSQL migrations 0001-0037. PR #88 legacy-code retirement merged; PR #90 Academy architecture merged.
- `phoenix-canonical-db`: **NOT VERIFIED**. The connected GitHub installation lists only `phoenix`; `yvettfang-netizen/phoenix-canonical-db` returned 404. The canonical-db repository may be private, relocated, archived or inaccessible: do not guess its SHA, PRs, installed ledger or status. No cross-repository promotion until the canonical-db owner/permissions and migration inventory are verified.
- Removing old database *code* does not establish that old remote PostgreSQL/SQLite/D1 storage or backups have been physically deleted. The previously assigned Jimson private-host/cloud task must return its sanitized receipt. No legacy data migration is required.

## PR #85-#93 evidence snapshot (before this review patch)

| PR | State | Last observed exact-head checks | Disposition |
|---|---|---|---|
| #85 | Draft, not merged | 0/0 returned; older base | Historical Academic evidence; do not re-run as a new project |
| #86 | Draft, not merged | 8/8 success | DB-04/05 contract-only, HOLD |
| #87 | Draft, not merged | 8/8 success | S1 design; historical evidence; not installable |
| #88 | Merged | 20/20 success at candidate HEAD | Old Education runtime code retirement complete |
| #89 | Draft, not merged | 19/19 success | S1 0045 alternative; **DO NOT INSTALL** with #91 or #92 |
| #90 | Merged | 8/8 success at reviewed HEAD | Founder-approved Academy architecture and candidate authoring |
| #91 | Draft, not merged | 19/19 success | S1 A0 alternative, function bytes equal #89; **DO NOT INSTALL** with #89 or #92 |
| #92 | Draft, not merged | 18/18 success before new review patch | Selected integrated Package A candidate; new HEAD needs fresh exact-head CI |
| #93 | Draft, not merged | 19/19 success | Same `learning.academy_staff_grants` table as #92; **DO NOT INSTALL** with #92 |

Rows show evidence observed for a specific head at the time of audit. A green CI job on an older SHA is not an approval for a later SHA. No candidate SQL PR is approved for merge or shared/production installation.

## Duplicate SQL resolution — mandatory

1. PR #89 and PR #91 contain byte-identical `CREATE OR REPLACE FUNCTION learning.can_read_sensitive(uuid,uuid,uuid)` definitions, aside from wrapper comments. Never install both.
2. Integrated PR #92 already includes live family-membership rechecks on guardian Learning reads; it replaces the same function. Package A must run on formal 0001-0037 alone, not on #89 or #91. A source drift/fingerprint guard refuses unexpected prior function changes, including unledgered S1 installs.
3. PR #93 and #92 both create `learning.academy_staff_grants`. Package A's existing `to_regclass` guard refuses an already present table. Do not merge/install both.
4. PR #77 / 0042 is a separate enterprise workspace candidate and is not a required Academic Studio dependency.
5. Keep `main` formal migration history immutable. No numeric migration number is allocated in Package A; no SQL from PR #74/86 is pulled into standardized assessments.

## Latest Parent Consent gate

A new source-review finding: the original `auth.can_open_parent_view` checked current verified Guardian Authority but did not require an active matching Consent. Package A now additionally checks current purpose/data-class-matched Consent for the same subject in the corresponding Guardian Authority scope. PG16/17 negative tests assert Parent view closes immediately after the exact grantee's Learning Consent is withdrawn, even when Guardian Authority remains verified. Existing per-resource child read checks remain authoritative. This is a new source change and needs exact-head revalidation.

## Founder singleton bootstrap concurrency

The unnumbered candidate now enforces an exclusive active Founder grant through a database partial UNIQUE index, and serializes trusted bootstrap through a transaction-scoped advisory lock. Previously two concurrent checks could both see no active Founder and create distinct active grants. Expired Founder grants are transitioned under the same lock before a new authorized bootstrap. PG16/17 candidate smoke now requires the index and authorization tests reject a second Founder. This is a model-assisted security change; exact-HEAD CI required before acceptance.

## Direct Xuanwu security review findings

The first Package A candidate version had a subtle read-protection gap: `auth.write_context_is_live()` sat inside the FAMILY arm of a boolean OR; STUDENT and STAFF arms did not share a global live-context and ACTIVE Principal predicate. A disabled Student Principal might retain an already-bound STUDENT context until expiry. The new patch applies both common checks to all three branches of `learning.can_read_sensitive()`.

It also adds an ACTIVE Principal recheck to Student basic-profile reads, the Parent-view guard and the teacher-kind resolver, plus current family membership for the guardian's subject. The already-present live Guardian membership and scoped STAFF Consent/teacher assignment checks are preserved. Test coverage exercises Principal disable and family membership termination on the same bound backend.

These are direct assistant/model-assisted source findings, **not an independent human security signature**. Disposable PG16/17 CI on the exact new SHA is the technical acceptance gate. Actual trusted login brokers, Family OS/Corporate OS runtime routing, shared nonproduction install and production deployment remain separate HOLD gates.

## Explicit next sequence

- **A:** reconcile and pass #92 exact-head PG16/17 and negative access tests; review/record runtime API gap, Principal disable, Parent and Staff consent/revocation.
- **B:** separate teacher-controlled shared room/online/HYBRID booking candidate, one slot/roster; teacher LEAD assigns mode, no student choice. Test teacher/student/room concurrency and immutable change events.
- **C:** separate subject-owned CAT4/DSE/A-Level/IELTS/JLPT/Cantonese scale-aware attempts/results with provenance, human review and licensing/retention controls; no cross-scale average.
- **Integration:** authorized ASKWISE evidence adapter, Family OS student/parent projection, Service Project, Corporate OS teacher/admin interface and Phoenix Meta 观澜台 Founder read-only evidence in sequence. No cross-system synthetic fixture may masquerade as a deployed business loop.

Founder approval is required again before any restricted SQL merge, any shared DB install, any production release and any new commercial hour-ledger work. Jimson is exception-only for exact private-host/credential actions.
