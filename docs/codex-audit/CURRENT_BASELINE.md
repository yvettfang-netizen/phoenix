# Phoenix Family OS™ MVP Baseline V0.1

- Baseline date: 2026-08-15 (Asia/Shanghai)
- Package version: `0.1.0`
- Product: Phoenix Family OS™ Mini Program MVP V0.1
- Git revision: unavailable; neither the workspace nor project is a Git repository
- Verified checkpoint: `backups/Phoenix Family OS MVP V0.1 Pre-Development Checkpoint/`
- Source files: 99 files, 627,044 bytes, excluding reproducible `node_modules/`

## Architecture baseline

The application is a native WeChat Mini Program using WXML, WXSS, JavaScript, JSON, CommonJS modules, a Service/Repository boundary, and `wx` local storage under `PFS_DB_V01`.

```text
Page / Component
  -> Domain Service
  -> Repository or AI Provider
  -> wx local storage or deterministic local rules
```

No remote business API, cloud function, REST API, GraphQL API, or cloud database is currently used. `wx.login` performs a handshake but resolves to a local demo identity.

## Directory structure

```text
phoenix-family-os-mvp/
├─ app.js / app.json / app.wxss
├─ assets/
│  └─ brand/                         4 runtime PNG assets
├─ components/
│  └─ brand-mark/                    1 custom component
├─ data/                             Partner Experience configuration
├─ docs/                             architecture, schema, acceptance, preview
├─ models/                           schema and TypeScript contract
├─ pages/                            15 declared pages
├─ services/                         auth, session, store, repository, AI, analytics
├─ tests/                            Node assertions and static validator
├─ utils/                            date, ID and navigation helpers
├─ package.json / pnpm-lock.yaml
├─ project.config.json / sitemap.json
└─ tsconfig.json
```

## Page baseline

There are 15 pages declared in `app.json`.

### Family-facing pages

1. `pages/welcome/index`
2. `pages/home/index`
3. `pages/family-edit/index`
4. `pages/student-edit/index`
5. `pages/compass/index`
6. `pages/compass-questionnaire/index`
7. `pages/report/index`
8. `pages/timeline/index`
9. `pages/advisor-request/index`
10. `pages/mine/index`

### Advisor demo pages

11. `pages/admin-families/index`
12. `pages/admin-family/index`

### Partner Experience pages, outside the core closeout scope

13. `pages/partner/yuanchao/index`
14. `pages/partner/music-exploration/index`
15. `pages/partner/apply/index`

The tabBar contains Home, Family Timeline, and Mine.

## Components baseline

- Custom component count: 1
- Component: `components/brand-mark`
- Purpose: select the full or compact Phoenix Nova asset and the primary or light color treatment

## Runtime assets baseline

| File | Dimensions | Bytes | Runtime references | Status |
| --- | ---: | ---: | ---: | --- |
| `phoenix-nova-icon-light.png` | 141×207 | 27,093 | 1 | Present |
| `phoenix-nova-icon-primary.png` | 141×207 | 35,166 | 1 | Present |
| `phoenix-nova-logo-light.png` | 431×254 | 95,539 | 1 | Present |
| `phoenix-nova-logo-primary.png` | 431×254 | 114,538 | 1 | Present |

All four runtime assets are referenced through `components/brand-mark/index.wxml`. No missing or duplicate-hash Logo file was found. No alternate or legacy Logo path was found. Asset provenance still requires human confirmation before release and is marked `NEEDS HUMAN REVIEW`.

`docs/preview/partner-experience.png` is documentation-only and is not packaged as a runtime brand asset.

## Data baseline

The current schema defines 13 logical tables:

- `users`, `families`, `students`
- `assessments`, `reports`, `timelineEvents`
- `advisorNotes`, `advisorRequests`
- `partnerExplorations`, `partnerApplications`
- `analyticsEvents`, `partners`, `permissions`

The core ownership chain is Report -> Assessment -> Student -> Family -> User. Partner and Permission remain architecture-only placeholders.

## Current run status

| Check | Result | Evidence |
| --- | --- | --- |
| `pnpm test` | PASS, exit 0 | Core domain, Partner Experience and 15-page validation passed |
| `pnpm typecheck` | PASS, exit 0 | Current TypeScript scope passed |
| `pnpm build` | PASS, exit 0 | Static project validator passed |
| Full project JS syntax and JSON parsing | PASS, exit 0 | No parse failure |
| Route cross-check | PASS | 0 missing routes, 0 missing page files |
| Runtime asset path check | PASS | 4 references, 0 missing assets |
| `pnpm audit --prod` | PASS on 2026-08-13 | No known vulnerability reported; source and lockfile remain unchanged |
| WeChat DevTools CLI compile | NOT RUN | No CLI command or known installation path found |

The current shell does not expose `node` on PATH. Tests pass after temporarily adding the Codex workspace Node runtime to the command process. This is an environment issue, not a project test failure.

`pnpm build` is a static Node validator, not a WeChat compiler. Actual WXML/WXSS compilation remains unverified.

## Known issues

### P0

- A stored database with a different `schemaVersion` is treated as empty; `repository.initialize()` can subsequently save the empty database over the original local data.
- The local demo Advisor identity and plaintext family data are not suitable for public release. Real authentication, authorization and privacy controls are release blockers, not Sprint 1 product features.

### P1

- Report loading dereferences Assessment, Student and Family without validating every relation.
- A missing report leaves a blank page after a Toast instead of a recoverable error state.
- WeChat DevTools compilation has not been run.
- Global bottom safe-area handling is incomplete; the Compass fixed action area requires device and keyboard verification.
- Several direct `navigateBack()` calls have no empty-stack fallback.
- Phoenix Nova asset provenance requires human approval.

### P2

- Unsubmitted Compass answers are page-memory only and are lost after leaving or refreshing.
- TypeScript checks only the Partner Experience contract/configuration, not all page JavaScript.
- No dedicated lint command is configured.
- Small repeated form handlers and success-state styles exist; no large duplicate business file was found.
- Five page JSON files form two identical-hash configuration groups; this is legitimate declarative duplication, not an unused-file defect.

### P3

- Broader component extraction, full Advisor/Admin role separation, Portal membership, remote AI, dashboards and Partner permissions remain future architecture work and are not part of Sprint 1.
