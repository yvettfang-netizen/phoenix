# Phoenix Nova™ Education V2.0 — implementation architecture

**任务编号：** `PHOENIX-EDUCATION-V20-GEO-PLATFORM-20261102`
**状态：** D — design candidate / implementation preparation only
**审计基线：** `main@259753248ff54b07fd9c52f270e45ae1c877bc09`
**工作分支：** `codex/education-v20-geo-20261102`
**范围：** Education information centre, global admissions content, Education Compass entry, and GEO publication controls.
**非范围：** production deployment, database migration, public Compass activation, CRM handoff, Family OS/Founder OS write-back, or real student/customer data.

## 1. Executive decision record

Education V2.0 is an information and planning layer on top of the approved Education V3 visual page. It is not a second Education page and it is not a replacement assessment engine. The homepage remains the route `/zh/education` or `/en/education`; the future stage, institution, programme and guide pages are child routes of that hub.

The architecture deliberately separates four things:

1. **Facts** — institution, programme, qualification, admissions-cycle and policy facts with a source and validity period.
2. **Interpretation** — Phoenix-authored explanations and planning context, clearly labelled as guidance rather than an institution's promise.
3. **Assessment** — the existing Education Compass implementation and its existing gate, question bank, consent and result rules.
4. **Conversion** — a voluntary consultation request and, only after an approved service handoff, a canonical service project.

No part of this document asserts that the proposed content registry, search index, public domain, or database objects already exist.

## 2. Evidence from the current candidate

The following facts are evidence from the checked repository. They are not assumptions about an online release.

| Area | Evidence | Current classification |
|---|---|---|
| Education hub | `app/[locale]/education/page.tsx`, `components/education-landing.tsx`, `lib/education-content.ts` | A — implemented candidate page |
| Chinese/English hub routes | `/{locale}/education`, with `locale` restricted to `zh` and `en` | A — implemented candidate route |
| Current page index policy | `generateMetadata` on the Education page currently returns `robots: { index: false, follow: false, nocache: true }` | A — private-review safeguard |
| Education Compass | `docs/EDUCATION_V3_COMPASS_AUDIT.md` records an existing native implementation but no approved website public URL; the website card says the live entry is not connected | A/B — implementation exists elsewhere; public web gate is not approved |
| Academy / ASKWISE / booking / student / tutor links | `docs/EDUCATION_V3_PLATFORM_ROUTE_AUDIT.md` and `components/site-directory.tsx` record pending or preview-only surfaces | A — pending labels; no approved public links |
| Candidate-site boundary | `docs/WEBSITE_V5_CANDIDATE_BASELINE.md` marks V5 `ACTIVE CANDIDATE / PRIVATE REVIEW`, noindex/nofollow, production impact none | A — private-review boundary |
| Content entity registry, stage pages, institution pages and GEO sitemap | No approved runtime implementation was treated as present by this document | C — missing; design below is D |

The current worktree may contain other agents' uncommitted files. This work only adds the two design documents named in the task and does not reset, clean, delete or overwrite those files.

## 3. Product and route architecture

### 3.1 Hub and stage map

The hub should expose eight stage/content entrances. Each is a real child route only after the corresponding content has passed source and review gates; until then the hub must show a controlled “candidate / not yet open” state and must not link to a fake live page.

| Product area | Candidate route | Minimum content boundary | Initial status |
|---|---|---|---|
| 香港幼儿园 | `/{locale}/education/kindergarten` | K1–K3, scheme and school-search context, application guidance | B/C — approved direction; source set pending |
| 香港小学 | `/{locale}/education/primary-schools` | school types, allocation concepts, transfer and entry guidance | B/C — approved direction; source set pending |
| 香港中学 | `/{locale}/education/secondary-schools` | school types, DSE/IB/A-Level/AP context, entry and progression | B/C — approved direction; source set pending |
| 香港大学 | `/{locale}/education/hong-kong-universities` | recognised institutions, institution pages and programme index | B/C — approved direction; source set pending |
| 副学位与本科衔接 | `/{locale}/education/subdegree-articulation` | associate degree, higher diploma and progression explanations | B/C — approved direction; source set pending |
| 香港硕士与研究生 | `/{locale}/education/hong-kong-postgraduate` | taught, research and doctoral route explanations | B/C — approved direction; admission cycles pending |
| 国际课程与全球升学 | `/{locale}/education/global-education` | DSE, IB, A-Level, AP, IGCSE and destination/pathway context | B/C — approved direction; source set pending |
| 凤启学苑｜启明堂 | `/{locale}/education/academy` | public product description only unless a real Academy route is approved | B/C — existing surfaces are preview/pending |

