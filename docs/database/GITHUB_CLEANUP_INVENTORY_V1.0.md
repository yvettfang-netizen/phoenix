# Phoenix GitHub cleanup inventory V1.0

**Owner:** Jimson

**Inventory date:** 2026-10-30 (Asia/Shanghai)

**Main repository baseline:** `yvettfang-netizen/phoenix@2e00b2c`

No branch, repository, tag or release was deleted by this work.
The main repository is public; the private Canonical source remains retained.
The public copy passed a tracked-secret signature scan, but historical evidence
still exposes operational topology such as the isolated host address and
protected-file path names.

## Keep

| Repository/ref | Reason |
|---|---|
| `yvettfang-netizen/phoenix:main` | Main Phoenix integration line |
| `yvettfang-netizen/phoenix:codex/canonical-postgresql-mainline-copy` | Reviewable main-repository copy of the Canonical source and governance files |
| `yvettfang-netizen/phoenix-canonical-db:codex/canonical-postgresql-phase1@48bb6c3` | Verified provenance for migrations 0001–0025 and V1.28 evidence |
| Every origin branch with commits not reachable from `main` | Content has not been proven merged; deletion would risk loss |
| Versioned migrations, execution reports and raw synthetic evidence | Required audit trail; do not squash or rewrite applied migration history |

Unmerged branches observed on 2026-10-30 and therefore retained:

- `brand/phoenix-nova-logo-v3`
- `codex/core-identity-gates-0-1-delivery`
- `codex/education-founder-final-alignment`
- `codex/family-os-contract-prep-20260906`
- `codex/family-os-doc-baseline-and-ux-v0.2`
- `codex/family-os-synthetic-contract-validation-20260906`
- `codex/family-os-v7-core-alignment-20260912`
- `codex/fengqi-east-source-baseline`
- `codex/masters-intake-p0`
- `codex/website-phoenix-v5-digital-east`
- `codex/weekend-engineering-closeout-2026-08-29`
- `codex/wiswealth-family-office-sites-20261009`
- `feat/identity-compass-gate2-sprint`
- `feature/phoenix-health-landing-v1`
- `integration/family-os-sprint2-20260829`
- `migration/family-os-sprint2-20260829`
- `migration/wealth-compass-v0.1-20260829`

## Archive candidates

The following remote branch tips are already ancestors of `origin/main`.
Preserve their final SHA and merge/PR reference in an archive register before
removing any branch pointer:

| Branch | Final observed SHA | Main reachability |
|---|---|---|
| `codex/family-os-architecture-20260920` | `dcbb5fe` | Fully merged |
| `codex/v5-health-compass-integration-20260906` | `21b859f` | Fully merged |
| `codex/v5-unified-family-center-admissions-20260906` | `91608c1` | Fully merged |
| `feat/academy-phase1-shell` | `846f77c` | Fully merged |
| `integration/wealth-compass-v0.1-20260829` | `c8a18a9` | Fully merged |

## Pending deletion

No deletion is approved. After an archive register or immutable tag is created
and the owning worktree/automation is confirmed inactive, only the five fully
merged remote branch pointers above may move to **DELETE CANDIDATE**. Repository
deletion, history rewrite, force-push and evidence deletion remain prohibited.

The private `phoenix-canonical-db` repository must not be deleted until:

1. the main-repository copy is merged;
2. every copied file passes byte-for-byte verification;
3. build/test paths use `database/canonical/`;
4. a final private-repository snapshot is tagged;
5. Founder explicitly approves archival or deletion.
