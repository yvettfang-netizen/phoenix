# P0.1 Identity Contract — Student-default routing and explicit Parent switch

**Status:** PROPOSED FOR JIMSON REVIEW · no SQL or runtime change authorized  
**Founder decision:** dual-capability principal defaults to **Student**  
**Baseline:** Canonical main migrations 0001–0037, source baseline SHA `9db147ac3a5d135d50b90bfea5a7316ce747d90b`

## 1. Binding product behavior

| Verified capability at login | Default destination | Other views |
|---|---|---|
| Student only | Family OS → 凤启学苑学习中心 | None unless separately granted |
| Parent/guardian only | Family OS → 家庭中心 | None unless separately granted |
| Student + Parent/guardian | **Student Learning Center** | Parent/Family Center only after explicit manual switch and fresh authorization |
| Teacher only | Corporate OS → Teacher Workspace | No family view unless separately granted |
| Teaching administrator only | Corporate OS → Teaching Admin | No teacher or family scope unless separately granted |
| Multiple internal capabilities | Corporate OS role/workspace selection based on verified capabilities | Each capability independently checked |
| No valid capability / ambiguous identity | Safe resolution or access-denied screen | Never infer a student, family or role |

The Founder selection `student` means student-first when both student and parent capabilities are valid. It does not mean that every account is a student, nor that the parent capability is removed.

## 2. Existing Canonical facts verified in source

- `core.people`: canonical person identity.
- `core.student_profiles`: student profile keyed by person.
- `core.families`, `core.family_memberships`: family and time-bounded membership.
- `core.guardian_authorities`: guardian-to-subject relationship with scope, evidence level, validity and revocation timestamp.
- `auth.principals`: one principal per person in current formal schema; `principal_kind` currently includes FAMILY, ADVISOR, CHANNEL and SERVICE, not Student/Parent/Teacher/Admin as separate principal kinds.
- `auth.session_contexts`, `auth.context_exchange_tickets`: existing database-bound session context and one-use exchange ticket.
- `consent.grants`: purpose/data-class scoped consent with active/withdrawn/expired states.
- `learning.teacher` and `learning.teacher_assignment`: teacher person identity and time-bounded class assignment.

These structures establish reusable identity and relationships. They do **not** by themselves prove that a complete Student/Parent/Teacher/Administrator capability resolver or UI router already exists.

## 3. Required server-side capability predicates

The trusted server must resolve capability from authenticated Principal → Person and current Canonical records. Browser role labels, query parameters, request headers, local storage, public IDs and client-supplied family/student IDs are never authority.

### Student self capability
Require:
1. authenticated active Principal mapped to Person;
2. `core.student_profiles.person_id = actor_person_id`;
3. target student is the same actor Person;
4. current context and Consent rules permit the requested data class/purpose.

Student self access must not expose family payment administration, siblings, guardian-only data, teacher internal notes or unreviewed AI inferences.

### Parent/guardian capability
Require all applicable conditions:
1. actor is authenticated and active;
2. active `core.family_memberships` for the relevant Family;
3. a current `core.guardian_authorities` row for actor → subject with suitable scope, `evidence_level='VERIFIED'`, valid time window and `revoked_at IS NULL`;
4. applicable `consent.grants` are active, not expired/withdrawn, and match subject, grantee, purpose and data class where consent is required;
5. each requested child/resource is inside that authority; sibling membership alone does not imply authority over every child.

`SELF_DECLARED_LEGACY` is not sufficient to grant sensitive Parent access without an explicitly approved legacy policy.

### Teacher capability
Require:
1. authenticated Principal mapped to the same Person as `learning.teacher.teacher_person_id`;
2. teacher status ACTIVE;
3. current `learning.teacher_assignment` for the relevant class, within `valid_from/valid_until`, with status ACTIVE;
4. active student enrollment/class membership for the requested student and class;
5. purpose-specific Consent and any minor/student protection rules;
6. recheck on every sensitive read/write, not only when a timetable is first loaded.

A teacher record alone does not grant access to all students.

### Teaching administrator capability
Existing P0 source review has not established a complete, narrowly scoped Canonical teaching-administrator grant that can safely be reused. Do not infer this capability from generic staff status, a Partner relationship, an organization membership, a service-project assignment, or a browser-selected role. Jimson must identify a current formal source of administrator authority or document the exact missing capability. Any additive grant must be scoped, time-bounded, revocable, auditable and separate from student/guardian/teacher authority.

## 4. Session and context behavior

- Reuse the existing trusted web login session and existing Canonical `auth.context_exchange_tickets` / `auth.session_contexts`.
- No `workspace_sessions`, duplicate context tickets or duplicate session-context tables.
- Switching Student → Parent is a capability change, not a new identity. Server re-resolves Parent authority and binds only the authorized Family/subject scope through the existing context flow.
- Ticket issuance is short-lived and single-use; redemption must bind the intended active Principal. Existing migration source constrains ticket expiry to 60 seconds.
- The application must clear/discard the previous DB context before releasing a pooled connection. On the next borrower, stale context must not survive. Validate backend PID + backend_start and transaction/connection lifecycle.
- Logout, Principal disable, guardian revocation, teacher assignment end/revocation, Consent withdrawal and expiry must deny subsequent protected access. Revocation must not rely solely on a cached role list.
- A previously issued ticket must not restore an authority that has since been revoked; validate live capability at redemption and again at protected operation.
- Switching back to Student must bind student self context and must not retain the Parent Family context.

## 5. Navigation and privacy acceptance

1. Dual-capability account logs in → Student Learning Center.
2. Student view displays no parent financial controls or sibling private records.
3. User explicitly selects Parent Center → server checks each child/authority and applicable Consent → only authorized children appear.
4. Revoked/expired guardian attempts switch → denied; no cached parent page or API response remains available.
5. Parent-only user logs in → Family Center.
6. Student-only user cannot invoke Parent switch by forged URL, API body or role header.
7. Teacher assignment expires → teacher's next read/write is denied.
8. Teacher cannot enumerate students by changing student ID.
9. Partner referral or CRM relationship never creates teaching capability.
10. One person with multiple valid capabilities still uses one Principal and one Person; no duplicate account or student master.

## 6. Open questions / UNVERIFIED

- Identity-provider claim mapping and existing production session resolver implementation.
- Whether all relevant Family OS APIs already recheck guardian authority and Consent at operation time.
- Exact teaching administrator grant source and revocation API.
- Existing app/binder pool reset behavior in deployed runtime.
- Whether the current `auth.validate_context_request` family membership checks are sufficient for the specific student/guardian semantics; they must not be mistaken for complete guardian authorization.

**Recommendation:** P0.1 contract is ready for Jimson source-level review, not SQL approval. No role-binding table or migration is proposed until the gaps above are proven against actual code and exact formal schema.