The `locale` value is a presentation property, not a new entity identity. A Chinese and an English page for the same institution or programme share one language-neutral entity ID.

### 3.2 Institution and programme route patterns

The following patterns are implementation candidates, not live URLs:

```text
/{locale}/education/schools/{school-slug}
/{locale}/education/universities/{university-slug}
/{locale}/education/universities/{university-slug}/faculties/{faculty-slug}
/{locale}/education/programmes/{programme-slug}
/{locale}/education/curriculum/{curriculum-slug}
/{locale}/education/guides/{question-slug}
```

The route slug is not the authority. Each page resolves to a stable entity ID, checks publication state, and renders only the fields allowed by the source and reviewer. A slug change requires a reviewed redirect plan; it must not create a second entity.

### 3.3 User journey and boundaries

```text
Education hub
  → stage / school / university / programme / guide content
  → existing Education Compass gate (optional)
  → existing report or consultation path (only if approved)
  → user-selected professional service
  → canonical service project (future, after contract and consent)
  → authorised Family OS summary / Founder OS operational record (future HOLD)
```

The content layer may provide a consultation CTA without requiring an assessment. An assessment answer is never silently copied into CRM, Family OS or Founder OS. Consultation consent is a separate decision from assessment consent. Existing Compass question order, option codes, branching, result rules and privacy limits remain immutable in this task.

### 3.4 Institutional and service claims

* Official institutional facts must link to a current authoritative source.
* Phoenix can explain planning, comparison and coordination; it must not present itself as a university, school, examination authority or government body.
* A programme page may describe a requirement only for the named academic year/cycle and source. It may not promise admission, visa, scholarship, employment or a specific outcome.
* “International”, “private”, “non-profit”, “DSS”, “UGC-funded” and “self-financing” are not interchangeable labels. They are independent facts or dimensions.

## 4. Information retrieval architecture

### 4.1 Search surfaces

The first implementation should support server-rendered, linkable result pages and a deterministic search contract. It should not require a logged-in account or an assessment to read public facts. Search results must be limited to `APPROVED_PUBLIC` records; candidate or expired records are never returned by a public endpoint.

The search UI should cover:

- education stage;
- school or institution type;
- funding / operating / legal status;
- curriculum and qualification;
- district or geography;
- teaching language;
- co-education status;
- fee band, age band and study mode where sourced;
- intake / application cycle and deadline status;
- discipline, level and programme mode for higher education.

Across facet groups the default operation is `AND`; within one facet group it is `OR`. The UI must show active conditions, support clearing all conditions, return a stable empty state, and use bounded pagination. A search query is not a person identifier and must not contain student, family, passport, phone or CRM IDs.

### 4.2 Orthogonal school dimensions

The school index must store independent values rather than a single “school type” string. A school may therefore be private and non-profit, international and private, or have a curriculum label that does not imply funding or legal status. The dimensions are:

| Dimension | Examples | Rule |
|---|---|---|
| Stage | kindergarten, primary, secondary | one or more sourced stage facts |
| Funding model | government, aided, DSS, private, self-financing | source each value; do not infer from marketing language |
| Operating model | non-profit, private independent, international, other recognised model | independent from funding |
| Legal / recognition status | legal or statutory status from an authority | never inferred from “international” |
| Curriculum | DSE, IB PYP/MYP/DP/CP, A-Level, IGCSE, AP, national curriculum | many-to-many, with delivery stage and year |
| Geography | district, campus and address | source and effective period |
| Language | principal teaching language(s) | do not infer from school name |
| Co-education | co-ed, boys, girls, not stated | only display if sourced |
| Fees / age / admissions | fee band, entry age, open/closed cycle | period-bound facts, not evergreen labels |

