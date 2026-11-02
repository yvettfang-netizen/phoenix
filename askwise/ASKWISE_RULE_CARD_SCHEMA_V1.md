# ASKWISE Rule Card Schema V1

The V1 advisor loop uses deterministic Rule Cards. A card is a reviewed,
versioned procedural rule, not a generated policy claim.

| Field | Purpose |
| --- | --- |
| `ruleId` | Stable trace identifier, for example `ADVISOR-INTAKE-001` |
| `domain` | Intake, evidence, risk, planning, or Learning Support boundary |
| `trigger` | Observable condition that activates the rule |
| `requiredEvidence` | Inputs that must exist before the rule can progress |
| `decisionLogic` | Deterministic rule application |
| `boundary` | What the rule must not conclude or expose |
| `outputTemplate` | Controlled output form for the advisor report |
| `source` | Approved document or founder instruction that supports the rule |
| `version` | Rule version |
| `reviewer` | Named role responsible for approval |
| `status` | `ACTIVE` or `DRAFT`; only `ACTIVE` cards execute |

V1 cards are implemented in
`askwise-learning-engine/src/lib/advisor/rule-cards.ts`. Their sources are
limited to `ASKWISE_PRODUCT_BOUNDARY_V1.1_CANDIDATE.md` and the 2026-08-25
founder brief. No external school, immigration, identity, or success-policy
claim is encoded.
