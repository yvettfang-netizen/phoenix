# Academic Studio V2.1 P0.1 — security second pass

**Status: HOLD.** This is a separate, security-focused analysis by the assistant under the current [Codex First / Xuanwu direct-review rule](../../engineering/CODEX_FIRST_JIMSON_MANUAL_ONLY.md). It is **not** an attestation from a separate human or GitHub account. It reviews the fixed source baseline `phoenix/PR #83 @ 80cbf0d98b346f12587568689196e07a8f6e481e`, formal migrations 0001–0037, and the two local disposable clusters. No 0038/0039/0042 candidate was installed.

## Findings

### S1 — HIGH: family membership expiry is not enforced on the next Learning read

In both PG16 and PG17, a real app LOGIN redeemed a one-use ticket, read one published learning card, then stayed on the same backend while a separate connection ended the actor's family membership. The next read still returned one card:

```text
before_membership_revoke=1
after_membership_revoke=1
```

The read predicate in [`0022_learning_core.sql`](../../../database/canonical/migrations/0022_learning_core.sql) checks a live context, matching family ID, guardian authority and Consent, but does not check the actor's *current* family membership. [`auth.validate_context_request()`](../../../database/canonical/migrations/0022_learning_core.sql) checks membership when the ticket is issued/redeemed. A later membership change therefore leaves the already-bound read valid until context expiry, even though the P0.1 negative acceptance requires next-read denial. This finding applies to the tested `learning.read_published_card()` path; other projections require their own scope audit.

**Required next gate:** add a reviewed forward change to the common Learning sensitive-read guard, or a narrower equivalent, that rechecks active family membership on each family read. Add a regression that revokes membership *after* redemption on the same backend. Check every family-scoped Learning read helper before approval. Do not edit 0022.

### S2 — MEDIUM: multi-role identity is not represented by two Principal kinds

`auth.principals.person_id` is unique and `principal_kind` is one scalar. A synthetic FAMILY Principal followed by a TEACHER Principal for the same Person produced `principals_person_id_key` rejection on both versions. The same FAMILY Principal **did** read its own student card and its verified child's card on both versions (`self_cards=1`, `authorized_cards=1`), proving database-level Student+Parent compatibility. The trusted default/switch route is absent. An actor who is also a teacher cannot use two existing Principal kinds. The Academy contract must define trusted capabilities over one Principal without cloning the Person or introducing a second session model. An implementation is **not** approved in this review.

### S3 — HIGH for scheduling integrity: room and student collisions are accepted

The GiST exclusion rejects the same teacher's overlapping slots. It has no room or student dimensions. The synthetic probe inserted two slots for different teachers with the same `room_label` and overlapping time, and placed one student in both simultaneously scheduled classes. Both versions accepted these rows. `learning.create_schedule_slot()` checks teacher assignment but does not check room or student occupancy. The P0.1 scheduling gate remains closed until stable room identity and per-student slot allocation have concurrency-safe database enforcement.

### S4 — PR #77 / 0042 remains incompatible and CI-failing

The current 0042 candidate in PR #77 creates `auth.workspace_sessions` and new workspace ticket/context functions; its PG16/17 workspace jobs failed on SQL syntax near `ELSE`. The Founder Academy decision prohibits a second session model and a multi-company tenant architecture. Do not install or copy 0042 into Academic Studio.

## Controls actually verified

| Control | Evidence | Result |
| --- | --- | --- |
| Separate binder and app LOGINs | Issued ticket through `p01_binder`; redeemed and read through `p01_app` | PASS on PG16/17 |
| Context clear | `auth.clear_context()` followed by same-backend read = 0 | PASS on PG16/17 |
| Consent withdrawal | Parent published-card read 1 → 0 | PASS on PG16/17 |
| Teacher assignment revocation | Teacher published-card read 1 → 0 | PASS on PG16/17 |
| Learning RLS/ACL | 14/14 tables FORCE RLS; separate reader LOGIN table read denied; internal helper EXECUTE denied | PASS on PG16/17 |
| Teacher time conflict | GiST exclusion rejected overlap | PASS on PG16/17 |

Raw commands and outputs: [`pg16-raw.log`](p01-evidence/pg16-raw.log), [`pg17-raw.log`](p01-evidence/pg17-raw.log), and the exact [probe source](p01-evidence/verify-pg.mjs). The generated credential files and owned test containers were removed by the probe. The logs omit one-time ticket values and do not contain passwords.

## Remaining security verification

Actual provider login, student-default route, explicit Parent switch, forged route/subject denial, guardian-only revocation, Partner-to-Learning isolation, repeated ticket rejection, connection-pool reuse and named nonproduction binding were **not** established by these P0.1 probes. Existing CI applies only to its named jobs and fixed head; it cannot turn these Academy-specific cases into PASS. A model security pass does not satisfy any separately required human sign-off.

**Security gate verdict: HOLD until S1 is fixed with a new forward proposal and negative regression; S2/S3 need approved design and tests.**
