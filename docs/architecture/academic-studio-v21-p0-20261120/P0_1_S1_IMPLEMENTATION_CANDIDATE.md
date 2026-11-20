# P0.1-S1 — 0045 Implementation Candidate

**Status: Draft implementation candidate · not installed in any shared environment**

## Change

One existing function only: \`learning.can_read_sensitive(uuid,uuid,uuid)\`.

On the FAMILY guardian-to-child branch, each protected Learning read now requires the acting guardian to have a currently valid row in \`core.family_memberships\` for the same family. The predicate uses \`clock_timestamp()\`.

Preserved:
- student self-read branch;
- verified LEARNING guardian authority;
- active LEARNING_RECORD / LEARNING consent;
- Teacher assignment and Supervisor paths;
- function signature, VOLATILE, SECURITY DEFINER and search_path;
- existing function owner and ACL;
- existing RLS policies and all existing identity/session/ticket/context tables.

No table, column, index, policy, role, schema or data migration is added.

## Candidate integrity

- Candidate: \`0045_family_membership_live_revocation.sql\`
- Manifest: \`manifest-0045-family-membership-revocation.json\`
- Rollback: \`rollback_0045_family_membership_live_revocation.sql\`
- 0045 is only an unmerged forward-candidate identifier. It is not present in the formal migration directory or ledger.

## Required PG16/17 evidence

The dedicated acceptance harness:
1. Installs formal 0001–0037 into a newly created disposable cluster.
2. Applies candidate 0045, reapplies it, rolls it back and reapplies it.
3. Confirms the function owner, ACL, attributes and formal migration ledger remain unchanged.
4. Uses separate binder/app LOGINs and the same app backend connection.
5. Confirms guardian card and stage-report reads are allowed before membership end, then denied on the next READ COMMITTED request after a committed membership end.
6. Confirms natural wall-clock membership expiry denies the next request.
7. Confirms Student self-read and active Teacher assignment reads remain allowed.
8. Confirms denial audit records and context cleanup.

All data is synthetic. The test harness creates and removes only its own labelled Docker clusters and temporary credentials.

## Approval boundary

This PR authorizes no shared non-production installation, no main merge, no production deployment and no real student data. After independent security review and successful PG16/17 CI, return the candidate to Founder for explicit installation/merge approval.
