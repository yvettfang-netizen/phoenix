# Phoenix Nova™ Education V2.0 — logical data and GEO contract

**任务编号：** `PHOENIX-EDUCATION-V20-GEO-PLATFORM-20261102`
**状态：** D — logical contract / no migration
**Scope:** language-neutral education entities, sourced facts, public search, GEO content, publication state, consent boundary and monitoring.
**Source brief:** Founder Education V2.0 and GEO 11.1–11.10 instructions.
**Implementation rule:** this document does not assert that any listed table, API, index, sitemap, metric or OS integration exists.

## 1. Contract invariants

1. Every university, school, faculty, department, programme, curriculum, qualification, admission cycle and education article has one language-neutral `entity_id`. Chinese and English pages are localized views of the same entity, not duplicate master data.
2. Every material fact is traceable to a source record, an academic year or effective period where relevant, a retrieval timestamp, a human review decision and a review/expiry date.
3. A route slug, display name, translation or search result never creates a student, customer, family, member, contract or service project.
4. Institutional facts and Phoenix-authored planning explanations are stored and reviewed separately. Phoenix must not present itself as a school, university, awarding body or admissions authority.
5. Candidate content is noindex and excluded from sitemaps. Only approved content on an approved domain can be indexable.
6. Search-crawler discovery and model-training crawling are separate Founder decisions. `OAI-SearchBot` permission does not imply `GPTBot` permission.
7. Metrics are reported only from an actual configured telemetry source and time range. No reach, ranking, citation or conversion number is invented.

## 2. Authority and provenance model

### 2.1 Source authority levels

| Level | Source | Permitted use |
|---|---|---|
| `S1` | Hong Kong Education Bureau, official university admissions/course pages, government authority | school, institution, admission, course, policy facts |
| `S2` | Hong Kong Qualifications Framework and statutory/recognised bodies | qualifications, recognition and framework facts |
| `S3` | official institution notices, prospectuses and formal PDFs | fee, deadline, requirements and cycle-specific details |
| `S4` | credible education organisations and professional publications | background and contextual explanation, never a substitute for current requirements |
| `S5` | community discussion or parent experience | experience context only; not a policy, fee or eligibility source |

When sources conflict, the current authoritative source wins and the conflict is retained in review notes. AI may assist extraction or draft wording; a human must approve the published fact.

### 2.2 Required source record

The logical source record is deliberately explicit. It may later map to an existing content/source catalogue; this document does not create a database table.

| Field | Required | Meaning |
|---|---:|---|
| `source_id` | yes | stable source record ID, not a person ID |
| `authority_level` | yes | `S1`–`S5` |
| `publisher_name` | yes | named authority or institution |
| `source_title` | yes | page, prospectus, notice or dataset title |
| `source_url` | yes | direct URL where available; no fabricated link |
| `retrieved_at` | yes | when Phoenix obtained the source |
| `published_at` | conditional | source publication date |
| `academic_year` | conditional | e.g. `2026/27` when the source is year-bound |
| `effective_from` / `effective_to` | conditional | policy, fee, cycle or validity interval |
| `content_hash` | recommended | evidence that a reviewed source version has not silently changed |
| `human_reviewer_id` | required before publish | approved reviewer identity from the governance system; pending until assigned |
| `reviewed_at` | required before publish | human review timestamp |
| `review_due_at` | required before publish | next source check date |
| `status` | yes | `candidate`, `verified`, `expired`, `superseded`, `rejected` |
| `review_notes` | conditional | conflict, assumptions, translation or limitation |

No page may display a cycle-specific deadline, fee, requirement, recognition, ranking, acceptance-rate or “current” label without the appropriate source and period fields.

## 3. Language-neutral entity model

### 3.1 Entity envelope

Every entity has the following logical envelope:

```text
entity_id                  stable, language-neutral identifier
entity_type                University | School | Faculty | Department |
                           Programme | Curriculum | Qualification |
                           AdmissionCycle | EducationArticle | District
official_name.zh / .en     official localized names when supplied
aliases[]                  reviewed aliases; locale + source required
official_acronym           only when the authority uses one
official_site_url           direct official site, if available
canonical_route.zh / .en    approved site routes, not merely a slug
status                     candidate | verified | expired | superseded | rejected
source_ids[]               provenance for the entity itself
created_at / updated_at    record history
```

The envelope is a contract, not an instruction to create a new application database. An implementation may map it to an approved canonical content registry or a future read model.

### 3.2 Required relation graph

