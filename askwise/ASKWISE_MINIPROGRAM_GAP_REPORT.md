# ASKWISE Miniprogram Gap Report

Task: ASKWISE-MINIPROGRAM-V1-20261101
Date: 2026-11-01

| Priority | Gap | Evidence / smallest next action |
| --- | --- | --- |
| P0 | No miniprogram source found | Locate authoritative app.json/project.config.json or resolve approval for adding a client within this repo; do not create another project silently. |
| P0 | Web standalone build fails | Windows EPERM symlink in .next/standalone; resolve user-level symlink capability or build in an approved environment without changing DB/engine. |
| P0 | Existing dirty worktree | Preserve and separate pre-existing modifications before any feature commit. Remote HEAD equality does not preserve them. |
| P1 | No established student login/ownership boundary | Implement against approved existing identity mapping; test A/B access for every read/write, map, reflection, evidence and attachment. |
| P1 | No established photo upload pipeline | Require authenticated ownership, size/type/content checks, private retrieval and deletion; no real uploads yet. |
| P1 | Real learning UAT absent | Tests pass at unit level; run anonymous task flows and reload persistence in the actual client. |
| P1 | Aoyu Safe Error/event verification missing | Reuse approved image; bind to actual failure event. Current PNG count 38, historical 40 unconfirmed. |
| P1 | npm baseline mismatch | Host npm 11.17.0 vs engines >=12.0.2; pnpm tests worked, do not claim all tooling requirements met. |
| P2 | Handoff shape mismatch | Existing required recommended_learning_goal differs from requested recommended_learning_mode; version a compatibility wrapper explicitly, retain frozen contract. |
| P2 | Mock returns fabricated defaults | defaultDiagnosis and learning_mode/progress defaults are fixture behavior, not actual engine evidence; do not expose as real writeback. |
| P2 | AppID/tools/domain/test deployment missing evidence | Obtain sanctioned test configuration, then compile, preview and test on devices. |

Preserved: Python baseline, TypeScript rules, schema, primary keys, contracts, character assets and existing records. No production PostgreSQL or Notion import performed.
