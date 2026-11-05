# P1 execution evidence

Task: PHOENIX-P1-INTEGRATION-COMPLETION-20261106.

Implemented candidate: existing Customer Session verifier → server-owned
CustomerCanonicalProvider port → existing P0 opaque session/API → PostgreSQL
authorization. Missing real provider/mapping remains HOLD. No production flag
or localhost/development check was removed. Normal customer mode cannot fall
back to the synthetic workbench cookie.

Summary candidate0039 is separate from active migrations and reuses P0
projects/tasks/subjects/assignments/milestones/events. Health free-text progress,
milestones and task counts are suppressed. The website validates exact keys,
scalar types, expiry, links and pagination, not merely JSON shape.
Family Center adds service/next-step/progress/Compass overview; detail and task
links reuse P0 routes. Task/event URL fragments select the existing P0 tab.

## Completed local checks

- npm ci with existing lockfiles: website638 packages; backend19 packages.
- Website build via existing Git Bash wrapper: exit0, all five phases.
- Website TypeScript and scoped BFF lint: exit0.
- 19 related website contracts:19 PASS,0 FAIL,0 SKIP (normal loopback access).
- Backend TypeScript and build: exit0.
- Backend complete suite:146 PASS,0 FAIL,0 SKIP.
- Immutable source verifier: original35 + byte-exact0036/0037 and0038 candidate PASS.
- 0039 manifest/contract check: PASS.

## Failures and limits retained

The initial sandbox run of the unchanged canonical-session HTTP regression
returned503 rather than200 because local loopback access was restricted.
The same test passed when rerun with normal local network permission; no source
or assertion change was made for that result.

Git Bash's first sandbox build failed creating its Windows shared-memory object.
The existing build wrapper passed with normal execution permission.

Full Windows website tests were attempted, without skipping or removing tests.
workerd raised native access violations/stack overflow and the run stopped making
progress. It was terminated via its owned exec session; result is FAILED/INCOMPLETE,
not PASS. Raw local output: website/phoenix-nova-website-v5/p1-full-test.log.
There was an initial UI lint error for synchronous state updates in an effect.
The effect now schedules the first read outside the effect body; scoped lint and
typecheck pass.

The backend worker's sandbox test attempt encountered local listen EACCES;
the primary agent reran the complete suite with loopback permission and obtained
146/146. Those failed attempts are not evidence of a passing sandbox execution.

No local Docker/PostgreSQL executable was available. Isolated GitHub Actions
is the PG16/17 authority. Retained diagnostics and repairs:

- Run42077738490: incomplete Node action pin prevented setup; corrected to
  the same full SHA used by existing repository workflows.
- Run42078383886: root TypeScript loader import lacked its relative prefix;
  corrected to `--import ./website/...`.
- Run42079592373: PostgreSQL found a surplus closing parenthesis in candidate
  0039; corrected and refreshed its manifest. Historical migrations unchanged.
- Run42080294005: PostgreSQL accepted0039 and verified distinct identities, then
  rejected a fixture that attempted an invalid terminal-grant transition. The
  fixture now supplies valid termination provenance, inserts new Identity
  projects and uses a separate no-service principal; immutable history remains.
- Run42082259584: real PG16 API suite passed. Browser bundling failed to
  resolve React from a virtual adapter namespace; fixed resolveDir and verified
  actual component bundling locally.
- Run42083303242 at `7af1e0b28ebdccd5497623702a928c521ceff385`: actual synthetic
  D1→HTTP BFF→PG16/17 API acceptance passed on both versions. Browser job failed
  when a CommonJS module namespace did not expose Chromium as a named export.
  The pinned Playwright ESM loader was fixed and locally smoke verified. Those
  API successes do not make the failed browser jobs PASS.
- Run42085774094 rendered the synthetic client A page at1440 and390 from
  actual PostgreSQL data, then caught an overview link without the task
  fragment. The next-step link now opens the existing Tasks view directly.
  The mobile screenshot also exposed overlapping legacy navigation labels;
  P1 now shows only Overview, My Services and Account & Security.

The isolated browser harness mounts the actual Family Center and Workbench
components with link/image adapters, real D1 login cookies and authorized
PostgreSQL data. It is not a built Worker deployment or Sites Staging test.

## Gates

First layer: use the final exact-HEAD CI/artefact receipt linked from
[Draft PR #61](https://github.com/yvettfang-netizen/phoenix/pull/61).
The diagnostic results above do not substitute for current acceptance.
Second layer real identity Staging: BLOCKED; see CONTRACT_AND_RELEASE_GATE.md.
P0 independent acceptance: HOLD; see P0_INDEPENDENT_REVIEW_PACK.md.
No PR merged, deployment, production migration, real customer import, DNS/domain
change or production indexing action occurred.

The PR description binds the current full SHA, CI runs and screenshot artefacts.
