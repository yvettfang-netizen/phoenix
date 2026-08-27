# Phoenix Family OS™ Current Product Baseline

- Version: MVP V0.1 / package `0.1.0`
- Canonical repository: `yvettfang-netizen/phoenix`
- Canonical directory: `Phoenix Family OS/phoenix-family-os-mvp`
- Baseline: `main@c118d176acd8e80881c51ed2a85ce6037d6ae07e`
- Status: Local Demo / Acceptance preparation
- Last reviewed: 2026-08-27

## Product purpose

Phoenix Family OS™ validates whether a family will establish a profile, complete Education Compass, use a clear Growth Insight, retain important events in Family Timeline, and request Advisor Service.

```text
Education Compass
→ Family Profile / Child Profile
→ 成长洞察
→ Family Timeline
→ Advisor Service
```

Education Compass is the diagnostic entry. ASKWISE is a separate Learning Support Layer and currently has no route or data contract. Family OS does not duplicate ASKWISE or create a second family record.

## Current implementation

- native WeChat Mini Program, 15 routes
- Family/Child Profile and local persistence
- Education Compass questionnaire
- deterministic local-rule 成长洞察
- Family Timeline
- Advisor request and internal Advisor/Admin Demo pages
- loopback SQLite proxy for minimized questionnaire submissions

## Explicitly missing

- production WeChat identity and account separation
- complete server/database persistence for Family OS
- trusted Family/Advisor/Admin RBAC, consent, audit and data lifecycle
- Growth Blueprint and Reminder
- NOVA model/chat/retrieval/write confirmation
- ASKWISE integration contract
- WeChat simulator/device acceptance and brand-source sign-off

## Scope invariants

- no real family or minor data
- no payment, membership, full CRM, marketplace, wealth/health platform, large identity journey, autonomous agent, or Family Office platform
- no historical product/assistant naming in customer UI
- no fake page for Growth Blueprint, Identity Journey, ASKWISE, or NOVA
- existing partner routes remain isolated development previews and do not appear in normal family navigation
