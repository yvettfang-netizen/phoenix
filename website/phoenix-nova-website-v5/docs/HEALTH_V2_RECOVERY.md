# Health V2.0 recovery

Task: `XUANWU-HEALTH-RECOVERY-20261030`. Existing branch: `feature/phoenix-health-landing-v1`; Draft PR #29. No merge, production deployment or database migration.

**Logo gate passed:** Founder accepted the three Logo V3 arrangements for light backgrounds, with small favicons deferred. The same assets from PR #30 are now reused on this branch; Header uses horizontal, Footer uses complete Primary on white, and homepage emblem uses complete Symbol on ivory. No new favicon is enabled. Health page visual acceptance remains pending.

## Audited interruption

Read-only audit found four unstaged files on `ada733ec344067e56453503e444382464f6e53b8`: Health landing JSX/CSS and two tests. The prior two commits, remote branch and Draft PR were intact. The original checkout's unrelated Education and ASKWISE work was preserved. No reset, clean, branch deletion or force push was used. The older Health integration branch is an ancestor of main.

The incomplete V2 source already had the headline, four advantages, life-stage text and palette. It still used the old logo and lounge hero. Browser evidence and the running preview were V1.1. Recovery continues those components rather than replacing the application.

## Final reference and changes

The authoritative webpage reference is `凤凰新纪元家庭健康官网.png`; `跨越山海的健康之旅.png` is a poster and is not the page-layout reference. No flattened webpage or poster is served as a page background.

Editable React sections provide the scenic mountain / Hong Kong / family Hero, two primary actions, four strengths, five coordination services, four reasons, three family-stage scenes and a deep-sea teal consultation area. Existing regions, process, audiences and FAQs remain in a native disclosure. Health Compass and the previously approved “Both, together” choice remain available.

The final original logo is documented in `OFFICIAL_LOGO_ASSET.md`. Shared root tokens extend the existing design system, with Education pine, Identity lake blue, Wealth brown and Health muted teal accents. Both Health pages share the Health aliases. Logo red is not extended into Health backgrounds or primary buttons. Existing shared navigation and Footer are retained.

Routes remain `/zh/health`, `/en/health`, `/zh/health/family`, `/en/health/family` and the controlled questionnaire routes. OG imagery reflects the new landscape and candidate noindex remains enabled.

## Boundaries and verification

The 14 original questions/options, six-dimensional text rules, action selection/export, privacy and exact `HEALTH_COMPASS_PREVIEW === "1"` condition remain unchanged. International services do not require questionnaire completion. Consultation is an explicit browser-only preparation demo, with no answer transfer or advisor submission. No authentication, Core/Family OS, canonical IDs, PostgreSQL, RLS, CRM or medical-data handling changes.

Local evidence is stored in ignored `outputs/health-v2/`, separate from V1.1 screenshots. Native Windows workerd previously fails at startup with `0xc0000005`; the limited Node adapter validates frontend behaviour only. Actual Worker verification must come from the exact final-head Ubuntu CI run, not older V1.1 checks; record that run after pushing. Physical devices and Founder visual approval remain separate acceptance steps.

Before merge, rollback uses a reviewed revert on this branch. Original V1.1 commits and screenshots remain available.
