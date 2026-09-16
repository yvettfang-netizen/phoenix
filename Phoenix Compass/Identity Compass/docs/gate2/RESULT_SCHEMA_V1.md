# Identity Compass Result Schema V1

Status: GATE 2 DESIGN
Version: `HK_IDENTITY_RESULT_2026_09_V1`

## Purpose

Provide a deterministic, explainable result contract for Identity Compass. The schema must not output guaranteed approval, approval probability, or legal-advice language.

## Top-level result

```text
assessment_id
rule_version
evidence_registry_version
question_bank_version
assessment_timestamp
primary_family_id (nullable in pre-Family-OS preview)
consent_id (nullable until Gate 3)
current_status
recommended_path
alternative_paths[]
readiness
gaps[]
risk_flags[]
next_actions[]
evidence_summary
journey_handoff
explanation
human_review
```

## Route evaluation

Each candidate route returns:

```text
route_code
route_name
outcome
matched_rules[]
unmet_rules[]
unknown_rules[]
evidence_refs[]
policy_effective_date
```

Allowed `outcome` values:

- `ROUTE_MATCH`
- `POTENTIAL_MATCH_EVIDENCE_REQUIRED`
- `NOT_ROUTABLE_UNDER_CURRENT_FACTS`
- `INSUFFICIENT_INFORMATION`
- `HUMAN_REVIEW_REQUIRED`
- `NOT_APPLICABLE`

`ROUTE_MATCH` means the supplied structured facts match the encoded screening rules. It never means Immigration Department approval is assured.

## Readiness

Allowed levels:

- `READY_FOR_DOCUMENT_REVIEW`
- `PARTIAL_EVIDENCE`
- `EARLY_PLANNING`
- `STATUS_MAINTENANCE_REQUIRED`
- `URGENT_EXPIRY_REVIEW`
- `HUMAN_REVIEW_REQUIRED`

Readiness is operational readiness, not approval likelihood.

## Risk flags

Examples:

- `POLICY_SOURCE_NEEDS_REVIEW`
- `QUOTA_LIVE_CHECK_REQUIRED`
- `ELIGIBLE_UNIVERSITY_LIVE_CHECK_REQUIRED`
- `CURRENT_STATUS_CONFLICT`
- `MAINLAND_ROUTE_BOUNDARY`
- `EXPIRY_WITHIN_90_DAYS`
- `EXPIRY_WITHIN_42_DAYS`
- `DEPENDANT_SPONSORSHIP_REVIEW`
- `ORDINARY_RESIDENCE_EVIDENCE_GAP`
- `SEVEN_YEAR_CALENDAR_NOT_EQUIVALENT_TO_ROA`
- `DOCUMENTARY_EVIDENCE_MISSING`

## Recommended path logic

A recommended path may be selected only from route outcomes `ROUTE_MATCH` or `POTENTIAL_MATCH_EVIDENCE_REQUIRED` and must preserve evidence caveats. Where multiple routes remain viable, ranking may use user goal, maintenance burden, family fit, and evidence completeness; it may not use fabricated approval probabilities.

## Evidence summary

For every policy-sensitive conclusion include:

- official source title
- source authority
- source URL/reference
- evidence status (`VERIFIED`, `NEEDS_REVIEW`, `RETIRED`)
- effective/publication date where available
- rule IDs derived from that evidence

## Explanation layer

LLM or template-generated prose receives the deterministic result as immutable input. It may:

- explain why a route appears relevant;
- translate technical requirements into plain language;
- summarise missing evidence;
- order next actions.

It may not:

- change `outcome`;
- invent a new route;
- state an approval percentage;
- convert `NEEDS_REVIEW` evidence into a verified claim;
- present the result as legal advice.

## Human review

```text
required: boolean
reason_codes[]
review_scope[]
blocking_unknowns[]
```

Human review is mandatory when evidence is conflicting, a current official list/quota must be checked live, ordinary-residence facts are ambiguous, or the source registry has not verified the relevant policy rule.