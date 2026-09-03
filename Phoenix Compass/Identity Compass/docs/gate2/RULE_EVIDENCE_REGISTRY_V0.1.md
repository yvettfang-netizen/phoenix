# Phoenix Identity Compass — Rule & Evidence Registry V0.2

Status: `GATE 2 EVIDENCE REVIEW COMPLETE — PRODUCTION NOT AUTHORIZED`
Date: 2026-09-03

## Evidence policy

Policy-sensitive logic may only use an official source whose exact extracted rule is reviewed for current applicability. Evidence states are `VERIFIED`, `NEEDS_REVIEW`, and `RETIRED`. A live list, quota, or discretionary legal/factual concept remains review-bound even when the parent scheme is verified.

## Registry

| Evidence ID | Route | Verified extraction | Status |
|---|---|---|---|
| `EVID-HK-TTPS-001` | `HK_TTPS_A` | ImmD Guidebook ID(E)1026 (04/2026): annual income at least HK$2.5m (or equivalent) in year immediately preceding application. Annual income means taxable employment/business income including salary, allowances, stock options and profits from self-owned companies; personal-investment income is excluded. | `VERIFIED` |
| `EVID-HK-TTPS-002` | `HK_TTPS_B` | Degree graduate of an eligible university with at least 3 years qualifying work experience over the preceding 5 years. Relevant work experience is full-time employment or self-employment after graduation. | `VERIFIED` |
| `EVID-HK-TTPS-003` | `HK_TTPS_C` | Eligible-university degree graduate in the preceding 5 years with less than 3 years qualifying work experience; subject to annual first-come-first-served quota. Excludes non-local students who obtained undergraduate qualification in a full-time locally accredited HK programme. | `VERIFIED_WITH_LIVE_CHECK` |
| `EVID-HK-TTPS-004` | `HK_TTPS` | Scheme does not apply to nationals of Afghanistan, Cuba, or DPR Korea. Applicants under a talent scheme at application time or within prior six months also face additional extension-style conditions stated in the guidebook. | `VERIFIED` |
| `EVID-HK-TTPS-005` | `HK_TTPS_EXTENSION` | Initial stay normally 36 months for A and 24 months for B/C. Extension requires proof of HK employment with stable income or establishment/joining of a HK business. Filing may be made within 3 months before expiry; guidebook advises in all circumstances at least 6 weeks before expiry. | `VERIFIED` |
| `EVID-HK-TTPS-LIST-001` | `HK_TTPS_B/C` | Eligible-university aggregate list is externally maintained by Government and must be live/version checked; it must not be permanently hard-coded. | `NEEDS_REVIEW` |
| `EVID-HK-QMAS-001` | `HK_QMAS_GPT` | Current QMAS General Points Test uses 12 assessment criteria under six aspects: age, academic qualifications, language proficiency, work experience, annual income and business ownership. Only applicants meeting the prevailing threshold can submit. | `VERIFIED` |
| `EVID-HK-QMAS-002` | `HK_QMAS_GPT` | Verified visible criteria include: age <=50; eligible-university master/doctorate; eligible-university STEM master/doctorate; two-language proficiency; English proficiency; >=5 years graduate/specialist experience; >=3 years in MNC/reputable enterprise; >=3 years in specified fields/industries; >=2 years international exposure; annual income >=HK$1m in immediately preceding year. Remaining business-ownership/current threshold definitions must be bound to live official material before runtime. | `VERIFIED_PARTIAL` |
| `EVID-HK-QMAS-003` | `HK_QMAS_ABPT` | Achievement-based route is for exceptional achievement or peer-recognised/significant contribution; requirements are intentionally high and should be evidence-reviewed rather than converted to probability. | `VERIFIED_ARCHITECTURE` |
| `EVID-HK-GEP-001` | `HK_GEP_EMPLOYMENT` | GEP professional route for non-Mainland residents includes a secured role relevant to qualification/experience, local-workforce considerations subject to facilitation measures, market-level remuneration, and good education/technical/professional background. | `VERIFIED` |
| `EVID-HK-GEP-002` | `HK_GEP_ENTREPRENEUR` | Investment as entrepreneur under GEP is for establishing/joining a HK business and explicitly does not apply to Chinese residents of the Mainland; also excludes nationals of Afghanistan, Cuba and DPR Korea. | `VERIFIED` |
| `EVID-HK-DEPENDANT-001` | `HK_DEPENDANT` | Dependants may be admitted for qualifying sponsors across listed employment/talent/investment/study schemes. Stay is generally linked to sponsor. Sponsor/relationship-specific criteria remain scheme-aware. | `VERIFIED_ARCHITECTURE` |
| `EVID-HK-EXT-001` | `HK_EXTENSION` | Extension must branch by current immigration scheme; there is no universal renewal score. | `VERIFIED_ARCHITECTURE` |
| `EVID-HK-ROA-001` | `HK_ROA` | Right-of-abode/permanent-residence analysis must distinguish legal category and ordinary residence. A seven-year calendar span alone is not an automatic approval rule. | `VERIFIED_ARCHITECTURE` |
| `EVID-HK-ROA-002` | `HK_ROA` | Government materials recognise continuous ordinary residence of not less than seven years in relevant permanent-resident categories; non-Chinese applicants have additional statutory/declaration conditions. Ordinary residence remains factual/legal review, not a day-count-only engine. | `VERIFIED_PARTIAL` |

## Official source pointers

- TTPS Guidebook ID(E)1026 (04/2026): `https://www.immd.gov.hk/pdforms/ID(E)1026.pdf`
- TTPS/admission-schemes overview: `https://www.immd.gov.hk/eng/useful_information/admission-schemes-talents-professionals-entrepreneurs.html`
- QMAS FAQ: `https://www.immd.gov.hk/eng/faq/QMAS.html`
- QMAS assessment routes: `https://www.immd.gov.hk/eng/services/visas/assessment-routes.html`
- QMAS Guidance Notes ID(E)982: `https://www.immd.gov.hk/pdforms/id(e)982.pdf`
- GEP professionals: `https://www.immd.gov.hk/eng/services/visas/GEP.html`
- GEP entrepreneur: `https://www.immd.gov.hk/eng/services/visas/investment.html`
- Dependants: `https://www.immd.gov.hk/eng/services/visas/residence_as_dependant.html`
- Right of Abode eligibility: `https://www.immd.gov.hk/pdf/roa_eligibililty_en.pdf`

## Live-check bindings

The following cannot be frozen as eternal constants:

1. TTPS eligible-university aggregate list.
2. TTPS Category C quota availability.
3. QMAS prevailing passing threshold and any subsequently amended criterion wording.
4. Talent List / shortage-profession lists and facilitation measures.
5. Fees, processing times and operational submission instructions.

Runtime must store evidence version/effective date and return `HUMAN_REVIEW_REQUIRED` or `POTENTIAL_MATCH_EVIDENCE_REQUIRED` when a required live reference is unavailable.

## Implementation guard

- `VERIFIED`: deterministic screening may use the exact extracted rule.
- `VERIFIED_WITH_LIVE_CHECK`: deterministic core rule is usable only after required live reference resolves.
- `VERIFIED_PARTIAL`: only the explicitly extracted subrules may be used; unresolved parts remain blocked.
- `NEEDS_REVIEW`: no definitive policy-sensitive match/non-match.
- No source status authorises production deployment; Founder Gate and Gate 3 controls remain separate.