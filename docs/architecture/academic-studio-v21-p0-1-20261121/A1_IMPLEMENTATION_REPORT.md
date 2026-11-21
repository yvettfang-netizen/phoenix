# Academy P0.1 — A1 Minimal Capability Grant Candidate

**Status:** Draft SQL candidate · NOT INSTALLED · NOT APPROVED FOR MERGE OR DEPLOYMENT  
**Founder authority:** [PR #90 approved design](https://github.com/yvettfang-netizen/phoenix/pull/90), approval record in main  
**Starting main SHA:** `f1d8af3f9338b4cb8a1afca48c6d85f1396d9da3`  
**Formal PostgreSQL migrations:** immutable 0001–0037.

## Scope

This is **the first, smallest sub-package of P0.1 Package A**. It does not implement the full multi-capability login or student/teacher routing yet.

Candidate (unnumbered): `database/canonical/forward-candidates/academic-studio/academy_staff_grants.sql`

Adds exactly one table: `learning.academy_staff_grants`. It stores only two explicit privileges:
- `ACADEMY_ADMIN`
- `ACADEMY_FOUNDER`

Student, Parent, and Teacher derive their capabilities from existing Canonical Student Profile, Guardian Authority, Consent, Teacher and Class Assignment records in subsequent A2 work. No new Person, Principal, session, ticket, company or regional tenant table.

## Governance

- Only a designated existing internal SERVICE Principal with `service_label='academy_founder_bootstrap_v1'` can bootstrap or revoke a Founder grant.
- A valid Founder STAFF context can grant/revoke Academy Administrator capabilities. It cannot create or revoke Founder capability, and cannot revoke its own Founder grant.
- No administrator is permitted to grant itself or another user Founder status.
- Active grants are unique by Principal and capability; expired and revoked grants fail the live capability predicate.
- Revocation increments `authorization_version`; a trigger rejects mutation of identity/evidence and deletes.
- Direct table reads and DML by application/reader LOGINs are denied. `learning.has_academy_staff_grant(text)` and private bootstrap/trigger helpers are not publicly executable.
- All grant/revoke decisions call the existing `audit.record_write_decision()` function.
- A future A2 migration must extend the existing STAFF channel and related learning authorization functions; this A1 candidate does not loosen Principal-kind or family-context validation.

## Verification contract

The separate source guard pins the SQL Git blob and confirms only canonical forward-candidates contain candidate SQL; formal 0001–0037 are unchanged.

PG16 and PG17 disposable-cluster tests exercise:
1. fresh formal 0001–0037 install then unnumbered candidate;
2. repeat candidate refusal without formal-ledger pollution;
3. forced RLS and denial of direct application table access;
4. separate binder/app LOGINs and one-use context tickets;
5. unbound and FAMILY role escalation refusal;
6. dedicated SERVICE bootstrap and duplicate/invalid grant refusal;
7. Founder permitted Admin grant/revoke, forbidden Founder creation/self-revoke;
8. revocation version and immutable grant identity;
9. audit decisions and context/ticket cleanup;
10. removal of owned labelled Docker resources and credentials.

**The tests in this document are a plan until exact-head CI results are recorded.** No production or shared non-production database is connected, altered or used. Test fixtures are synthetic.

## Package boundaries

A2 will handle STUDENT and global STAFF context, explicit parent switch, subject-scoped consent and live membership revocation; it must reconcile PR #89's existing 0045 proposal rather than duplicate it. Package B covers teacher-controlled Online/Onsite/Hybrid scheduling, and C covers standardized assessments.

No lesson-hour package/payment/debit/refund/settlement behavior is included. No numbering is allocated before collision review. Founder must independently approve candidate SQL merge or any database installation.
