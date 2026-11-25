# Identity Compass Synthetic Personas & Boundary Tests V1

Status: GATE 2 TEST DESIGN

## Persona A — TTPS Category A candidate

Synthetic facts:
- non-excluded nationality
- immediately preceding year taxable employment/business income: HK$3,100,000
- documentary evidence available
- no current HK talent status in preceding six months

Expected screening:
- TTPS A: `ROUTE_MATCH`
- explanation must state that screening match is not approval assurance
- evidence must cite active TTPS rule version

Boundary cases:
- HK$2,499,999 -> not Category A under encoded threshold
- investment income only -> must not be counted as qualifying annual income for TTPS A
- income evidence unknown -> `POTENTIAL_MATCH_EVIDENCE_REQUIRED` or `HUMAN_REVIEW_REQUIRED`

## Persona B — TTPS B/C university graduate

Synthetic facts:
- degree from currently eligible institution
- graduation within preceding five years
- 4 years qualifying post-graduation full-time work experience within preceding five years

Expected:
- Category B candidate
- Category C not selected when B requirements are met

Boundary cases:
- 2 years 11 months work experience -> B false; C may require quota/live-list checks if other conditions match
- institution eligibility unknown -> live check required
- HK non-local student with locally accredited full-time undergraduate qualification -> Category C exclusion must be flagged

## Persona C — QMAS General Points Test planning candidate

Synthetic facts:
- age <=50
- postgraduate qualification
- English proficiency and second-language evidence
- 6 years specialist experience
- partial evidence on reputable-enterprise and international-exposure criteria

Expected:
- criteria evaluation is deterministic per current official framework
- unknown documentary criteria stay unknown
- no invented approval probability
- if current passing threshold or evidence definition requires live verification, output human review/live check

## Persona D — Mainland entrepreneur routing guardrail

Synthetic facts:
- Chinese resident of the Mainland
- wants to establish a business in Hong Kong

Expected:
- GEP Entrepreneur: `NOT_APPLICABLE` due to route applicability boundary
- system must not label the person generally "ineligible for Hong Kong entrepreneurship"; it must redirect for alternate authorised route review rather than infer a scheme

## Persona E — TTPS extension

Synthetic facts:
- currently admitted under TTPS
- expiry in 75 days
- employed in HK with stable income

Expected:
- extension journey surfaced
- `EXPIRY_WITHIN_90_DAYS` risk flag
- official guidance checkpoint for applying within three months before expiry
- no guaranteed extension outcome

Boundary:
- expiry in 35 days -> also `EXPIRY_WITHIN_42_DAYS`
- no HK employment and no established/joined HK business evidence -> evidence gap / human review

## Persona F — seven-year permanent-residence planning

Synthetic facts:
- has a seven-year calendar span in HK-related immigration history
- absence history incomplete

Expected:
- never auto-label as permanent-resident eligible solely because seven calendar years elapsed
- `ORDINARY_RESIDENCE_EVIDENCE_GAP`
- `SEVEN_YEAR_CALENDAR_NOT_EQUIVALENT_TO_ROA`
- route to evidence review

## Negative tests

1. Missing rule version -> fail closed.
2. Evidence registry entry `RETIRED` -> must not drive current screening.
3. Evidence entry `NEEDS_REVIEW` -> cannot generate definitive policy-sensitive outcome.
4. LLM explanation attempts to change deterministic outcome -> reject/ignore generated change.
5. Conflicting nationality/residency fields -> human review.
6. Missing current immigration scheme for renewal request -> insufficient information.
7. Dependants without verified sponsor relationship -> no definitive dependant route result.
8. Expired/withdrawn consent in future Gate 3 handoff -> handoff rejected.
9. Family mismatch between payload and `primary_family_id` -> handoff rejected.
10. Old cached eligible-university list -> live-list verification required.

## Acceptance rule

Gate 2 design can be marked complete only when every route has at least one positive synthetic case and one negative/boundary case, and no test expects an approval probability or guaranteed immigration outcome.