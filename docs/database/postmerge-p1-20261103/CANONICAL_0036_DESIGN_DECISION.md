# Canonical 0036 Design Decision

2026-11-03 · **ADDITIVE_MIGRATION_REQUIRED / DESIGN REVIEW READY / EXECUTABLE MIGRATION HOLD**. Codex proposal for Jimson and Founder; not signed or approved. Mainline authority is `phoenix/database/canonical/`. No 0036 SQL is added to the release directory or executed.

## Inputs and number allocation

Read private [Draft PR #8](https://github.com/yvettfang-netizen/phoenix-canonical-db/pull/8) at `449ccacdabf8185fb7b5aba634aa027b8aaffdd6`, file `canonical-db/phase2-gate/COMPASS_TAXONOMY_0036_FORWARD_DESIGN_V1.0.md`. Its original pre-merge/private-branch status is historical. The current Founder post-merge instruction establishes the main repository as implementation source. The proposal already prefers extending Lead attribution/events, not adding another Lead-Need master.

Main inventory is 0001–0035. The Canonical baseline, inspected website/ASKWISE source trees and private design PR #8 contain no 0036 Migration; the number is **observed available in the inspected scope, not reserved globally**. The current open PR list was also read. Recheck all relevant branches/PRs immediately before implementation. Existing parallel Education #38, Identity #35 and Health #33/#34 work must not be overwritten.

The exact published entry registry and authenticated need-assertion rules are still missing. This permits a concrete DDL/API review proposal, but not a deployable function that guesses those facts. No placeholder code or permanently disabled SQL is added just to claim a completed Migration.

## Minimum forward DDL proposal

| Existing object | Proposed additive fields / constraints | Compatibility / gate |
|---|---|---|
| `crm.lead_attributions` | `entry_product_ref`, `entry_revision`, `entry_contract_version`; optional complete GEO tuple `content_source_system`, `content_ref`, `content_revision`, `content_sha256`; source event key and canonical payload SHA-256 | Keep old columns and immutable historical rows. Proposed v2 row must carry an approved exact entry/version. Old rows stay NULL in new fields. Full tuple or NULL; no partial or arbitrary browser URL. |
| `crm.lead_attributions.compass_kind` | A forward nullable/conditional compatibility constraint, allowing absence only when the approved new entry tuple is complete | Do not add fictional Identity/Wealth codes to the old enum or convert either to FAMILY_COMPASS. Preserve legacy four-code API behavior. Whether to use an existing entry registry or signed export is a decision, not a new master by default. |
| `crm.lead_events` | typed `need_domain`, `assertion_kind`, `asserted_by_principal_id`, `source_system`, `source_event_ref`, `source_revision`, `evidence_sha256`, `contract_version`; optional superseded event reference subject to decision | Reuse existing event UUID, Lead FK, executing actor, time, immutable trigger and RLS. New need kinds require complete typed fields. Old non-need events stay untouched. Actual asserting principal differs from recording SERVICE; no raw answers. |
| Event idempotency | source-qualified key plus payload digest | Same key/same payload returns the original result; same key/different payload rejects and audits. Scope, retention and replay authority require approval. No claim existing create APIs already implement this guarantee. |
| Consultation/Deal | Follow existing Lead references initially; proposed typed need-event link only if approved | No mandatory FK/backfill before deciding multiple needs, supersession and historical compatibility. No inferred historical user selection. |

Do not add Health patient files, country-policy catalogues, Finance transactions, ASKWISE attempts or teaching ledgers to this first candidate. No new Person/Family/Student/Principal/Client/Lead/Project master is needed.

## Controlled API proposal

New versioned create-entry and assert-need functions would reuse current family/principal context, `crm.is_crm_service()`, controlled identity links and append-only write audit. Existing create-lead/conversion functions retain signatures and old rejection behavior. Internal low-level event writers remain non-public. New app capabilities must be exact-function grants; direct table writes and PUBLIC execute remain denied. RLS remains forced and existing tenant/source/assignment checks stay in force.

The trusted API resolves entry and source revision from the approved source catalogue. It resolves the asserting principal from authenticated evidence, not a browser principal ID or an unverified broker claim. An advisor needs an effective assignment and the separately approved consent boundary. A plain SERVICE context must not fabricate user confirmation. Missing, expired, cross-family, cross-student and cross-partner evidence rejects with a non-sensitive reason and audit event. First Touch cannot be modified; corrections are appended under an approved supersession rule. No runtime account receives new privileges in this task.

## Acceptance specification for the future forward candidate

| Scenario | Required result |
|---|---|
| Child entry → explicit Education need → Education consultation/project | Three distinct linked facts; existing entry unchanged |
| Family entry → advisor-confirmed Wealth need | Family entry preserved; actual advisor and recording SERVICE retained separately |
| Exact direct Identity or Wealth page | Approved source reference retained; never coerced into legacy Family code |
| GEO source updated later | Acquisition retains the original reviewed revision/digest; CMS remains external |
| Repeat source event; conflicting payload | Return original; then reject conflict respectively, with no duplicate fact |
| User/advisor impersonation, expired authorization, wrong family/student/partner | Deny; no writes; audit without sensitive payload |
| Historical API/rows | Same old accepted/rejected inputs and immutable history |
| New release validation | PG16/17 fresh, 0035→new upgrade, repeat/drift/atomicity, separate LOGIN/ticket, RLS/ACL negatives, fresh restore |

These are **NOT RUN** for 0036; current actual tests exercise unchanged 0035. Do not confuse design examples with database evidence.

## Bounded Founder decisions

The follow-up [pre-filled confirmation sheet](FOUNDER_0036_DECISION_SHEET_V1.0.md) records the actual mainline page paths, the Wealth fragment limitation, the existing CRM SERVICE capability and the concrete remaining C-1–C-4 decisions. It is Jimson-authorized engineering preparation, not a Founder approval or a deployed entry registry.

1. Exact entry/page registry owner, source system, approved reference/version and publication digest authority.
2. Multiple concurrent needs, correction/supersession ordering, and required Consultation/Deal linkage.
3. Evidence proving a user's selection or an advisor's confirmation; actor eligibility, assignment/consent and source-qualified replay rules.
4. Minimum read/write grants, privacy/retention rules and the versioned CI manifest/harness update.

Recommendation: approve the two existing-object extensions as a bounded design after these values are supplied, then authorize a separately reviewed 0036 implementation and ephemeral tests. Persistent upgrades, merge and deployment need separate authorization. This document does not fill any approval field on the Founder's behalf.