### 4.3 Higher-education hierarchy

The higher-education browser must preserve this explicit hierarchy:

```text
University → Faculty / School → Department → Programme → AdmissionCycle
```

A programme may have more than one cycle, mode or intake. The same institution may have faculties with different names across languages; translated labels do not create new institutions. The eight UGC-funded university targets named in the Founder brief are a content backlog, not proof that data has already been imported or verified. Any additional Hong Kong institution must carry an explicit recognition/funding source and must not be called one of the eight UGC-funded universities unless the source supports that claim.

## 5. Content and GEO architecture

Each approved institution, programme or guide page should follow the shared answer-first template:

1. formal name and page purpose;
2. direct answer / summary;
3. institution background and location;
4. education or programme characteristics with source context;
5. qualifications and available courses;
6. eligibility / entry requirements by cycle;
7. application process and important dates;
8. fees with academic year and currency, when published by the source;
9. official source links;
10. real questions and answers;
11. related entities and pathways based on recorded relations;
12. last substantive update and validity state;
13. content owner and professional reviewer;
14. optional Education Compass or consultation CTA, with privacy boundary.

The page must contain readable server-rendered text, not only an image. Structured data must agree with visible copy. No ranking, review, acceptance-rate, employment, fee, deadline or accreditation statement may be invented.

### 5.1 Structured data boundary

Select Schema.org types from the actual page: `Organization` for Phoenix, `CollegeOrUniversity` for a university, `School` for a school, `EducationalOrganization` where appropriate, `Course` for a real course, `Article`/`BlogPosting` for a guide, `FAQPage` only when the visible FAQ qualifies, and `BreadcrumbList` for hierarchy. `WebSite` / `SearchAction` is allowed only after the search endpoint actually exists. Phoenix must not be marked as the institution providing a university course.

### 5.2 Search and AI crawler policy

Search discovery and model-training access are independent policy decisions:

| Agent family | Purpose | Gate |
|---|---|---|
| Googlebot / Bingbot | ordinary search indexing | Founder-approved public domain and publication gate |
| OAI-SearchBot | ChatGPT search discovery | separate Founder decision |
| GPTBot | training-related crawling | separate Founder decision; not implied by OAI-SearchBot |
| other AI crawlers | vendor-specific discovery/training | per-agent decision |

Robots directives are not authentication. No crawler policy may expose Family Center, student records, customer back office, internal dashboards, or sensitive assessment data. The current candidate stays private/noindex until a domain, editor, reviewer and publication owner are named and the public gate is approved.

## 6. Publication state machine

```text
DRAFT_PRIVATE
  → CANDIDATE_REVIEW
  → APPROVED_PUBLIC
  → EXPIRED or SUPERSEDED
```

| State | Index | Sitemap | Domain | Visible audience | Exit evidence |
|---|---:|---:|---|---|---|
| `DRAFT_PRIVATE` | noindex | excluded | local / protected preview only | author and reviewer | source records and draft content |
| `CANDIDATE_REVIEW` | noindex | excluded | preview/candidate only | nominated reviewer | completeness, source and language review |
| `APPROVED_PUBLIC` | indexable if domain gate is approved | included | approved public domain | public | content owner + source reviewer + Founder/publication approval |
| `EXPIRED` | noindex or reviewed redirect | excluded | approved domain may retain an expiry notice | public if policy requires | replacement/current source or explicit withdrawal |
| `SUPERSEDED` | noindex or reviewed redirect | excluded | approved domain | public only through replacement | replacement entity/version and redirect review |

Canonical and hreflang tags are emitted only for approved canonical URLs. A preview page must never emit a production canonical merely because it resembles the final URL.

