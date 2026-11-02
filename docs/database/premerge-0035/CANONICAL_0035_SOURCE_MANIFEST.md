# Canonical 0035 source manifest

**Gate 1: PASS for source identity and byte matching; HOLD for Founder acceptance.** Checked 2026-11-02. This is a source-code inventory, not evidence of deployment or production state.

| Item | Verified value |
|---|---|
| Private source | [`yvettfang-netizen/phoenix-canonical-db`](https://github.com/yvettfang-netizen/phoenix-canonical-db), default branch `codex/canonical-private-clean-baseline` |
| Source commit | [`3af6ba19a96a458dc20cb0f4493bed10aee7028a`](https://github.com/yvettfang-netizen/phoenix-canonical-db/commit/3af6ba19a96a458dc20cb0f4493bed10aee7028a) |
| Public integration base | [`yvettfang-netizen/phoenix/main@259753248ff54b07fd9c52f270e45ae1c877bc09`](https://github.com/yvettfang-netizen/phoenix/commit/259753248ff54b07fd9c52f270e45ae1c877bc09) |
| Integration review | [Draft PR #36](https://github.com/yvettfang-netizen/phoenix/pull/36), open and unmerged |
| Copied path | `database/canonical/migrations/` |
| Copy verification | `35` source SQL files, `35` target SQL files; per-file SHA-256 equal (`Get-FileHash`, see verification command below) |
| Historical manifest | Private [`release/02_MIGRATION_MANIFEST.md`](https://github.com/yvettfang-netizen/phoenix-canonical-db/blob/3af6ba19a96a458dc20cb0f4493bed10aee7028a/canonical-db/release/02_MIGRATION_MANIFEST.md) covers only 0001–0017 and is not the 0035 manifest |

The table lists SHA-256 of each private-source byte stream. The same hashes were measured on the copied file, without reformatting SQL.

| Migration | SHA-256 |
|---|---|
| 0001 | `eea8d1deece72afdc3832d075fcfb42b71b4c1fe4fdccc8900104a0e0ca78a2d` |
| 0002 | `bef7d9a902e8ad34491b7455987d7791667dcb8a5ab31945cf609a6aa97e4e7f` |
| 0003 | `7dc0c5060237fae9069915ba8a1ecc39323cf74ab8ea0d49dd832ef9d8330618` |
| 0004 | `aec2be38c6ad363f5594d65016b8a2dfcb79fe76e77a225271379bb991a443e9` |
| 0005 | `7bd581d16bb8c21278bd5bc013496779fe08f509d84bf74b652e5ce3b21cdbec` |
| 0006 | `2a3d6cd19febd62b7128c9ad4a2d7c94abdb9a4e11d499f36f4050eb2c2ed9d8` |
| 0007 | `49ec737393a4a4bc5f1e287add369db4f04fbde1c021521e8b4cf781f966ff93` |
| 0008 | `51215c0b4d76e242c28197187bf1e017362700128ddd562e2da5d64980a8588d` |
| 0009 | `2a48d016c0b2dd952d56a15853c8092895df057e6a0d69f5ab391803ca0747c2` |
| 0010 | `eb05a55b813695ef7c6252ffc00569a0d97920008773fc07b6d0f6109959825a` |
| 0011 | `acc638a3d308b9a9c601238843b1f5dea75a4f376cfb4e77a48cd3afb8f1caa8` |
| 0012 | `385206d698db33cd6a26b7ea48ab5362f2fa2e4256ec96740c336429ad54afa8` |
| 0013 | `fcbeeea5b8fc35c0993b7b7b9dbe956fd0c6edc4a6142e49cb329fad41a320cb` |
| 0014 | `92328ac4bf51b54980da63e96681220437ac20e4557fc008ab51431793ba4209` |
| 0015 | `a639f9f10c5130c780f008832bcf9e4852badd00fcec618379e94d4e7c82d683` |
| 0016 | `7b10af1992e548e065c68d947b47bb073cdc88c52e4312b9aa9ccbe1bfa962e4` |
| 0017 | `c701f74897ca13d503c8c165fd2182d77a06583afa832760dc80f8dd9524aab6` |
| 0018 | `063f8ba5b57de24208579369ce75424526737953319544d0174c5a31e3f5d74b` |
| 0019 | `425b72e7c62916da9c8c22624dc3d2beca547a0b8b96297a68604ecf574cec94` |
| 0020 | `20435da63432175396bf118d6b6b3b5c9865e7b8b8ba8343f0da84f273d1eedd` |
| 0021 | `adb8ec15e956c726e5717f9b19aebaae9d37ba4acece6a960729a204aa746d09` |
| 0022 | `4df4b55cc9b2830c357d676906a77a9fa7ac981bbe4673c156285aa40fba2f5f` |
| 0023 | `e5587c58895495097dea033f25cecfce67661eb0a6aede15821bdf115633f720` |
| 0024 | `992a9623e933b84f8e58db937450b0bb440e9aaf234ed204b72b7497e44c605f` |
| 0025 | `fbedd76cb36b6938c9a051ab3606146b9c097f529dee41a7d5cc1f12ee876aea` |
| 0026 | `aad3a52829404e1259d89a9751471af7d0f1322af710d498bb2498c5be7119d5` |
| 0027 | `81976bd7835a7ada6ab8d0e335ac751d3fd98432a53b0dc4d343c750456e78cc` |
| 0028 | `b8ec5d270d34da8f24423771b362d1dd6d3aa6c6f3d78cbd61b12968ebf6e8a2` |
| 0029 | `898079125502bd5406e64fe50744ea04fe846f519e26d00bd30fe4bbe695fb33` |
| 0030 | `c0559ba97ad9edeaa8cb6559b9d382030e27ef4c9a109e97ab7ea99c43eb2d2e` |
| 0031 | `a58d07ffd116a5890c46f6ca13c97034632b0905522ebdf1f464301746043936` |
| 0032 | `714ee075bde36d52545e6ae38afc61b3de2509b6f749f0ed31ba29805931047e` |
| 0033 | `f4f08da18a5e4a39eaeeb13c3f1130fd83521fc2583d5394647fb886763a0320` |
| 0034 | `fa879f5088f12a1797dc9264e9b2e52c2b5ed75d7151bb2d088b0788df9a1895` |
| 0035 | `c25d5efb3ddecdd11b1fa45793061b992e8bcaee278e3e1e359f7ca6b510c631` |

Source milestones [`M0`](https://github.com/yvettfang-netizen/phoenix-canonical-db/tree/3af6ba19a96a458dc20cb0f4493bed10aee7028a/canonical-db/milestones/m0-core-organization-identity) through [`M5`](https://github.com/yvettfang-netizen/phoenix-canonical-db/tree/3af6ba19a96a458dc20cb0f4493bed10aee7028a/canonical-db/milestones/m5-service-delivery) have engineering reports and 0030–0035 per-milestone manifests. All six `FOUNDER_ACCEPTANCE.md` files still say `PENDING`; engineering PASS is not Founder approval.

The private [Draft PR #2](https://github.com/yvettfang-netizen/phoenix-canonical-db/pull/2) → [#3](https://github.com/yvettfang-netizen/phoenix-canonical-db/pull/3) → [#4](https://github.com/yvettfang-netizen/phoenix-canonical-db/pull/4) → [#5](https://github.com/yvettfang-netizen/phoenix-canonical-db/pull/5) → [#6](https://github.com/yvettfang-netizen/phoenix-canonical-db/pull/6) → [#7](https://github.com/yvettfang-netizen/phoenix-canonical-db/pull/7) form a chain inside that private repository. They are open Draft PRs, not merges into `phoenix/main`.

Verification command (Windows PowerShell, both local worktrees): for each sorted source SQL file, compare `(Get-FileHash -Algorithm SHA256).Hash` with the target file of the same name; reject anything other than 35 matching pairs. The command output was `COPIED_AND_MATCHED=35` and `TARGET_COUNT=35`.
