# Four-layer rollback and recovery

This is an isolated development candidate. No production rollback or Tencent operation was executed. Never delete real projects or business events to roll back.

| Layer | Recovery action | Evidence / limit |
|---|---|---|
| Page/flag | Keep SERVICE_WORKBENCH_ENABLED unset/false; production mode refuses even if set. Disable synthetic preview login separately. Restore prior website artifact. | Unit tests default/production/foreign/Origin refusals. No real session/provider activation. |
| API/service | Remove optional serviceWorkbench injection or restore prior backend artifact; prefix404 without dependency. Drain owned app/binder pools, clear/discard; client refuses unavailable/invalid DTO and clears old data. | API audit failure returns503 with no partial business command; revoked session rejected; no context/tickets left. Prior routes retain existing test coverage. |
| Database compatibility | Additive0038 candidate only; prior37 files unchanged. Revert API/flags first; leave new tables/history in place. Fix with a separately reviewed forward migration. **No destructive down migration**. | Fresh/repeat/drift/atomic rollback; logical snapshot restores into empty owned cluster and verifies exact ledger,100 table count/digests,90 policy definitions, protected audit and object checksums before replaying full API suite. Active local databases and production untouched. |
| Business compensation | Authorized manager appends STAGE/TASK_CREATE/PROJECT_STATUS correction with original same-project event ID and reason. Use reviewable task to correct operational work. Preserve old event, receipt, application external facts and financial source history. | Regression denies adviser compensation, accepts manager linked correction, preserves original event. Official outcome reversal/refund/contract correction is **not** implemented; stop and seek source-owner authorization, do not fabricate a new result. |

## Drill and recovery procedure

1. Save exact source/candidate SHA and current evidence; isolate access by flags and session revocation.
2. Verify symptoms from authorized projection and protected audit; do not copy private bytes into public logs.
3. Test recovery only in the labelled local disposable cluster created by verification/v0038. The runner verifies Docker context is a local socket and all published ports are127.0.0.1.
4. Dedicated backup LOGIN exports custom archive and roles without role passwords using0600 pgpass. Save archive/roles/object SHA manifest in the private fixture directory.
5. Validate hashes **before restore**; intentionally altered archive must be rejected. An unsigned manifest cannot authenticate an attacker who rewrites both manifest and archive; signing/keys/remote destination remain HOLD.
6. Bootstrap roles into an empty new cluster; restore; compare complete table fingerprints, ledger, policies, audit and private object hashes **before new writes**. Rotate app/binder/Operations credentials. Disable restored backup LOGIN.
7. Add a new synthetic project referencing the same masters; run the full separated-LOGIN regression again. Do not duplicate Person/Family/Client for this replay.
8. Record elapsed logical recovery, then remove only labelled owned containers with their own anonymous volumes and verified task temporary directories. No historical volume cleanup. Keep a separately requested synthetic preview labelled and document its shutdown procedure.

## Explicit limitations

Logical fresh-cluster restoration PASS is not full disaster-recovery readiness. WAL/PITR, approved RPO/RTO, backup schedule/destination/retention/encryption/signing/restore operator responsibilities remain HOLD. No test substitutes an unapproved real business retention policy. No production down migration, actual version rollback or business compensation on real data has occurred.
