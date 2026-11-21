# PR #77 0042 installation and authorization CI repair

**Date:** 2026-11-20 (Asia/Shanghai). **Status:** isolated PG16/17 candidate PASS; PR Draft; real identity and deployment HOLD.

## Fixed source and root cause

| Item | Evidence |
| --- | --- |
| Failing parent | PR #77 `380fec99da5151fd28b8a5d3a2acaaa7292d3c23`, [run 44708668551](https://github.com/yvettfang-netizen/phoenix/actions/runs/44708668551) |
| Raw failure | Both workspace jobs: `psql:/tmp/canonical-atomic.sql:331: ERROR: syntax error at or near "ELSE"`, `LINE 59: ELSE`; 0042 was not installed in those jobs. |
| Exact cause | `auth.protect_workspace_role_binding()` in the isolated 0042 SQL had `END IF;    END IF;` immediately before `ELSE`. The second `END IF;` closed the outer branch prematurely. |
| Correction | Remove the extra `END IF;`. The first local complete run then exposed `STAFF_TEACHER` receiving HTTP 200 for the Staff project projection, so `service.read_staff_workspace_projects()` now explicitly excludes that role and returns DENY. No historical Migration bytes were edited. |
| Code commit | [`b110c0c7fdcca6e14fda575dbfaeffdb51e6ae91`](https://github.com/yvettfang-netizen/phoenix/commit/b110c0c7fdcca6e14fda575dbfaeffdb51e6ae91) |
| 0042 SHA-256 | `9fdfef2a566eaa73fec98405e0d5d1ac5ea066c6319b0c2a5111482275562991`, matches the [manifest](../../../database/canonical/forward-candidates/workspace-authorization/manifest-0042-workspace-authorization.json) |

The first local rerun after the syntax fix reached ledger 38 on PG16/17, then failed the teacher negative assertion (`200 !== 403`). That failure was investigated and fixed; the check was not removed.

## Commands and measured result

```text
node database/canonical/verification/v0042/verify-source.mjs
PASS source inventory: 35 historical + byte-exact0036/0037, files=37; isolated combined candidate only, all SQL LF
PASS 0042 source guard sha256=9fdfef2a566eaa73fec98405e0d5d1ac5ea066c6319b0c2a5111482275562991 historical=37 reserved=0038-0041 default=OFF

cd "Phoenix Compass/education compass/server"
npm run typecheck    # exit 0
npm run build        # exit 0
npm test             # 148 pass / 0 fail / 0 skipped

node database/canonical/verification/v0042/acceptance.mjs 16
node database/canonical/verification/v0042/acceptance.mjs 17
PG16: PASS ledger=38 files=38 expected=38; tables=98; policies including auth=88; 20/20 groups PASS
PG17: PASS ledger=38 files=38 expected=38; tables=98; policies including auth=88; 20/20 groups PASS
```

Each acceptance starts an owned disposable container from formal 0001–0037, adds only isolated 0042, checks repeat execution, cross-organization and cross-principal denial, separate LOGIN credentials, one-use tickets, teacher denial, revocation, audit, checksum drift and atomic rollback, then removes its owned container. The [PG16](evidence/CI_FIX_LOCAL_PG16_ACCEPTANCE.json) and [PG17](evidence/CI_FIX_LOCAL_PG17_ACCEPTANCE.json) receipts were captured from the precommit working tree with the exact SQL SHA above; their `sourceState` remains `WORKING_TREE` by design. GitHub CI independently tested the committed tree.

## GitHub CI at fixed code commit

[Run 44719124928](https://github.com/yvettfang-netizen/phoenix/actions/runs/44719124928) completed successfully for exact HEAD `b110c0c7fdcca6e14fda575dbfaeffdb51e6ae91`:

| Job | Result | Evidence |
| --- | --- | --- |
| Source guard, scoped secret scan, backend typecheck/build/tests | PASS | [job 136230002813](https://github.com/yvettfang-netizen/phoenix/actions/runs/44719124928/job/136230002813) |
| PG16 fresh + negative acceptance | PASS | [job 136230495661](https://github.com/yvettfang-netizen/phoenix/actions/runs/44719124928/job/136230495661), artifact SHA-256 `0db9c899c6a86c87d1d8c618d2305a184ad08cac723ff0cdc52e0e6573250384` |
| PG17 fresh + negative acceptance | PASS | [job 136230495648](https://github.com/yvettfang-netizen/phoenix/actions/runs/44719124928/job/136230495648), artifact SHA-256 `574a5255d6aabb540c90e075a04a9c8fc3916363d7237476fbcaca0665f46bab` |

The machine-readable [CI result](evidence/GITHUB_ACTIONS_PG16_PG17_RESULT.json) records the exact jobs and candidate digest. Other PR-wide checks were not all complete when this report was prepared; their status must be read from the current PR HEAD before any later gate.

## Scope and remaining gates

- 0042 contains only Headquarters and Channel organization kinds. Separate legal `core.organizations` retain separate membership and project attribution.
- Formal 0022 teacher identity, assignment and class access remain authoritative. No second teacher/student scope was added.
- Formal 0003/0012 context tickets and backend contexts remain the only temporary database context mechanism; 0042 adds a distinct browser workspace session digest.
- Formal 0035 remains the service-managed task-transfer authority. 0043 remains excluded.
- 0044 is a separate review-only Draft candidate in [PR #82](https://github.com/yvettfang-netizen/phoenix/pull/82); its parent 0042 SHA needs to be reconciled and retested after this fix.
- Real provider mapping, named nonproduction installation, independent approval, merge and deployment remain HOLD/NOT RUN. Jimson's single Academic Studio nonproduction receipt is defined by [PR #85 ticket](https://github.com/yvettfang-netizen/phoenix/blob/187c885d2613bbca3e80c22762ece2ab97db6973/docs/architecture/academic-studio-v21-p0-20261120/P0_1_JIMSON_NONPROD_TICKET.md); it does not authorize installing candidate SQL.
