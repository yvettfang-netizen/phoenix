# Family OS｜Identity Journey V2.0

## Candidate policy source register

**As-of date:** 2026-11-28
**Status:** candidate / read-only source registry
**Owner:** Phoenix Nova Family OS Identity Journey
**Canonical enum status:** pending Canonical PostgreSQL audit

This register records official Hong Kong Immigration Department sources for the
identity-pathway candidates used by the Identity Journey V2.0 design. The
candidate keys and labels are exported from
`website/phoenix-nova-website-v5/lib/identity-journey-policy.ts`.

The registry is deliberately not an eligibility engine, legal opinion, case
record, reminder schedule, or source of truth for a person's status. It does
not persist an identity category, infer an approval, or calculate a date from a
generic policy rule. Before any candidate key is used in Canonical data, it
must be reconciled with the approved Canonical enum and the relevant case
documents.

## 1. Source review boundary

- Sources were checked on 2026-11-28 and are all official Hong Kong Immigration
  Department pages or documents unless explicitly marked as product
  governance.
- A page being marked `OFFICIAL_SOURCE_REVIEWED` means that the source was
  reachable and its scope was understood; it does not mean that every policy
  condition or a person's eligibility has been verified. Every rule currently
  carries `professionalReviewState: PENDING`; source review is not legal,
  immigration or professional approval.
- `registryVersion` is the stable schema snapshot identifier
  `identity-policy-registry-v1.1.0`; it is not an official policy version.
- `officialSourceRevisionDate` is null when the official source does not expose
  a revision date in this review. It is distinct from `sourceCheckedOn`, which
  records when this registry was checked.
- `professionalReviewState` is a separate gate from source review. It remains
  `PENDING` until the designated policy professional records an approval with
  an explicit scope; no current rule is marked approved by this candidate
  implementation.
- `effectiveFrom` and `effectiveTo` are null unless a formal date was verified
  in an official source. The only historical dates intentionally recorded in
  this candidate register are the New CIES launch date (2024-03-01) and old
  CIES suspension date (2015-01-15).
- The register does not encode initial stay durations, common extension
  durations, historic approval terms, or an assumed re-entry period. Actual
  dates must come from an approved case document or an official case-specific
  window.

## 2. Official source index

