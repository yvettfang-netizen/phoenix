# Founder acceptance gate — Service Project Workbench V1

**HOLD for merge and real activation.** Current authority: isolated development + synthetic tests + a Draft PR/retained local preview only. Founder has not signed this candidate's final acceptance. Codex is the executor, not a substitute independent reviewer.

| Item | Status | Required evidence/action |
|---|---|---|
| Existing architecture/master reuse | PASS | [Audit](AUDIT.md); unique authority; unchanged0001–0037 |
| HK master's real DB-backed development workflow | PASS at mechanism level | [Contract](DATA_CONTRACT.md), real API/PG acceptance; final exact-HEAD checks still required |
| Full browser/clean repository regressions at final SHA | HOLD until final PR checks | New PG16/17 workbench matrix plus existing website/backend/Canonical checks. Preserve local dependency failures; do not infer PASS. |
|0038 review/number reservation/merge sequence | HOLD | Draft stacked on PR58; refresh latest main/forward candidates before promotion;0038 remains outside active migrations. Review forward SQL and source permissions independently. |
| Real login/provider/staff/family mapping | HOLD | Actual issuer/audience/JWKS, current ownership/config ACL/rotation, approved staff principal and subject registration. No real person IDs or secrets in public PR. |
| Commercial-source authority | HOLD | Verify actual phoenix_operations source service, signing/payment/opening event schema/signature/version and project references; approve waiver/opening rules. No new contract/payment master. |
| Document policy | HOLD | Approve per-document classification, subject Consent, sensitive-document handling, retention/legal hold/purge, private provider and malware/content controls before real uploads. Seven-day synthetic retention is not business policy. |
| Clinical and other templates | HOLD | Health is metadata-only; medical/claim records remain closed. Identity/Wealth business/file contracts remain separate. No ordinary timeline medical content. |
| Backup/operations | HOLD | Signing/encryption/destination/retention/schedule/ownership, approved RPO/RTO and WAL/PITR/staging drill. Logical synthetic restore alone does not satisfy full DR. |
| Independent engineering/security/governance/business approval | HOLD | Real named reviewer against exact SHA, not Codex-generated signatures |
| Deployment/production/real import | HOLD | Not requested or performed; no Tencent or production migration |

## Local preview and reproduction

From a clean checkout with existing locked dependencies installed:

1. Build existing backend using its `npm run build`.
2. Run `node database/canonical/verification/v0038/preview.mjs` from repository root. It refuses an existing preview configuration, starts only a labelled synthetic PG16 cluster and loopback API/site, and prints the local URL. It never uses production credentials.
3. At `/zh/my-services` or `/en/my-services`, select a clearly labelled synthetic account. Use Client A, Adviser A, Reviewer B and Manager in separate browser profiles/contexts for the upload/review/acceptance workflow. These are test aliases, not registered real identities. A cannot read same-family B's project.
4. No HTTP request comes from a browser directly to PostgreSQL. Contract/payment are read-only; unpurchased/unopened services are not displayed as active. Health medical controls are unavailable.
5. Stop the owned preview with Ctrl+C. The process removes only its labelled container/anonymous volume and verified private fixture directory; it does not delete an existing Canonical database, old volumes or real events. A retained preview's local metadata is ignored `out/service-project-workbench-v1/retained-preview.json`.

**Unique next action:** inspect the final Draft PR and retained synthetic preview against this gate, obtain actual independent review, and supply the missing real identity/source/document-policy facts before any proposal to activate real access. Merge and deployment require separate Founder authorization.
