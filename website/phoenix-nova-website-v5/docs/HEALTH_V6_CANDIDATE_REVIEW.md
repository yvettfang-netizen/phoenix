# Health Compass V6 candidate — 2026-11-05
Task: PHOENIX-HEALTH-V6-APEC-POSTEVENT-20261105
Repository: yvettfang-netizen/phoenix
Branch: codex/health-v6-apec-postevent-20261105
Base: 9de1e8ddeecbd338d53230ef0ff3b3a82ac3e2fc
Worktree: D:/hV6
Status: DRAFT CANDIDATE / RELEASE HOLD

## Baseline and PR decision
PR #50 is merged into main at the base SHA above. Its head was a9a8e6900c7bdde28063df0e8028f6e27769cf23; base main; 99 changed files. It included Health UI, shared brand/chrome/locale files and canonical/Health workflows, so it is not an isolated editable Health-only PR. Use option B: a new V6 PR from latest main. No cherry-pick, rebase, force push or closure of old PRs.

At audit, #50 had no GitHub review approvals. Its pre-merge head had successful Website, Health, Canonical, Education and Identity workflows. Those are historical baseline evidence only. The scoped Founder boundary comment at https://github.com/yvettfang-netizen/phoenix/pull/50#issuecomment-6651466486 retains independent-code-review EVIDENCE_MISSING and Sites HOLD; it is not complete visual, medical or release approval. No later approved Health visual baseline was supplied. This candidate inherits the merged V5/PR50 implementation without asserting new approval.

## Scope and reuse
- Reuse HealthLanding, HealthFamily, HealthConsultation, health-compass model/component, server-only HEALTH_COMPASS_PREVIEW, SiteHeader/SiteFooter, metadata utilities and the existing fail-closed integration contract.
- Preserve original Hero image /images/health-v31-gba-family.png, original Hero layout, existing style tokens and official B logo asset /brand/official/v3/phoenix-nova-bilingual-b@2x.png from current main. No shared logo, home, Education, Identity, Wealth or Family OS source change.
- New first-page order: existing Hero, existing controlled Compass, Global Health services, planned post-APEC Shenzhen launch, existing resources, insurance verification and specialty planning, six steps and existing family/partner sections, expanded FAQ and local preparation.
- Global Health is within Health. No fifth Compass or standalone hospital portal.
- New insurer selector: exactly 11 requested brands, four specialty filters, four status definitions, five evidence fields and ten policy verification topics. Every demo result is UNVERIFIED, including after changing/resetting selections.
- New specialty tabs/FAQ contain consultation questions and confirmation requirements, not available treatments, suitability determinations, stay durations, travel guarantees or provider facts.
- APEC copy is a prospective plan after the meeting, with no countdown or assertion that APEC has ended or services launched. UK-first outreach and later US/Canada/Australia are plans, not networks. No APEC logo.
- Country/source choices are local preparation only. No browser-supplied partner_id, Michael identity or commission formula is created.
- Local privacy acknowledgement is not contact consent, service authority or patient permission. Actual enquiry submission remains disabled.

## Data / security
See HEALTH_V6_DATA_CONTRACT.md for actual schema names and Jimson handoff. No migration, DB connection, schema edit, alternate database, CRM write, payment, event publication, medical upload or authorization grant is introduced.
HEALTH_COMPASS_PREVIEW stays default-off. noindex metadata, robots denial, empty gated Health sitemap and fail-closed runtime contract remain. Actual Staging response/access-control validation is NOT VERIFIED by local tests.

## Validation and evidence
See HEALTH_V6_TEST_REPORT.md for real commands/results and preview links. Local static-contract tests do not prove PostgreSQL RLS or real CRM connectivity. Browser loopback rehearsal does not prove Staging.
Existing 14-question content, model, scoring/grouping, consent and export implementation must be byte-identical to base. Shared homepage/logo/chrome and other business modules must have no source diff.

## Rollback
No deployment occurs in this task. Discarding the unmerged candidate PR leaves main unchanged. After a separately approved merge, revert the V6 change using a normal reviewed revert commit; no reset/force push. Preserve HEALTH_COMPASS_PREVIEW=0 to keep the assessment closed. Actual submissions/uploads remain off regardless of browser selections. This branch does not authorize changes to the deployed Sites version.

## Founder gate / approval packet
- Candidate UI and test evidence: review required.
- Independent code review: EVIDENCE_MISSING.
- Medical boundaries and clinical content review: EVIDENCE_MISSING.
- Hospital/provider/doctor/language/rooms/pricing/insurance/acceptance evidence and display authorization: HOLD.
- Image rights: existing assets reused, no new clearance claimed; HOLD.
- Multi-region privacy policy, consent, retention, withdrawal, legal approval: HOLD.
- Jimson schema, service context, patient permission and real DB/RLS integration: HOLD.
- Founder final visual/business/brand acceptance: EVIDENCE_MISSING.
- Staging E2E and release approval: NOT VERIFIED / HOLD.
- Sites: HOLD. No save, deploy, DNS, indexing or production migration.

