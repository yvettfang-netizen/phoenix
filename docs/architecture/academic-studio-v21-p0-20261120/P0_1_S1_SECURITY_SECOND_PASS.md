# P0.1-S1 Security Second Pass — Model-Assisted Review

**Target:** Draft PR #89, fixed candidate HEAD `ab270fdc2eb78264c6d78ebbacb6d11a824e1170`. This is a source-and-test review, not an independent human security signature.

## Findings

| Check | Finding |
|---|---|
| New persistent objects | None; one existing SQL SECURITY DEFINER function is replaced |
| Guardian membership expiry/revocation | Candidate checks current `core.family_memberships` row with `clock_timestamp()` |
| Guardian Authority and Consent | Existing conditions remain required |
| Student self-read | Separate branch remains |
| Teacher/Supervisor | Existing STAFF branches remain |
| RLS/ACL | No changes; direct Learning table SELECT remains denied |
| Session/context | Existing 0003/0012 objects are reused |
| Same backend | PG16/17 next-request tests pass after committed membership end |
| Repeat/rollback | Candidate repeat, rollback and reapply tests pass; owner/ACL/function attributes preserved |
| Drift protection | Exact PG16/17 function-definition fingerprints are pinned |

## Additional negative tests

The PG16/17 acceptance suite includes revoked Guardian Authority, withdrawn Learning Consent, cross-family denial, Teacher assignment revocation and direct table SELECT denial. All six workflows on the fixed HEAD `ab270fdc2eb78264c6d78ebbacb6d11a824e1170` completed SUCCESS.

## Residual risks and gates

1. Immediate next-request revocation is proven only with bounded READ COMMITTED request transactions. A long-lived REPEATABLE READ snapshot can retain an older MVCC view despite `clock_timestamp()`.
2. The source currently shows bounded transactions in the Family Projection and Learning Catalog services. Those are not, by themselves, proof that actual Learning card/stage-report endpoints use the same path. The deployed application commit and endpoint wiring must be evidenced.
3. The nonproduction read-only receipt is not yet returned. The exact function fingerprint, migration ledger, role/database isolation overrides and RLS/FORCE flags must be checked against the named `canonical-nonprod` target.
4. The supplied rollback restores the original function and reopens S1. It is an emergency-only option requiring explicit security risk acceptance and temporary suspension of affected family Learning reads.
5. Other P0.1 gaps—overlapping room/student bookings, Student default entry, Parent switching and assessment contracts—remain outside this S1 candidate.

## Verdict

**Candidate code and isolated PG16/17 evidence: PASS.**  
**Independent human review: PENDING.**  
**Named nonproduction runtime receipt and actual Learning endpoint transaction evidence: PENDING.**  
**Installation / merge / deployment decision: HOLD.**

This model-assisted review is not represented as an independent human security certification.