Relations are typed and source-backed; keyword similarity cannot create a relation.

| Relation | Cardinality | Example |
|---|---|---|
| `UNIVERSITY_HAS_FACULTY` | 1 → many | University → Business Faculty |
| `FACULTY_HAS_DEPARTMENT` | 1 → many | Faculty → Finance Department |
| `DEPARTMENT_OFFERS_PROGRAMME` | 1 → many | Department → MSc Finance |
| `PROGRAMME_HAS_ADMISSION_CYCLE` | 1 → many | MSc Finance → 2027/28 intake |
| `PROGRAMME_AWARDS_QUALIFICATION` | many → one/many | Programme → Master |
| `PROGRAMME_ACCEPTS_CURRICULUM` | many ↔ many | Programme → DSE / IB / A-Level (only if sourced) |
| `SCHOOL_OFFERS_CURRICULUM` | many ↔ many | School → IB DP |
| `SCHOOL_LOCATED_IN_DISTRICT` | many → one | School → Sha Tin |
| `ARTICLE_ABOUT_ENTITY` | many ↔ many | guide → school/programme/cycle |
| `PATHWAY_RELATES_TO` | many ↔ many | DSE → Hong Kong undergraduate route |

Each relation has `relation_id`, `from_entity_id`, `relation_type`, `to_entity_id`, `source_ids[]`, `effective_from/to`, `status`, `review_due_at` and a human reviewer before public use.

### 3.3 School dimensions are orthogonal

The school index must not use one overloaded `school_type` field. Store independently sourced facets:

| Dimension | Example values |
|---|---|
| `education_stage` | kindergarten, primary, secondary |
| `funding_model` | government, aided, DSS, private, self-financing |
| `operating_model` | non-profit, private independent, international, other |
| `legal_or_recognition_status` | authority-defined values only |
| `curriculum_labels[]` | DSE, IB PYP/MYP/DP/CP, A-Level, IGCSE, AP, national curriculum |
| `district` | Hong Kong's 18 districts, sourced |
| `teaching_languages[]` | sourced language values |
| `coeducation` | co-ed, boys, girls, not stated |
| `fee_band` | display only if a year/currency/source is attached |
| `entry_age_band` | display only if a source is attached |
| `admission_cycle_ids[]` | current and historical cycles, status-aware |

The UI applies `AND` across dimensions and `OR` within one dimension by default. “International” must not imply private, non-profit, English-medium or any particular curriculum.

### 3.4 Programme and admission-cycle facts

A programme fact set can include `level` (undergraduate, taught postgraduate, MPhil, PhD, higher diploma, etc.), `study_mode`, `delivery_mode`, `discipline`, `entry_requirements`, `academic_background`, `language_requirements`, `fee_amount` + `currency`, `duration`, `intake_term`, `application_open_at`, `application_deadline_at`, `official_admissions_url`, `academic_year` and `source_ids[]`. Each value is period-bound and may differ across cycles.

The eight UGC-funded universities in the Founder brief are a required content backlog: HKU, CUHK, HKUST, PolyU, CityUHK, HKBU, LU and EdUHK. They must be verified against an official funding/recognition source before the funding label is published. Other local degree-awarding institutions are separate entities and must not be relabelled as “the eight”.

## 4. Canonical identity and consent boundary

### 4.1 No second master data

This contract does not define `students`, `customers`, `families`, `members`, `contracts`, `payments` or `service_projects` tables. The web content layer is anonymous by default.

Where an approved backend later provides identity, it may reference existing canonical IDs only:

```text
family_id, member_id, student_id, lead_id, consultation_id, service_project_id
```

The exact field names and mappings must come from the approved Canonical PostgreSQL/application contract. A URL slug, Compass report, article view or local browser ID must never be promoted to one of these IDs.

### 4.2 Separate consent events

| Activity | Consent boundary | Data allowed |
|---|---|---|
| browse public content | no account required | anonymous page request and technical telemetry only |
| Education Compass | existing Compass consent and gate | existing approved question/answer scope only |
| consultation request | separate consultation/lead consent | minimum contact and intent fields accepted by the approved endpoint |
| Family OS summary | explicit family/member/student authorization | minimum educational planning summary only |
| Founder OS operations | separate operational handoff authorization | source, stage, consultation status and service metadata; no raw student answers/docs by default |
| minor student data | guardian authority and any required student assent | only fields covered by the applicable consent |

