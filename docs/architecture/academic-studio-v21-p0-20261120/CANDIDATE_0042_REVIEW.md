# PR #77 / 0042 re-review

**Disposition: HOLD in present form.** Reviewed against `phoenix/main@9db147ac3a5d135d50b90bfea5a7316ce747d90b` and PR #77 head `7d1bc6bfea14348192ca549510fbc571fb978254`. Candidate SQL SHA-256: `bd319e3074e1b51862dfd14eeeb72531d400aff0f8277cde8e886f501cff58ea`. The SQL remains in `database/canonical/forward-candidates/workspace-authorization/`; it has not been installed here. PR #77's new `P0_REVIEW_DECISIONS.md` explicitly retains the persistent workspace session; the newer Founder Academic Studio P0 instruction forbids a second workspace-session lifecycle for this product.

| Finding | Evidence in 0042 | P0 correction |
| --- | --- | --- |
| Product scope | `core.organization_workspace_profiles` accepts `REGIONAL_PARTNER`, `FRANCHISEE`, `CHANNEL_AGENT`, `SUB_PARTNER`. | Academic Studio has no multi-company tenant or franchise-school model. Channel partners stay in their separate channel workspace. Remove this dependency from Academy design. |
| Session duplication | 0042 creates persistent `auth.workspace_sessions` and extends the pre-existing `auth.context_exchange_tickets` and `auth.session_contexts`. Latest SQL **does not create another ticket/context table**. | Founder P0 forbids a second workspace-session lifecycle as well. Reuse the trusted web session plus existing DB ticket/context; add only bounded capability metadata if a proof shows it necessary. |
| Identity semantics | `auth.principals.person_id` is unique and `principal_kind` is singular; an actor can be parent, teacher and administrator over time. | Decide the active capability server-side from current family, guardian and teaching assignments. A user-selected view is a request, never an authorisation fact. |
| Staff and service scope | 0042 adds generic org memberships, role bindings and project assignment organisation scopes. | Academy teacher access comes from active `learning.teacher_assignment` and specific class/student scope. Administrator needs reviewed explicit grant; project assignment alone does not confer teaching or child-record access. |
| Candidate verification | PR #77 records local PG16/17 synthetic PASS at an older head; latest CI was still running at P0 capture. | Rerun exact new candidate after redesign, including simultaneous role, revoked guardian, stale teacher assignment, forged view/organisation, ticket replay and pool reuse. Old evidence cannot approve changed SQL. |

## Minimal identity proposal

1. **Trusted broker session (existing application mechanism):** verify issuer/audience/JWKS and map to the existing `auth.external_identities → auth.principals → core.people`. No browser-supplied role or family is authoritative.
2. **Capabilities:** student self-view requires the mapped person to be the student; parent view requires current `core.family_memberships`, verified `core.guardian_authorities` and applicable `consent.grants`; teacher view requires current `learning.teacher_assignment` for the specific class/student; teaching admin requires a separately approved, revocable scoped grant. Do not use Partner attribution.
3. **Single existing database context:** use `auth.context_exchange_tickets` and `auth.session_contexts` with app/binder separation, one-use ≤60 s exchange, backend identity check and clear/discard on workspace switch/logout. If current columns cannot encode a narrowly scoped academic capability, propose additive columns to these existing tables in a separate forward migration, with non-academic callers unchanged.
4. **Live checks:** every sensitive read/write rechecks current assignment, guardian authority, Consent, revocation and expiration. Ticket issuance is not a durable grant.
5. **Default navigation:** a verified student-only account starts at Academy; a verified parent-only account starts at Family Center; dual-capability actors choose a view explicitly. Unknown/ambiguous relationship is denied until resolved.

No SQL number is reserved by this P0 package. The current 0042 file must not be edited in this branch or merged into an Academic Studio migration. Review PR #77 independently; its broader Enterprise work may need separate redesign.
