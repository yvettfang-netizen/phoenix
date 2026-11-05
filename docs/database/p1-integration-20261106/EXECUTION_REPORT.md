# P1 execution evidence — in progress

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
There was also an initial new UI lint error for synchronous setState in an effect;
it must be corrected and rerun before final candidate readiness.

The backend worker's sandbox test attempt encountered local listen EACCES;
the primary agent reran the complete suite with loopback permission and obtained
146/146. Those failed attempts are not evidence of a passing sandbox execution.

No local Docker/PostgreSQL executable was available in the inspected environment.
First-layer real PostgreSQL/D1/BFF and actual page/browser results must be supplied
by the new isolated CI; at this point they are NOT ESTABLISHED.

## Gates

First layer: IN PROGRESS; this document is not a success receipt.
Second layer real identity Staging: BLOCKED; see CONTRACT_AND_RELEASE_GATE.md.
P0 independent acceptance: HOLD; see P0_INDEPENDENT_REVIEW_PACK.md.
No PR merged, deployment, production migration, real customer import, DNS/domain
change or production indexing action occurred.

The final exact SHA, CI and screenshots will be recorded after verification.
