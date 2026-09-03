# Phoenix Identity Compass — Gate 2 Product Spec V0.1

Status: `GATE 2 WORKING DRAFT — NOT PRODUCTION POLICY`
Date: 2026-09-03
Branch: `feat/identity-compass-gate2-sprint`

## 1. Goal

Advance the existing Sprint 1 Identity flow from family-intent classification into a deterministic, evidence-backed full-analysis architecture while preserving the existing Free 6-question experience.

Current Sprint 1 flow remains unchanged:

`/identity` → Free 6 questions → Family Intent Classification → Free Identity Snapshot → `/identity/full-analysis`

Gate 2 begins behind `/identity/full-analysis`.

## 2. Non-negotiable architecture

```text
User answers
  ↓
Normalized Identity Profile
  ↓
Versioned deterministic rule engine
  ↓
Evidence-linked route evaluations
  ↓
Result Schema V1
  ↓
Explanation renderer (LLM optional, non-authoritative)
  ↓
Family OS handoff contract
```

The LLM may explain a deterministic result, but may not alter route eligibility, evidence status, risk flags, or outcome state.

## 3. Gate 2 route coverage

Initial Hong Kong route family:

- `HK_TTPS` — Top Talent Pass Scheme
- `HK_QMAS` — Quality Migrant Admission Scheme
- `HK_GEP_EMPLOYMENT` — General Employment Policy employment path where applicable
- `HK_GEP_ENTREPRENEUR` — entrepreneur / establish-or-join-business path where applicable
- `HK_DEPENDANT` — dependant residence path
- `HK_EXTENSION` — extension / renewal journey
- `HK_ROA` — Right of Abode / permanent-resident journey

No route is production-ready until its rule set is marked `VERIFIED` in the Evidence Registry and passes Founder review.

## 4. Question Bank V1 architecture

### 4.1 Free layer

The current 6-question Free layer is retained for intent and segmentation only. It must not claim immigration eligibility.

### 4.2 Full-analysis controlled fields

The full analysis may collect only fields needed by one or more verified rule sets.

Core candidate fields for V1:

| Field | Type | Purpose |
|---|---|---|
| `nationality_or_residency_context` | enum | route applicability / exclusions |
| `current_hk_status` | enum | new entry vs extension vs dependant vs ROA journey |
| `age_band` | enum | route-specific criteria where verified |
| `highest_education_level` | enum | qualification screening |
| `degree_institution` | structured text / controlled lookup | eligible-university checks where applicable |
| `graduation_date` | date/year | post-graduation experience calculations |
| `full_time_work_years_post_graduation` | number | TTPS / professional route checks |
| `annual_employment_or_business_income_hkd` | number/range | income-threshold checks where applicable |
| `income_reference_period` | controlled period | prevents ambiguous income comparison |
| `employment_offer_in_hk` | boolean/structured | employment-route evaluation |
| `employment_role_and_sector` | structured | route evidence and advisory handoff |
| `business_owner_or_founder` | boolean | entrepreneur route branching |
| `business_operating_evidence` | structured checklist | entrepreneur route evidence only after verified |
| `awards_research_patents_profile` | structured checklist | QMAS evidence only after verified |
| `management_or_senior_experience_years` | number | professional / QMAS evidence where verified |
| `spouse_or_partner` | boolean | dependant planning |
| `dependent_children` | integer | family planning |
| `hk_entry_date` | date | extension / residence journey |
| `current_permission_expiry_date` | date | timeline reminders |
| `ordinary_residence_start_date` | date | ROA journey support; never alone determines ROA |
| `residence_interruptions` | structured periods | ROA review flag |
| `family_intent` | enum | reuse Sprint 1 intent classification |

Every field must declare `required_for_routes[]`, `sensitivity_class`, `retention_policy`, and `consent_purpose` before Gate 3.

## 5. Rule Engine V1 contract

Every rule must have:

- `rule_id`
- `route_code`
- `rule_version`
- `effective_from`
- `effective_to` (nullable)
- `evidence_id`
- `evidence_status`: `VERIFIED | NEEDS_REVIEW | RETIRED`
- `input_fields[]`
- `predicate`
- `outcome_code`
- `severity`
- `human_review_required`

Allowed route evaluation states:

- `POTENTIAL_MATCH`
- `POTENTIAL_MATCH_WITH_GAPS`
- `INSUFFICIENT_INFORMATION`
- `LIKELY_NOT_MATCH_ON_VERIFIED_CRITERIA`
- `HUMAN_REVIEW_REQUIRED`

Forbidden states / language:

- guaranteed approval
- approval probability
- legal conclusion
- “100% eligible”
- undocumented discretionary scoring

## 6. Result Schema V1

```ts
type IdentityCompassResult = {
  assessmentId: string;
  ruleSetVersion: string;
  evaluatedAt: string;
  recommendedPath: RouteEvaluation | null;
  alternativePaths: RouteEvaluation[];
  readiness: 'READY_TO_PREPARE' | 'NEEDS_INFORMATION' | 'NEEDS_GAP_CLOSURE' | 'HUMAN_REVIEW_REQUIRED';
  keyGaps: ResultGap[];
  riskFlags: RiskFlag[];
  nextActions: NextAction[];
  evidenceSnapshot: EvidenceReference[];
  explanationBoundary: {
    deterministicOutcomeHash: string;
    llmUsed: boolean;
    llmMayChangeOutcome: false;
  };
};
```

Each `RouteEvaluation` must expose the route code, evaluation state, verified criteria met/not met/unknown, evidence references, and any required human review.

## 7. Family OS handoff V1

Gate 2 defines the contract only; Gate 3 implements persistence.

Required handoff fields:

- `primary_family_id`
- `subject_core_id` (`usr_`, `gdn_`, or other Founder-approved Core subject)
- `assessment_id`
- `domain = IDENTITY`
- `assessment_version`
- `rule_set_version`
- `consent_id`
- `consent_purpose = ASSESSMENT_SCORING`
- `result_state`
- `recommended_path_code`
- `risk_flags[]`
- `next_actions[]`
- `created_at`

The Identity Compass may not become an independent authority for User, Family, Guardian, Student, Consent, Role, Permission, entitlement, or audit identity.

## 8. Identity Journey seed events

The Gate 2 result may propose (not persist yet) timeline events such as:

- `IDENTITY_ASSESSMENT_COMPLETED`
- `DOCUMENT_PREPARATION_STARTED`
- `APPLICATION_TARGET_SELECTED`
- `PERMISSION_EXPIRY_UPCOMING`
- `EXTENSION_REVIEW_WINDOW`
- `ROA_REVIEW_MILESTONE`

Dates derived from policy must always carry the rule/evidence version that generated them.

## 9. Test personas required before Gate 2 acceptance

At minimum:

1. High-income / TTPS-oriented synthetic adult.
2. Eligible-university graduate with work-experience boundary cases.
3. Family already in Hong Kong approaching extension / long-residence planning.
4. Negative case clearly outside a verified threshold.
5. Missing-information case that must not be forced into a route.
6. Conflicting-evidence case requiring human review.

No real client records are used in Gate 2 tests.

## 10. Gate 2 exit criteria

Gate 2 is complete only when:

- Question Bank V1 is frozen.
- Every implemented policy rule has verified official evidence.
- Result Schema V1 is frozen and tested against synthetic personas.
- Family OS handoff contract is reviewed against Gate 1 Core identity boundaries.
- No LLM can alter deterministic outcomes.
- No production DB migration or real-family onboarding has occurred.
- Founder explicitly authorizes Gate 3.
