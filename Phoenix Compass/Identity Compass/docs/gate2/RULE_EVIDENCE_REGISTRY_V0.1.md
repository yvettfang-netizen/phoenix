# Phoenix Identity Compass — Rule & Evidence Registry V0.1

Status: `WORKING DRAFT — OFFICIAL-SOURCE INTAKE STARTED`
Date: 2026-09-03

## Evidence policy

Policy-sensitive logic may only be implemented when the supporting source is official, versioned where possible, and reviewed for current applicability.

Evidence states:

- `VERIFIED` — official source reviewed and suitable for deterministic implementation.
- `NEEDS_REVIEW` — official source identified, but exact rule extraction / edge cases / current effective wording still require review.
- `RETIRED` — source or rule superseded; retained for audit only.

A web page being official does not by itself make every possible inference production-safe. Only explicitly extracted criteria are eligible for rule implementation.

## Registry

| Evidence ID | Route | Source | Current extraction | Status |
|---|---|---|---|---|
| `EVID-HK-TTPS-001` | `HK_TTPS` | Hong Kong Immigration Department — Guidebook for Top Talent Pass Scheme, ID(E)1026 | Category A: annual income HK$2.5m or above (or equivalent) in year immediately preceding application. Category B: degree graduate of eligible university + at least 3 years work experience in preceding 5 years. Category C exists in guidebook but quota / detailed current conditions must be separately extracted before implementation. | `VERIFIED_PARTIAL` |
| `EVID-HK-TTPS-002` | `HK_TTPS` | Hong Kong Immigration Department — TTPS service page / eligible-university list | Eligible-university lookup is externally maintained and can change. Must be treated as versioned reference data, not hard-coded permanently into questionnaire copy. | `NEEDS_REVIEW` |
| `EVID-HK-QMAS-001` | `HK_QMAS` | Hong Kong Immigration Department — Quality Migrant Admission Scheme current service/guidance materials | Current scheme exists; detailed prevailing prerequisites, assessment criteria, quota/selection mechanics and enhanced measures require rule-by-rule extraction before deterministic use. | `NEEDS_REVIEW` |
| `EVID-HK-GEP-001` | `HK_GEP_EMPLOYMENT` / `HK_GEP_ENTREPRENEUR` | Hong Kong Immigration Department — General Employment Policy / investment to establish or join in business guidance | Route family confirmed. Detailed eligibility tests and Mainland-applicant applicability boundaries require separate extraction. | `NEEDS_REVIEW` |
| `EVID-HK-DEPENDANT-001` | `HK_DEPENDANT` | Hong Kong Immigration Department — Dependants service page | Dependants may be admitted for qualifying sponsors under listed employment, talent, investment and study categories. Sponsor/category-specific family-member criteria must be extracted before implementation. | `VERIFIED_PARTIAL` |
| `EVID-HK-EXT-001` | `HK_EXTENSION` | Hong Kong Immigration Department — extension-of-stay materials by admission scheme | Extension is scheme-specific; no universal renewal score is permitted. Result must branch to the applicant's current permission category and its current evidence set. | `VERIFIED_ARCHITECTURE` |
| `EVID-HK-ROA-001` | `HK_ROA` | Hong Kong Immigration Department — Eligibility for Right of Abode in HKSAR | Chinese citizens include a route based on continuous ordinary residence in Hong Kong for not less than 7 years. Non-Chinese applicants have additional permanent-residence declaration/approval conditions. Seven calendar years alone must never be treated as an automatic approval rule. | `VERIFIED_PARTIAL` |

## Official source locations captured at intake

- TTPS guidebook: `https://www.immd.gov.hk/pdforms/ID(E)1026.pdf`
- Dependants: `https://www.immd.gov.hk/eng/services/visas/residence_as_dependant.html`
- Right of Abode eligibility flowchart: `https://www.immd.gov.hk/pdf/roa_eligibililty_en.pdf`
- Immigration Department visa / scheme statistics and links: `https://www.immd.gov.hk/eng/facts/visa-control.html`

These URLs are evidence pointers, not substitutes for an extracted and reviewed rule definition.

## Immediate rule-extraction queue

### P0 — TTPS

1. Extract Categories A/B/C completely.
2. Extract nationality / applicability exclusions.
3. Define eligible-university reference-data update policy.
4. Define exact income semantics and acceptable reference period.
5. Define work-experience date calculation and boundary tests.

### P0 — QMAS

1. Extract current prerequisites.
2. Extract current assessment framework after latest enhancement measures.
3. Separate mandatory eligibility from discretionary selection.
4. Do not turn discretionary selection into approval probability.

### P0 — GEP / entrepreneur

1. Separate employment and entrepreneur branches.
2. Confirm applicability for Mainland Chinese residents vs ASMTP or other route where relevant.
3. Extract sponsor / employer / business evidence requirements.

### P0 — extension

1. Build `current_hk_status` → scheme-specific extension evidence map.
2. Extract permitted filing window / timing only from current official source.
3. Store all generated timeline dates with evidence version.

### P0 — ROA

1. Separate Chinese and non-Chinese legal categories.
2. Treat `ordinary residence` as a legal/factual review concept, not a simple day counter.
3. Record absence / interruption history as review evidence, not automatic disqualification unless an official rule supports it.
4. Never tell users that 7 years alone guarantees permanent residence.

## Implementation guard

Until a rule has a `VERIFIED` evidence entry, runtime may only return `INSUFFICIENT_INFORMATION` or `HUMAN_REVIEW_REQUIRED` for that rule branch. No `NEEDS_REVIEW` evidence may produce a definitive route match/non-match outcome.
