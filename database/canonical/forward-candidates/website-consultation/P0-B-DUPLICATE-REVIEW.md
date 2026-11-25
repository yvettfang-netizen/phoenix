# Website consultation duplicate review

The intake regression at `43060dc9789bbb664e1956a39230056956562854` preserves two leads when a contact submits under different request IDs and reuses the original lead on exact request replay. [PG16/17 candidate run](https://github.com/yvettfang-netizen/phoenix/actions/runs/45587231876).

## Existing authority and integration gap

Migration 0032 owns duplicate candidates, review decisions, merge actions and lead history. Its review function checks the current family of the first lead only. Its merge function allows one unlinked lead and one family-linked lead in an authorized family context. The website workflow has a narrower boundary. Both leads must belong to the same configured intake organization and domain and remain unlinked to any person or family when proposed, reviewed and merged. A general CRM service context alone cannot establish that boundary.

The intake payload MAC includes the request ID and cannot match separate consultations. The rate-limit HMAC is scoped to abuse prevention. If deterministic exact-contact matching is added, use a separate purpose-bound keyed digest scoped to organization and domain. Expire that digest with contact retention and keep it out of staff DTOs and audit payloads. An exact match is evidence for a pending candidate only.

## Implementation and acceptance

1. Check both leads through the existing organization gate and lock them in a consistent order before invoking the Canonical transition in the same transaction. Recheck both scopes for each transition because a lead may have been linked to a family after proposal. Keep the authenticated Principal for attribution and retain the distinct-reviewer check.
2. Deny proposal, review and merge if either side is outside the current staff scope. Reject expiry, revocation and self-review under the original credential. Exercise a family association added between proposal and review or merge.
3. Demonstrate symmetric concurrent proposal deduplication, one durable reviewed decision, one audited merge, and retained original leads on PG16 and PG17. A same-request retry must create neither a new lead nor a duplicate review candidate.

## Candidate evidence

- The authenticated staff gateway at `53f7407a5c796234b2ba878613cf3cd8e4c31b53` passed both [PG16 and PG17 jobs](https://github.com/yvettfang-netizen/phoenix/actions/runs/45589189330). The harness exercised pair scope, proposal replay, independent confirmation, merge with audit attribution and retained history.
- The first browser-enabled run at `94fe48f3405ef063db1ec47d159dbffd3305eb4f` failed the workbench viewport assertion on both database versions. The [rerun with the layout fix](https://github.com/yvettfang-netizen/phoenix/actions/runs/45590363854) is pinned to `329d58f9c162ef6f9244fce25d48124dc5f2ada4`. Integrated browser acceptance remains pending until both jobs pass.
- The candidate now supports manual pair selection and exact-contact suggestions scoped to the same acquisition contract and service domain. Suggestions are filtered by live dispatcher authorization, absent for expired contact records and hidden once an employee proposes the pair. The workbench never receives the digest. Concurrent reversed-pair submission and browser suggestion acceptance are included in the synthetic harness. The newer commits still require PG16/17 and Chromium results.
