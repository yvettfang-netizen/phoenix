# Founder Decisions Required — P0.1 Contract Closure

**Status:** CLOSED BY FOUNDER on 2026-11-21. See [Founder Approval Record](FOUNDER_APPROVAL_RECORD.md).  
**Authorization:** Codex may author candidate forward SQL and run disposable PG16/17 tests. No shared database install or production action is approved.

| Decision | Founder resolution |
|---|---|
| One Principal / multiple capabilities | APPROVED. Student, Parent and Teacher derive from existing Canonical facts; only Academy Admin/Founder use narrow revocable grants. |
| Student and Staff context | APPROVED. Add STUDENT; allow global STAFF with NULL family_id; reuse existing context tickets/session contexts. |
| Admin / Founder permissions | APPROVED. Admin manages Academy teaching operations; Founder has global oversight and grant governance. Bootstrap initial Founder grant only through controlled internal service. |
| Delivery-mode authority | APPROVED. Active LEAD teacher only; ASSISTANT is read-only for mode changes. Students/parents cannot self-select or mutate. |
| Hybrid finalization | APPROVED. One slot/roster; at least one Online and one Onsite participant. Otherwise use ONLINE or ONSITE. |
| Timezone and buffers | APPROVED. Room timezone for ONSITE/HYBRID; LEAD teacher explicitly chooses IANA timezone for ONLINE; UTC instants; reject DST gaps, require explicit offset for folds; no default travel/setup buffer. |
| Assessment model | APPROVED IN PRINCIPLE. Separate attempt/result plus append-only attempt events; student-subject ownership, no single family owner; six independent scales. Third-party report licensing/retention must be settled before real report binaries are stored. |
| Education Compass login | APPROVED. In-memory login remains isolated demo only; no second production login. Family OS and Corporate OS use Phoenix Core / Canonical. |
| Lesson-hour commercial rules | HOLD. No purchase/debit/cancel/no-show/make-up/expiry/refund/teacher settlement implementation. |

## Implementation gate

Codex is authorized to create a separate candidate forward-SQL Draft PR and run disposable PostgreSQL 16/17 tests with synthetic data. Codex must perform source/API/RLS/ACL review and the assistant performs the direct Xuanwu-style security pass. Jimson is exception-only for private/manual operations unavailable to Codex.

No migration number is reserved. Scan current main and all candidate manifests before allocation. Do not edit 0001–0037. Do not install in a shared database or deploy production. Founder must separately approve shared non-production installation, merge/release and production deployment.
