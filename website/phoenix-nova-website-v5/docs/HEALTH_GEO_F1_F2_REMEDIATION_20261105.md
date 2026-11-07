# Health GEO F1/F2 source and responsibility correction

Status: engineering candidate / Draft PR / Sites HOLD. Review responsibility: Founder.
Human review dates, approval conclusions and asset/provider authorisations remain
EVIDENCE_MISSING except for the exact limited scope of existing records.
Existing records apply only to their recorded SHA and scope; this correction does
not transfer an earlier approval to the new commit.

Baseline: main `9de1e8ddeecbd338d53230ef0ff3b3a82ac3e2fc`.
Work branch: `codex/health-source-claims-fixes-20261105`.
Findings: [PR #50 post-merge audit](https://github.com/yvettfang-netizen/phoenix/pull/50#issuecomment-6651637442).

## F1 — current institution-registration source

The active source now uses the Shenzhen Health Commission's
[深卫健规〔2024〕4号](https://wjw.sz.gov.cn/xxgk/zcfggfxwj/mybh_5/content/post_11667974.html).
The authority's [effective-document directory](https://wjw.sz.gov.cn/xxgk/gfxwjml/xxyxgfxwjml/)
lists this rule. Article 3 describes the registration/filing prerequisite;
Article 44 makes the rule effective from 2024-12-01 and repeals the 2020 version.
The bilingual source title, URL, scope, caution and source register now identify
that version rather than presenting the repealed rule as the active reference.

## F2 — clinical versus insurance decisions

The GBA cross-boundary resources guide now states in both languages that medical
providers decide acceptance, diagnosis, treatment and referral, while insurers
decide coverage and claims. Phoenix Nova's role remains non-clinical preparation.
The [Insurance Authority claims guidance](https://www.ia.org.hk/en/medical_insurance/tips_on_making_claims.html)
is now a direct source on that guide; it states that final claims decisions belong
to insurers and that pre-authorisation does not establish the final payment.

## Evidence dates and regression coverage

The two corrected/rechecked source records and three affected guides carry the
targeted evidence date 2026-11-05. The other source and guide review dates are
unchanged; no blanket provider verification or human sign-off is asserted.

- Content regression tests require the active 2024 source, the repeal caution,
  current source propagation, and separate clinical/insurance decision roles.
- Browser regression checks require the current source link on both affected
  guides, absence of the retired link, bilingual responsibility clauses and the
  direct Insurance Authority citation on the GBA guide.
- Existing draft/noindex, Compass feature gate, no-record-upload, quotation and
  cross-product regression checks remain enabled.

## Release boundary

This change introduces no API, storage, questionnaire, scoring, asset, migration
or production configuration changes. Hospital cooperation, doctors, language,
rooms, prices, insurance eligibility and acceptance remain individually unverified.
Independent review, privacy/material/content sign-off and Founder final acceptance
remain separate evidence gates. Sites remains HOLD: no save, deployment, DNS,
indexing, database migration or production-data action is authorised here.