| Topic | Official source | Registry scope | State |
| --- | --- | --- | --- |
| Visas / entry permits index | [Immigration Department — Visas / Entry Permits](https://www.immd.gov.hk/eng/services/index.html) | Official index for admission, study, residence and related entry arrangements | `OFFICIAL_SOURCE_REVIEWED` |
| Admission schemes overview | [Admission Schemes for Talent, Professionals and Entrepreneurs](https://www.immd.gov.hk/eng/useful_information/admission-schemes-talents-professionals-entrepreneurs.html) | Cross-scheme navigation and policy context | `OFFICIAL_SOURCE_REVIEWED` |
| TTPS | [Top Talent Pass Scheme](https://www.immd.gov.hk/eng/services/visas/TTPS.html), [TTPS FAQ](https://www.immd.gov.hk/eng/faq/TTPS.html), [TTPS guidebook](https://www.immd.gov.hk/pdforms/ID%28E%291026.pdf) | TTPS_A, TTPS_B, TTPS_C | `OFFICIAL_SOURCE_REVIEWED` |
| QMAS | [Quality Migrant Admission Scheme](https://www.immd.gov.hk/eng/services/visas/quality_migrant_admission_scheme.html) | QMAS | `OFFICIAL_SOURCE_REVIEWED` |
| ASMTP | [Admission Scheme for Mainland Talents and Professionals](https://www.immd.gov.hk/eng/services/visas/ASMTP.html) | ASMTP | `OFFICIAL_SOURCE_REVIEWED` |
| GEP | [General Employment Policy](https://www.immd.gov.hk/eng/services/visas/GEP.html) | GEP and related dependant context | `OFFICIAL_SOURCE_REVIEWED` |
| Study | [Students](https://www.immd.gov.hk/eng/services/visas/study.html), [Guidebook for Entry for Study in Hong Kong (ID(E) 996)](https://www.immd.gov.hk/pdforms/ID%28E%29996.pdf) | STUDENT; qualifying school/programme, acceptance, sponsor/guardian and financial-support scope reviewed; case terms still require review | `OFFICIAL_SOURCE_REVIEWED` |
| IANG | [Immigration Arrangements for Non-local Graduates](https://www.immd.gov.hk/eng/services/visas/IANG.html) | IANG | `OFFICIAL_SOURCE_REVIEWED` |
| New CIES | [New Capital Investment Entrant Scheme](https://www.immd.gov.hk/eng/services/visas/newcies.html) | NEW_CIES | `OFFICIAL_SOURCE_REVIEWED` |
| New CIES (InvestHK) | [InvestHK New CIES resources](https://www.newcies.gov.hk/en/resources/), [InvestHK FAQs](https://www.newcies.gov.hk/en/resources/faqs/) | Financial-asset/investment verification and implementation hand-off context | `OFFICIAL_SOURCE_REVIEWED` |
| New CIES launch date | [Immigration Department — Capital Investment Entrant Scheme notice](https://www.immd.gov.hk/sc/services/hk-visas/capital-investment-entrant.html) | Verified launch date: 2024-03-01 | `OFFICIAL_SOURCE_REVIEWED` |
| Legacy CIES | [Suspension of Capital Investment Entrant Scheme](https://www.immd.gov.hk/eng/press/press-releases/20150114.html), [suspension FAQ](https://www.immd.gov.hk/eng/faq/suspension-of-the-capital-investment-entrant-scheme.html) | LEGACY_CIES; historical record only | `HISTORICAL_SCOPE_REVIEW_REQUIRED` |
| GEP(TP) / ASMTP(TP) | [Technical Professionals Stream](https://www.immd.gov.hk/eng/services/visas/TPStream.html) | GEP_TP, ASMTP_TP | `OFFICIAL_SOURCE_REVIEWED` |
| TechTAS | [Technology Talent Admission Scheme](https://www.immd.gov.hk/eng/services/visas/TECHTAS.html) | TECHTAS | `OFFICIAL_SOURCE_REVIEWED` |
| VPAS | [Vocational Professionals Admission Scheme](https://www.immd.gov.hk/eng/services/visas/vpas.html) | VPAS; page identifies the applicable pilot cohorts and scope | `OFFICIAL_SOURCE_REVIEWED` |
| Right of abode eligibility | [Eligibility for the Right of Abode](https://www.immd.gov.hk/eng/services/roa/eligible.html), [ROA application](https://www.immd.gov.hk/eng/services/right-of-abode-in-hksar/apply.html) | HK_BIRTH_RIGHT_OF_ABODE, HK_PERMANENT_RESIDENT | `OFFICIAL_SOURCE_REVIEWED` |
| ROA terms | [Meanings of Right of Abode and Other Terms](https://www.immd.gov.hk/eng/services/roa/term.html) | RIGHT_TO_LAND, UNCONDITIONAL_STAY, ordinary residence vocabulary | `OFFICIAL_SOURCE_REVIEWED` |
| ROA absence | [Right of Abode FAQ](https://www.immd.gov.hk/eng/faq/faqroa.html) | Absence circumstances; no universal statutory return cycle | `OFFICIAL_SOURCE_REVIEWED` |
| Re-entry condition | [Re-entry into Hong Kong](https://www.immd.gov.hk/eng/services/visas/re_entry_into_HK.html) | Non-permanent resident return depends on a valid permitted limit of stay and unchanged residence circumstances | `OFFICIAL_SOURCE_REVIEWED` |
| HKIC | [Identity Cards FAQ](https://www.immd.gov.hk/eng/faq/faq_hkic.html), [registration / replacement](https://www.immd.gov.hk/eng/services/hkid/reg_replace.html), [ROP 138 documentary guide](https://www.immd.gov.hk/pdforms/rop138.pdf) | HKIC age-11 and age-18 events, adult/permanent card records | `OFFICIAL_SOURCE_REVIEWED` |
| HKSAR passport | [Application for HKSAR Passport](https://www.immd.gov.hk/eng/service/travel_document/apply_for_hksar_passport.html), [Travel Documents FAQ](https://www.immd.gov.hk/eng/faq/hk-travel-doc.html) | Passport management separate from identity, residence and stay records | `OFFICIAL_SOURCE_REVIEWED` |

## 3. Candidate pathway coverage

The following exact candidate keys are exposed by the TypeScript registry. They
are intentionally separate from the Canonical enum audit and may not be
persisted as synonyms until the audit is complete.

| Candidate key | Bilingual label | Primary source / rule | Review note |
| --- | --- | --- | --- |
| `TTPS_A` / `TTPS_B` / `TTPS_C` | 高才通 A／B／C 类 / Top Talent Pass Scheme Categories A/B/C | TTPS official page and FAQ | Category is retained, but no generic stay period is stored |
| `QMAS` | 优秀人才入境计划 / Quality Migrant Admission Scheme | QMAS official page | Current criteria require case review |
| `ASMTP` | 输入内地人才计划 / Admission Scheme for Mainland Talents and Professionals | ASMTP official page | Keep separate from GEP and technical stream |
| `GEP` | 一般就业政策 / General Employment Policy | GEP official page | Employment, sponsor and dependant facts are separate |
| `STUDENT` | 学生身份（教育／学习） / Student status | ImmD Students page and ID(E) 996 (11/2025) guidebook | Current source scope reviewed; no generic stay duration encoded |
| `IANG` | 非本地毕业生留港／回港就业安排 / IANG | IANG official page | Graduation, work and case dates require review |
| `NEW_CIES` | 新资本投资者入境计划 / New CIES | New CIES official page | Separate from legacy CIES and ROA; launch date verified |
| `LEGACY_CIES` | 资本投资者入境计划（历史记录） / Legacy CIES | Suspension notice and FAQ | Historical-only; do not rewrite with New CIES |
| `HK_BIRTH_RIGHT_OF_ABODE` | 香港出生及相关居留权路径 / Hong Kong birth and related ROA pathway | ROA eligibility and FAQ | Birth, parent status and nationality require human review |
| `DEPENDANT` | 受养人身份 / Dependant status | Scheme pages and dependant policy context | Sponsor and dependant dates are independent |
| `HK_PERMANENT_RESIDENT` | 香港永久居民身份 / Hong Kong permanent resident status | ROA sources, HKIC and passport sources | Not automatically inferred from day counts |
| `RIGHT_TO_LAND` | 入境权／居留权相关状态 / Right to land | ROA terms and FAQ | Separate from ROA and unconditional stay |
| `UNCONDITIONAL_STAY` | 无条件限制逗留 / Unconditional stay | ROA terms | Status vocabulary, not a generic duration |
| `TECHTAS` | 科技人才入境计划 / TechTAS | TechTAS official page | Quota and case conditions require review |
| `VPAS` | 职业专业人士入境计划 / VPAS | VPAS official page | Pilot/cohort scope requires review |
| `GEP_TP` / `ASMTP_TP` | GEP／ASMTP 技术专才类别 / Technical Professionals Stream | TPStream official page | Keep as distinct candidates pending enum audit |
| `OTHER` | 其他待核验身份类别 / Other pending verification | ImmD entry index | Catch-all only; must be resolved before persistence |

## 4. Mandatory interpretation safeguards

### 4.1 No generic stay-period rule

The official pages can contain scheme-specific periods, processing statements or
current arrangements. The application must not copy any such value into a
person's identity history. A person's actual first-entry deadline, permitted
stay, extension window or document expiry must be sourced from the verified
case document and stored as a case fact. Historical approved terms remain
historical facts.

### 4.1a Policy version and source audit metadata

Each exported rule carries:

- `registryVersion: identity-policy-registry-v1.1.0`, the stable snapshot
  version of this candidate registry;
- `sourceCheckedOn: 2026-11-28`, the date this implementation checked the
  official URL; and
- `officialSourceRevisionDate` and `officialPolicyVersion`, which remain
  `null` unless the official source itself exposes a revision/version value.
- `professionalReviewState`, which is currently `PENDING` for every rule and
  must not be inferred from `sourceVerified` or `reviewedState`.

These fields must not be interpreted as a legal effective date. For example,
the study guidebook explicitly identifies `ID(E) 996 (11/2025) 2-4`, so the
Student rule records that document version and `2025-11`; the Legacy CIES FAQ
displays a page date of `2022-11-29`, which is recorded as source metadata and
not as a policy commencement date. Every rule also exposes a bilingual
historical-scope statement; an unknown scope remains a human-review item.

### 4.2 Right of abode, right to land and unconditional stay are separate

The Immigration Department's terminology page describes right of abode and
right to land as distinct rights, and an unconditional-stay status is not a
replacement for either. The registry therefore has separate candidate keys and
rules. No pathway key implies another pathway key.

### 4.3 Absence and ordinary residence

The ROA FAQ identifies circumstances relevant to loss or retention of status.
There is no single uniform statutory “return every X days” cycle to encode.
Family OS may show recorded presence/absence facts and evidence gaps, but it
must not equate accumulated days with ordinary residence or automate a
permanent-residence conclusion.

### 4.4 HKIC age milestones

The official HKIC pages distinguish registration at age 11 and adult-card
replacement at age 18. These are separate document events, not eligibility
outcomes. The registry does not treat a reminder for an age milestone as proof
of residence, nationality or permanent-resident status.

### 4.5 Passport management

The HKSAR passport is managed separately from visa/entry status, right of abode,
permanent identity card and permitted stay. Submission of a passport
application is not an approval. The passport rule therefore requires human
verification of the official application evidence.

### 4.6 Historical CIES and New CIES

The legacy CIES candidate is retained only to preserve historical records. The
official notice records suspension from 2015-01-15; the official Chinese
Immigration Department page records the New CIES launch on 2024-03-01. Existing
historical cases must be assessed against their own approval and transitional
documents. The New CIES rules must not overwrite the legacy case.

The official legacy CIES FAQ further distinguishes the transitional scope: an
application received before 2015-01-15 remains within the scheme's handling,
including approved, approval-in-principle and pending applications; after the
suspension date, the transitional route required at least HK$10 million in
permissible assets made within the six months immediately before the suspension
date and an application within six months of the investment, subject to the
other scheme conditions. The FAQ also states that, absent approval-in-principle,
investment completed on or after the suspension date is not accepted. These
facts are recorded only as historical review context; the registry does not
calculate or decide a CIES case.

### 4.7 Reminder gate

No reminder is automatically scheduled unless an authorised person has verified
the case-specific window and the user has an applicable consent/channel
authorisation. Policy updates must not rewrite a verified case fact. Date
changes, cancellation, revocation, time zone, leap-year handling and delivery
receipts belong to the reminder/event layer, not this source registry.

## 5. Pending Canonical and professional review

Before this registry is connected to Family OS, CRM, Service Project or
Founder-facing summaries, the following gates remain open:

1. Compare every candidate key with the approved Canonical identity enum and
   collapse duplicate synonyms without creating a second master-data set.
2. Confirm the application data contract for person, family, member, sponsor,
   dependant, document, approval and case-window references.
3. Confirm the approved document service, patient/family consent boundary and
   audit event names before any document or date is persisted.
4. Obtain professional review for the current interpretation of immigration
   policy and any historical cases.
5. Keep production reminders and external notifications disabled until the
   case-window, consent, delivery and revocation controls pass review.

Until those gates are closed, this document and the TypeScript registry are
read-only design evidence and not a public immigration eligibility service.