The current website’s consultation demo and Education Compass web card must not be described as a production handoff. Family OS and Founder OS connections remain `HOLD` until the canonical identity, consent, server authorization, audit and RLS contract is approved.

## 5. Search contract (logical)

### 5.1 Request

```json
{
  "locale": "zh",
  "query": "string?",
  "entity_types": ["School", "Programme"],
  "facets": {
    "education_stage": ["secondary"],
    "funding_model": ["DSS"],
    "curriculum_labels": ["IB"],
    "district": ["Kowloon City"]
  },
  "academic_year": "2027/28?",
  "page": 1,
  "page_size": 20,
  "sort": "relevance|updated_at|name",
  "status": "APPROVED_PUBLIC"
}
```

The actual implementation must validate allowed facet values, bound `page_size`, reject identity or sensitive fields, and never allow a client to request `DRAFT_PRIVATE` records. There is no claim that this endpoint currently exists.

### 5.2 Response

```json
{
  "items": [{
    "entity_id": "language-neutral-id",
    "entity_type": "School",
    "name": "localized official name",
    "canonical_url": "approved canonical URL",
    "facets": {"education_stage": ["secondary"]},
    "source_freshness": {"last_verified_at": "timestamp", "review_due_at": "timestamp"},
    "publication_status": "APPROVED_PUBLIC"
  }],
  "page": 1,
  "page_size": 20,
  "total": 0,
  "search_contract_version": "education-search-v1"
}
```

The response must not expose private source notes, student/family IDs, raw assessment answers or internal reviewer credentials.

## 6. GEO page and JSON-LD contract

### 6.1 Page metadata

Every content page has logical metadata: `page_id`, `entity_id[]`, `locale`, `title`, `description`, `canonical_url`, `alternate_urls[]`, `publication_status`, `content_owner_id`, `professional_reviewer_id`, `first_published_at`, `last_substantive_update_at`, `last_verified_at`, `review_due_at`, `source_ids[]`, and `disclaimer`. Missing owner, reviewer or approved domain is a publication blocker, not a field to invent.

### 6.2 Visible answer-first content

Institution and programme pages should include the following when applicable: formal name, direct answer/summary, background, education features, qualifications/courses, eligibility, process, fees with year/currency, official links, real FAQ, related entities/paths, update record, editor/reviewer, and an optional Compass/consultation CTA. A page may omit an inapplicable field only by saying the field is not published or not applicable; it must not fill the gap with generated claims.

### 6.3 Schema mapping

| Page content | Allowed Schema.org type | Guard |
|---|---|---|
| Phoenix brand | `Organization` | do not mark Phoenix as a university |
| university | `CollegeOrUniversity` | match visible official facts |
| kindergarten/primary/secondary school | `School` | source recognition and name |
| education provider | `EducationalOrganization` | only where semantically correct |
| actual course | `Course` | course must be sourced and visible |
| guide/article | `Article` / `BlogPosting` | author and dates must be real |
| visible qualifying FAQ | `FAQPage` | no hidden/generated Q&A |
| hierarchy | `BreadcrumbList` | route and entity hierarchy must match |
| real site search | `WebSite` / `SearchAction` | only after the search endpoint exists |

Every JSON-LD entity uses the same language-neutral `entity_id` and approved canonical URL. Bilingual pages reference the same entity while carrying their own `inLanguage` and localized visible content. JSON-LD validation does not guarantee ranking or rich-result display.

## 7. Publication, canonical, sitemap and robots contract

### 7.1 Publication states

| State | `robots` | Sitemap | Canonical/hreflang |
|---|---|---|---|
| `DRAFT_PRIVATE` | noindex, nofollow | excluded | no production canonical |
| `CANDIDATE_REVIEW` | noindex, nofollow | excluded | preview-only URL; no production canonical |
| `APPROVED_PUBLIC` | indexable only after domain approval | included if real content | canonical + matching `zh-Hans`/`en` alternates |
| `EXPIRED` | noindex or reviewed replacement/redirect | excluded | replacement only after review |
| `SUPERSEDED` | noindex or reviewed replacement/redirect | excluded | replacement only after review |

Candidate sitemaps are not submitted to Search Console or Bing Webmaster Tools. The current candidate site remains private; no online submission is implied by this contract.

### 7.2 Sitemaps

When public approval exists, generate content-type maps such as `sitemap-education.xml`, `sitemap-schools.xml`, `sitemap-universities.xml`, `sitemap-programmes.xml` and `sitemap-guides.xml`, plus an index. Include only approved, non-empty, canonical pages. Exclude test, draft, admin, private family and student pages.

