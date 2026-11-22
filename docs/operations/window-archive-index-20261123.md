# Phoenix Window Archive Index

> Last reviewed: 2026-11-23 (Asia/Shanghai)
>
> Scope: active Codex and ChatGPT windows related to Phoenix, plus the archive decision for early windows.
>
> This index is an operational record. It is not a production approval, deployment record, or migration approval.

## Archive rule

- Candidate cutoff: windows last updated before 2026-10-01.
- Archive is reversible. No window content is deleted.
- Active work, pinned windows, and project-owned records remain available.
- A duplicate title is not treated as proof of duplicate content.

## Current inventory

- Active Codex windows scanned: 102
- Active ChatGPT windows scanned: 690
- Phoenix-related windows classified: 92
- Phoenix｜工程与发布: 23
- Phoenix｜网站与设计: 7
- Phoenix｜教育与身份: 39
- Phoenix｜运营与治理: 21
- 待确认｜可能重复: 4

## Record placement

### GitHub engineering record

Technical implementation, CI, PR, migration, security, deployment-package, and exact-SHA evidence belong in this repository under `docs/` and in the related pull requests.

Relevant historical anchors:

- PR #55 Canonical 0036/0037
- PR #57 Family Center V2
- PR #58 failure-recovery tests
- PR #59 Service Project / 0038
- PR #61 P1 integration / 0039
- PR #62 P1 build/package follow-up
- P1 candidate SHA previously recorded: `f0167027cf30fa92bb98c0b42593d89a3d42241c`
- Current `main` SHA verified on 2026-11-23: `f1d8af3f9338b4cb8a1afca48c6d85f1396d9da3`

GitHub references:

- https://github.com/yvettfang-netizen/phoenix/pull/55
- https://github.com/yvettfang-netizen/phoenix/pull/57
- https://github.com/yvettfang-netizen/phoenix/pull/58
- https://github.com/yvettfang-netizen/phoenix/pull/59
- https://github.com/yvettfang-netizen/phoenix/pull/61
- https://github.com/yvettfang-netizen/phoenix/pull/62

### Notion archive register

Decision notes, cross-project summaries, window-to-record mappings, and personal follow-up items belong in the Notion archive register. The Notion copy should link back to this file and the relevant PR or issue rather than duplicating source code.

## Duplicate handling

Four windows were placed in the sidebar group `待确认｜可能重复`. They are retained until their message history is reviewed. Do not delete them based on title similarity alone.

## Archive completion criteria

Before archiving an early window:

1. Its useful file path, PR, SHA, decision, or evidence link is present in GitHub or Notion.
2. No active task is still using the window.
3. It is not the sole source of an unresolved approval, credential, or rollback instruction.
4. The window is archived, not deleted, so it can be restored if needed.
