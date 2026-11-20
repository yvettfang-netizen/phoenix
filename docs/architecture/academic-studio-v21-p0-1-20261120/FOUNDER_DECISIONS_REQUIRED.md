# Founder Decisions Required — P0.1 Contract Closure

**Status:** PROPOSED · no SQL or migration approval  
The following recommendations narrow the remaining product decisions. Founder approval is required only where marked; no default is silently implemented.

## 1. Capability model

**Recommended:** one Principal per Person; Student, Parent and Teacher derive from existing Canonical facts; only Academy Admin and Founder use explicit, revocable grants.

- Student: own Student Profile, self-only.
- Parent: verified Guardian Authority and Consent per child.
- Teacher: active Teacher record and class assignment.
- Administrator: Academy-wide teaching operations.
- Founder: global Academy oversight and grant governance.

**Decision requested:** approve this derived-capability model and a minimal `learning.academy_staff_grants` table for Administrator/Founder only.

## 2. Student and Staff context

**Recommended:** add `STUDENT` to the existing channel vocabulary and allow `STAFF` global context with `family_id=NULL`. Reuse existing context tickets and backend-bound session contexts.

This is needed because the current projection requires FAMILY context for student summaries, while a student view must be self-only; the current STAFF context also requires a family ID, which is not suitable for a global teacher workbench.

**Decision requested:** approve the additive context semantics, with no new session/ticket/workspace-session tables.

## 3. Administrator / Founder permissions

**Recommended:**
- Administrator: create/manage courses, classes, teachers, assignments, schedules, attendance corrections, and approve/publish learning outputs.
- Founder: all Administrator permissions plus grant/revoke Academy Admin, global audit and policy oversight.
- Teacher: only assigned class/student operations.
- Advisor/Staff/Partner: no teaching access unless a specific Teacher assignment or Academy grant exists.

**Decision requested:** approve the above boundary and require the initial Founder grant to be bootstrapped only by the controlled internal-service path.

## 4. Teacher authority for delivery mode

**Founder-confirmed:** the teacher decides Online / Onsite / Hybrid; for Hybrid, teacher assigns each student to Online or Onsite. Student and Parent cannot self-select or edit.

**Recommended detail:** the active LEAD teacher is the single mode authority when multiple teachers are assigned; assistants are read-only for mode changes.

**Decision requested:** confirm LEAD-only authority or allow any active assigned teacher to change mode.

## 5. Hybrid finalization

**Recommended:** HYBRID means one slot with at least one Online participant and at least one Onsite participant. If all students are assigned the same mode, the teacher finalizes the slot as ONLINE or ONSITE instead.

**Decision requested:** approve this finalization rule.

## 6. Timezone and buffers

**Recommended:**
- ONSITE/HYBRID: use the physical room's IANA timezone.
- ONLINE: teacher explicitly selects the schedule timezone.
- Store UTC instants; show local time using the stored zone.
- Reject DST gaps and require explicit selection for DST folds.
- No travel/setup buffer by default.

**Decision requested:** approve the timezone rule and no default travel/setup buffer.

## 7. Assessment evidence and retention

**Founder-confirmed:** CAT4, DSE, A-Level, IELTS, JLPT and Cantonese remain separate scoring systems, shown on one longitudinal timeline without cross-scale conversion.

**Still required before SQL:**
- exact CAT4 report fields and licensing/storage limits;
- DSE/A-Level awarding-body evidence fields and correction policy;
- IELTS/JLPT evidence retention and validity display;
- Cantonese rubric owner/version and assessor qualifications;
- who may verify an official result and who may publish it to Parent view;
- retention, withdrawal, correction, retraction and supersession policy.

**Decision requested:** approve the proposed `assessment_attempt` / `assessment_result` pair in principle, subject to the above evidence/legal policy being completed before implementation.

## 8. Existing Education Compass app

Current main source shows the old Education Compass server is a development-only in-memory fixture: it rejects production startup and rejects a DATABASE_URL. Its local AuthService is not Canonical identity authority; the broker session bridge is default-off and the production adapter is not composed.

**Recommended:** do not extend the demo AuthService or create a new production Education login. Family OS / Corporate OS use the trusted Phoenix Core identity and call Canonical APIs. Keep the in-memory demo isolated or retire it after the production replacement is verified.

**Decision requested:** confirm that the in-memory Education Compass login is not a production entry and will not be extended as a second account system.

## 9. Still HOLD

No lesson-hour package, payment activation, debit, cancellation/no-show, make-up, expiry, refund or teacher settlement implementation. This remains Founder HOLD and is excluded from all candidate migrations.

## 10. Next gate

After Founder decisions:
1. Codex updates the design and exact source gap matrix.
2. Assistant performs the direct Xuanwu-style security second pass.
3. Codex writes a separate minimal forward migration proposal (not yet executable/installed).
4. Founder approves SQL authoring.
5. Candidate SQL is authored and tested on disposable PG16/17 clusters.
6. Founder separately approves any shared non-production install and later production release.

No migration number is allocated by this decision brief.