### 7.3 Hreflang

`zh-Hans` and `en` alternate links must point to corresponding localized pages for the same entity. `x-default` is emitted only if a real default-language route exists. An absent translation is not a reason to point every English URL at the Chinese homepage; omit the alternate or use an approved fallback policy.

### 7.4 Bot gates

| Bot | Meaning | Decision owner |
|---|---|---|
| Googlebot / Bingbot | search discovery/indexing | Founder + publication owner |
| OAI-SearchBot | ChatGPT search discovery | separate Founder gate |
| GPTBot | training-related crawl | separate Founder gate |
| other AI bots | vendor-specific | per-agent decision |

Robots rules are not access control. No gate may open private family, student, customer, internal or sensitive medical/education data.

## 8. GEO question library governance

Each real user question is a stable, language-neutral question record, not a keyword list:

```text
question_id              stable ID shared across translations
locale_variants[]        zh/en question text
intent                   information | comparison | eligibility | process | planning
entity_ids[]             entities actually answered
source_ids[]             official/supporting sources
answer_page_id           one independent page or module
status                   candidate | reviewed | approved | expired
content_owner_id         pending until assigned
reviewer_id              pending until assigned
review_due_at            mandatory before public approval
last_verified_at         mandatory before public approval
```

Question examples from the Founder brief include Hong Kong K1 age, government/aided/DSS/private distinctions, DSE versus A-Level, IB application to a Hong Kong university, associate degree progression, and taught versus research postgraduate study. The list is a backlog; no answer is publishable until its sources, academic year and reviewer are recorded. Do not manufacture FAQs merely to attract crawlers.

## 9. Monitoring and evidence contract

Monitoring is a later operational capability. Until an approved telemetry source is configured, all metrics remain `NOT_AVAILABLE`, not zero.

Candidate signals:

- HTTP status, crawl errors and server-rendered content availability;
- index/canonical/hreflang consistency;
- structured-data validation results;
- source freshness and overdue review count;
- Search Console/Bing query and index data when an approved account is connected;
- Bing AI citation reports when available;
- page views, search facet usage, Compass starts/completions and consultation clicks only with approved analytics and consent;
- publication-state violations (candidate URL reachable by an indexable sitemap, missing noindex, or private route leakage).

Every reported signal needs `metric_name`, `source_system`, `period_start`, `period_end`, `locale`, `entity/page scope`, `consent basis` where applicable, and collection timestamp. No claim such as “AI cited Phoenix” or “conversion increased” is valid without a source report and period.

## 10. Governance and expiry

Before an entity becomes public, assign:

- a content owner;
- a source/data reviewer;
- a professional/academic reviewer where the subject requires it;
- an approved domain/publication owner;
- an update cadence.

Suggested review cadence is annual for institution profiles and school facts, every application season for programmes and deadlines, immediately after an official policy/fee notice, and a shorter cadence for active admission cycles. Expired cycles must show their academic year and closed status or be replaced; changing only the visible “updated” date is not a valid review.

## 11. Verification matrix (not yet executed)

| Check | Expected evidence | Current status |
|---|---|---|
| one ID across zh/en | fixture/entity validation | design only |
| typed hierarchy and relations | relation validator + source IDs | design only |
| source freshness | academic year, retrieved/reviewed/expiry fields | design only |
| orthogonal school facets | multi-facet fixture, no type collapse | design only |
| candidate noindex | rendered metadata and sitemap exclusion | current hub evidence; child routes not built |
| approved canonical/hreflang | only public-state fixture emits tags | design only |
| JSON-LD visible-copy parity | schema validator and snapshot | design only |
| question library governance | missing source/reviewer blocks publish | design only |
| Compass regression | original question/rule tests unchanged | existing audit evidence; no new run claimed |
| no sensitive write | network/data-layer audit | design boundary; no write implemented |

## 12. Explicit holds and non-goals

- No new canonical database schema, migration or RLS policy is created here.
- No second student/customer/family/member/project data model is allowed.
- No public Education Compass URL, question rewrite, scoring change or result-engine change is proposed.
- No real school, university, programme, fee, deadline, ranking, admission probability, partnership or outcome is asserted without a verified source.
- No Family OS or Founder OS data write is implemented; both handoffs remain `HOLD`.
- No production domain, editor, reviewer, Search Console, Bing Webmaster Tools, bot policy or telemetry account is fabricated.
