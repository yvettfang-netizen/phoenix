# Health Global/GBA GEO platform — Founder review

Task: PHOENIX-HEALTH-V30-GEO-PLATFORM-20261102. Date: 2026-11-02. Status: local candidate for visual and technical review; not a public launch.

## Scope and dependency

This is incremental work on Health V3.1, preserving its Hero, five services, six-step process, family planning and consultation preparation. Branch `codex/health-v30-geo-platform-20261102` starts at PR #33 head `5771c910f8d1bb507eabf0cc6a529f6f28774217`. Its Draft PR targets the PR #33 branch, not main, so the new diff does not duplicate that work. PR #33 and logo PR #30 remain open and unmerged. The last audited main is `259753248ff54b07fd9c52f270e45ae1c877bc09`.

Existing dirty Education and other worktrees were not overwritten. No migration, production deployment, database write or main merge was performed.

## Delivered candidate

- Six independent service entry URLs: existing family planning plus international patients, overseas Chinese returning, Shenzhen international/private medical information, Hong Kong/GBA coordination and international insurance claims administration.
- Six advantages before the existing services; overseas source markets are distinguished from Chinese care destinations. Cost comparison requires equivalent written quotes and makes no savings claim.
- Six content centres and twelve original bilingual guides with direct answers, applicability, substantive sections, scoped official sources, review dates and related links. The family centre reuses its existing page.
- Hospital resources and a Hyzen/深圳禾正医院 verification record. Public information, verified facts, approved recommendations and partnerships are explicitly different statuses.
- Independent consultation preparation; no automatic assessment handoff, real appointment submission, files, payment or patient-data storage.
- Paired canonical/hreflang, independent titles/descriptions/H1, server-rendered content, local JSON-LD checks, breadcrumb/internal links, draft-safe robots and sitemap. All content remains noindex.
- Actual Canonical default-versus-candidate mapping, future API contract, Family/Founder projections and permission gates documented separately.

The [URL register](HEALTH_GEO_URLS.md) contains 21 paired entities / 42 candidate URLs. The proposed HTTPS origin is `https://health.phoenixnova.com.cn`; Founder supplied the hostname, but TLS, DNS, hosting and live redirects have not been verified.

## Approved Chinese brand composition

Founder answered option **1** to the explicit approval request for PR #33's “official original-colour complete symbol + 凤启环球 Chinese typography” candidate. The composition is enabled on Chinese Health Header/Footer only on light surfaces. English retains the existing official horizontal PNG. Other business pages keep their existing defaults.

No image was redrawn, recoloured, cropped or overwritten; Chinese lettering is live typography beside the complete symbol. No favicon was enabled. No filter, border, shadow or painted background substitutes for transparency.

| Asset | Dimensions | SHA-256 |
|---|---|---|
| `/brand/official/v3/phoenix-nova-header@2x.png` | 1040 × 320 | `C566AA2813A1D08D02C71230C7E2360BA2C681A056F1A7FDB900C2A40396B4DA` |
| `/brand/official/v3/phoenix-nova-symbol-transparent.png` | 632 × 784, alpha | `EB2C03880227E5C840048D1F13DD030FE6182ED7DE6C201A3DF2704D5BCFF573` |

The retained original master SHA-256 is `A48513AA31039B0467C6322B64FF2ED69DC74CDA976C274B22328F70C8C7E45E`.

## Visual review

Before: [V3.1 review and screenshots](HEALTH_V31_FOUNDER_REVIEW.md).

After:

| View | Chinese | English |
|---|---|---|
| Full desktop Health | [1440 px](previews/health-geo/zh-1440-home.png) | [1440 px](previews/health-geo/en-1440-home.png) |
| Full mobile Health | [390 px](previews/health-geo/zh-390-home.png) | [390 px](previews/health-geo/en-390-home.png) |
| Desktop guide | [Chinese](previews/health-geo/zh-1440-guide.png) | [English](previews/health-geo/en-1440-guide.png) |
| Mobile guide | [Chinese](previews/health-geo/zh-390-guide.png) | [English](previews/health-geo/en-390-guide.png) |
| Hospital verification desktop | [Chinese](previews/health-geo/zh-1440-hyzen.png) | [English](previews/health-geo/en-1440-hyzen.png) |
| Hospital verification mobile | [Chinese](previews/health-geo/zh-390-hyzen.png) | [English](previews/health-geo/en-390-hyzen.png) |

