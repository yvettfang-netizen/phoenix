# Phoenix Family OS™ MVP Sprint 1 Modification Plan

Status: planned only. No Sprint 1 source modification has been applied.

Sprint 1 objective: Engineering Safety & Data Integrity. Product behavior, data model version, brand, Compass rules and AI output logic remain unchanged.

## S1-00 — Version-control safety baseline

- Planned files/state: `.git/`, `.gitignore`; no business source change
- Purpose: initialize Git, record the verified baseline and create the approved development branch before source edits
- Impact: engineering workflow only
- Test method:
  - confirm clean baseline commit
  - confirm active branch is not `main` or `master`
  - compare committed files with checkpoint SHA-256 values
  - confirm `node_modules/` and generated artifacts are excluded

This task must not push a remote or deploy any environment.

## S1-01 — Preserve stored data across schema mismatch

- Planned files:
  - `services/store.js`
  - `services/repository.js` only if initialization needs to distinguish migration state
  - `tests/run-tests.js` or a new focused Store regression test
- Purpose: prevent an unknown or older schema snapshot from being replaced by an empty database during application initialization
- Impact:
  - all local Repository reads and writes
  - app launch initialization
  - no `SCHEMA_VERSION` change and no destructive migration
- Test method:
  - initialize with empty storage
  - initialize with valid V0.1 storage
  - initialize with a different schema version containing family data
  - verify original data remains recoverable and is not overwritten
  - verify malformed table values degrade to safe empty arrays without deleting unrelated data

## S1-02 — Harden Growth Insight relationship loading

- Planned files:
  - `pages/report/index.js`
  - `pages/report/index.wxml`
  - `pages/report/index.wxss`
  - a new page-level regression test or extension to the existing validator
- Purpose: validate Report -> Assessment -> Student -> Family before dereferencing and provide a recoverable error state
- Impact:
  - Growth Insight display
  - family ownership enforcement
  - Advisor demo report access
- Test method:
  - valid family report renders normally
  - missing report renders an error state
  - missing Assessment, Student or Family does not throw
  - a family user cannot read another family's report
  - Advisor demo behavior remains unchanged for valid data

## S1-03 — Recheck session and ownership before core writes

- Planned files:
  - `services/session.js`
  - `pages/family-edit/index.js`
  - `pages/student-edit/index.js`
  - `pages/compass-questionnaire/index.js`
  - `pages/advisor-request/index.js`
  - `pages/admin-family/index.js`
  - focused page/service tests
- Purpose: avoid null-user writes and prevent stale or cross-family IDs from being used after page load
- Impact:
  - Family Profile save
  - Child Profile save
  - Compass submission
  - Advisor Request and Advisor Note submission
- Test method:
  - expire the session between page load and submit
  - attempt a Student ID from another family
  - attempt a Report ID from another family
  - verify the user is redirected safely and no record is written
  - verify normal submissions continue to pass

## S1-04 — Add storage failure recovery to critical submissions

- Planned files:
  - `services/store.js` for a consistent error contract
  - the core submission pages listed in S1-03
  - targeted regression tests
- Purpose: prevent permanent loading states, partial UI success messages and uncaught console errors when local storage rejects a write
- Impact:
  - user feedback and submit-button state only
  - no change to business rules or stored field structure
- Test method:
  - mock `wx.setStorageSync` failure
  - verify no success message is shown
  - verify submitting/loading flags reset
  - verify a basic retry remains possible
  - verify no unhandled exception reaches the page runtime

## S1-05 — Expand engineering validation for Sprint 1 risks

- Planned files:
  - `tests/validate-project.js`
  - `tests/run-tests.js` or focused new test files
  - `package.json` only if a new non-dependency test script is needed
- Purpose: make data-preservation, relation-integrity, route, resource and ownership regressions automatically detectable
- Impact: development checks only
- Test method:
  - `pnpm test`
  - `pnpm typecheck`
  - `pnpm build`
  - full JS/JSON parse
  - route, component and asset reference validation

## Sprint 1 non-goals

- No new page or commercial feature
- No AI Prompt or rule change
- No schema version change
- No Logo replacement
- No UI redesign
- No Advisor/Admin Portal implementation
- No Compass draft persistence
- No production deployment or WeChat submission