## 7. Dependencies and decision register

| Dependency / decision | Owner needed | State | Evidence / next gate |
|---|---|---|---|
| Approved public domain and locale host policy | Founder / platform owner | E — pending | No approved production domain was supplied in this task |
| Content owner, source reviewer and professional/academic reviewer | Founder | E — pending | Names and coverage must be recorded before public indexability |
| EDB school source and definition dictionary | Content/data owner | C — not ingested in this work | Capture source URL, retrieval date and versioned field map |
| UGC / government / HKQF recognition sources | Content/data owner | C — not ingested in this work | Verify funding and recognition per institution |
| Official institution admissions and programme sources | Content/data owner | C — not ingested in this work | Establish cycle-specific records and expiry dates |
| Education Compass public URL and web handoff | Compass owner / Founder | B/C — implementation elsewhere, public gate missing | Reuse existing route only after the existing gate is approved |
| Canonical identity and consent contract | Jimson / data governance | B — boundary known, web write-back HOLD | Use existing `family_id`, `member_id`, `student_id`, `lead_id`, `consultation_id`, `service_project_id` only when provided by approved backend |
| Family OS summary handoff | Family OS owner | B/C — design only | Patient/student summary requires explicit consent and canonical identity |
| Founder OS CRM / service handoff | Founder OS owner | B/C — design only | Consultation authorization must be separate from assessment answers |
| Public search, OAI-SearchBot and GPTBot policy | Founder / security | E — pending | Search and training gates must be recorded separately |
| Analytics and AI citation telemetry | Product/analytics owner | C — no approved metrics source | Instrument only after consent/domain gate; do not report invented numbers |

### 7.1 Required approval order

1. Freeze this architecture and the data/GEO contract.
2. Register authoritative sources and reviewer ownership.
3. Build candidate pages and search fixtures with `CANDIDATE_REVIEW` / noindex.
4. Verify bilingual entity identity, source freshness, structured data and accessibility.
5. Obtain Founder publication-domain and crawler decisions.
6. Emit canonical, hreflang and sitemap entries only for `APPROVED_PUBLIC` pages.
7. Design (but do not implement here) canonical service and OS handoffs.

## 8. Implementation backlog and acceptance criteria

### Phase A — contract and fixtures

- implement the logical entities and relation validation from `EDUCATION_V20_DATA_AND_GEO_CONTRACT.md`;
- create source-backed fixtures only; mark unverified entities as candidate;
- add bilingual ID consistency and stale/expired-date tests;
- keep Compass question bank and result tests unchanged.

### Phase B — candidate content/search

- add child routes only for pages with content fixtures;
- render answer-first content server-side;
- add orthogonal facets, pagination, sorting and clear-all behaviour;
- keep candidate pages noindex and out of sitemaps;
- provide consultation CTA without auto-sending assessment answers.

### Phase C — publication gate

- human review of source facts, wording, links and structured data;
- verify canonical/hreflang pairs and HTTP status codes;
- approve domain and bot policy independently;
- submit only approved URLs to search tools.

### Required evidence before implementation is called complete

- route inventory and route-to-entity map;
- source record for every displayed institutional fact;
- reviewer and review-due date for every publishable page;
- bilingual page and JSON-LD validation;
- candidate noindex/sitemap exclusion test;
- Compass regression evidence showing no question/rule change;
- explicit statement that no database, CRM, Family OS or Founder OS write occurred.

## 9. Known risks and non-goals

- Admissions dates, fees and requirements expire; an old page must not be presented as current.
- Similar Chinese/English names can create duplicate institutions; language-neutral IDs and reviewed aliases are required.
- “International school”, “private”, “non-profit” and funding categories overlap; the search model must not collapse them.
- GEO may improve discoverability but cannot guarantee ranking, citation or inclusion by any AI system.
- No public URL, reviewer, domain, telemetry account or external data feed is fabricated here.
- No migration, API write path, student/customer table, Compass rewrite, crawler opening or production deployment is part of this design task.
