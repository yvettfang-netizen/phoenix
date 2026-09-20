# Identity Compass Question Bank V1

Status: GATE 2 DESIGN — NOT PRODUCTION ELIGIBILITY
Version: `HK_IDENTITY_QBANK_2026_09_V1`

## Principles

- Sprint 1 Free 6 remains a lightweight intent classifier and is not silently upgraded to immigration eligibility.
- Full Analysis collects only fields required for deterministic route evaluation, evidence review, journey planning, or human review.
- Policy-sensitive questions are versioned and may be retired without rewriting historical assessments.
- Unknown / not sure is always a valid answer where documentary certainty is required.

## Layer A — Free 6 intent questions

Purpose: classify user intent only.

1. Current relationship with Hong Kong: not yet in HK / currently in HK / previously in HK / permanent resident.
2. Primary goal: come to HK / work or build business / bring family / extend current stay / plan permanent residence.
3. Applicant type: self / spouse / child / family planning together.
4. Current broad status: no HK status / employment or talent status / dependant / student / other or unsure.
5. Planning horizon: now / within 6 months / 6–24 months / long-term.
6. Main concern: route selection / eligibility evidence / family / renewal / seven-year journey / documents.

No route eligibility conclusion may be generated from Layer A alone.

## Layer B — Core identity and routing

- nationality / place of habitual residence
- Mainland Chinese resident flag
- current location
- current HK immigration status and scheme, if any
- current limit-of-stay expiry date
- principal applicant vs dependant
- prior HK talent/admission-scheme status within the preceding six months
- current employment / business / study situation in HK

## Layer C — TTPS

- annual taxable employment/business income in the immediately preceding year
- income evidence status
- institution awarding degree
- degree level and graduation year
- whether institution appears on current official eligible-university aggregate list
- full-time work experience accumulated after graduation
- work experience within the immediately preceding five years
- whether applicant was a non-local student obtaining an undergraduate qualification through a full-time locally accredited HK programme
- whether Category C quota availability requires live verification

## Layer D — QMAS

Prerequisite fields:
- age
- financial-support evidence for applicant/dependants
- good-character / serious-crime declaration
- language ability evidence
- educational / professional qualification evidence

General Points Test controlled criteria:
- age 50 or below
- eligible-university master/doctorate
- eligible-university STEM master/doctorate
- proficiency in two languages, written and spoken
- proficiency in written and spoken English
- >=5 years graduate/specialist work experience
- >=3 years graduate/specialist experience in MNC/reputable enterprise
- >=3 years in specified fields/industries
- >=2 years international-exposure work experience
- annual income >= HK$1 million in immediately preceding year
- business ownership criteria (must bind to current official definition)
- remaining current official criterion as defined by active ImmD evidence version

Achievement-based route:
- exceptional achievement award evidence
- peer recognition / significant contribution evidence

Any ambiguous documentary criterion returns evidence review, not an automated pass.

## Layer E — Employment / entrepreneur routing

Employment:
- secured HK job
- relevance to qualifications or experience
- role level / occupation
- remuneration
- employer and local-recruitment exception evidence where applicable

Entrepreneur:
- Mainland Chinese resident flag (hard routing boundary for GEP entrepreneur)
- education / technical / professional evidence
- business ownership / role
- business plan
- capital / resources
- local jobs / economic contribution indicators
- existing HK business operating evidence

## Layer F — Dependants

- sponsor scheme/status
- relationship to sponsor
- spouse / legally recognised partnership / unmarried dependent child as applicable under current official rules
- sponsor remains eligible and genuinely resident in HK where required
- sponsor limit-of-stay expiry

## Layer G — Extension / renewal

- current scheme
- expiry date
- employment in HK with stable income
- business established/joined in HK and operating evidence
- current remuneration / role evidence
- scheme-specific top-tier evidence where applicable
- dependant sponsorship continuity

## Layer H — Right of Abode / permanent residence journey

- Chinese citizen vs non-Chinese citizen
- lawful immigration history
- ordinary-residence periods
- absence periods and reasons
- continuous seven-year candidate window
- home / employment / family / habitual-residence evidence relevant to ordinary-residence review
- declaration fields required for non-Chinese applicants where applicable

The system may calculate dates and evidence gaps, but must not equate elapsed calendar time with a guaranteed Right of Abode outcome.

## Data minimisation

The questionnaire does not collect full passport numbers, full HKID numbers, bank account numbers, raw criminal records, or unnecessary document images in Gate 2. Documentary evidence is represented by controlled evidence status until Gate 3 consent/storage controls are authorised.