Chinese logo details: [desktop Footer](previews/health-geo/zh-1440-footer.png), [desktop Header](previews/health-geo/zh-1440-header.png), [mobile Footer](previews/health-geo/zh-390-footer.png), [mobile Header](previews/health-geo/zh-390-header.png).

Local preview while the task's preview process is running: `http://127.0.0.1:4430/zh/health` and `/en/health`. Port 4430 has the Compass preview OFF; separate test-only port 4431 is ON. This does not change a production flag.

## Verification evidence

The evidence builder refuses to package failed suites. Final counts are recorded in [browser-results.json](previews/health-geo/browser-results.json), with protected-source hashes in [integrity.json](previews/health-geo/integrity.json).

Local verification includes build, TypeScript, lint, 22 pure model/contract/GEO tests, 205 GEO browser checks and both states of landing/family browser regression. Widths cover 320, 390, 768, 1024 and 1440 px, plus original regression widths. It checks real routes, paired locale slugs, SSR without JavaScript, metadata, JSON-LD, horizontal overflow, complete brand proportions, disabled intake, no-answer transmission, robots and empty draft sitemap. Lint has zero errors and one existing unused `Bell` warning in `customer-center.tsx`.

Windows workerd's existing native startup failure requires the frontend-only Node preview adapter locally. That adapter is not evidence of a real API, PostgreSQL RLS or production runtime. GitHub Ubuntu CI must validate the actual Worker and complete original Compass suite on the current commit. CI state is reported separately in the PR, rather than inferred from local success.

The original 14-question source, gate, assessment component and both assessment route files are byte-identical to the baseline. The frozen Chinese content digest remains `df3c795277e63e972926da0bf6ec9aa0418cb7a65c164b180e8bdbf1882ada3d`. Existing six dimensions, skip behaviour, results and privacy boundaries are retained.

## Open verification and launch gates

1. **Hospital facts:** Hyzen's official website could not be retrieved reliably. Current licence, doctors, schedules, English service, rooms, quotations, insurance acceptance and booking capabilities are pending. This is a verification record, not a complete approved recommendation. No invented Hospital/PostalAddress schema or partnership badge is emitted. See [source scope register](HEALTH_GEO_SOURCES.md).
2. **Schema and discovery:** JSON-LD parses and its local structure/visible content are checked. External Google Rich Results Test and Schema Markup Validator have not been run against a public candidate. Search Console, Bing, live indexing, AI citation monitoring and submissions are not connected. Robots/noindex are crawl preferences, not authentication.
3. **Canonical/runtime:** default migrations 0001–0025 exist. Draft M0–M5 PRs contain candidate DDL 0026–0035, but acceptance/deployment is unproven; they must not be described as absent or authoritative production. Actual V7 deployed manifest/catalogue is EVIDENCE_MISSING. See [physical mapping and permission matrix](HEALTH_GEO_CANONICAL_MAPPING.md).
4. **Writes remain HOLD:** patient-level authorization, trusted session/ownership, Health consent binding, service-side RLS/audit, restricted medical file storage and approved API must be verified before persistence. Candidate contracts remain unable to authorize uploads, payment or OS ingestion, even with synthetic complete evidence. No second identity, family, client, project or payment system is created.
5. **Founder gate:** visual/content approval, hospital verification and explicit public release approval are still required. Do not merge main, deploy production, open the production Compass or submit these drafts to search engines as part of this PR.

## Change manifest

See [HEALTH_GEO_CHANGED_FILES.md](HEALTH_GEO_CHANGED_FILES.md) for the exact incremental file list. Existing screenshot and draft content evidence contains no patient data. Financial/budget/private operational material was not added to public content.
