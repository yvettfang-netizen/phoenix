# Founder pre-merge decision record — unsigned

**Overall gate: HOLD.** This page is a decision form, not a Founder signature or approval. The public integration branch and Draft PR are review artifacts. No merge, production deployment, Tencent upgrade or real-data operation is authorized by their existence.

| Required signoff | Current evidence | State |
|---|---|---|
| Jimson database engineering acceptance | Source/copy manifest, PG16/17 evidence and Draft PR are presented here; no human Jimson signature found in this gate. | PENDING |
| 玄武 independent security conclusion | Codex performed the security lens and wrote [`SECURITY_AND_BRANCH_PROTECTION_REPORT.md`](SECURITY_AND_BRANCH_PROTECTION_REPORT.md). This is not a separate 玄武 signature. | PENDING |
| 白虎 data governance conclusion | Codex reviewed authority and privacy boundaries; patient Consent, retention and real-data use remain HOLD. This is not a separate 白虎 signature. | PENDING |
| 麒麟 business completeness conclusion | [`FOUR_COMPASS_FIELD_CONTRACT_AUDIT.md`](FOUR_COMPASS_FIELD_CONTRACT_AUDIT.md) identifies Identity/Wealth `compass_kind` uncertainty. This is not a separate 麒麟 signature. | PENDING |
| Founder M0–M5 acceptance | All six private milestone `FOUNDER_ACCEPTANCE.md` forms still say `PENDING`. | PENDING |
| Founder permission to merge into `phoenix/main` | No signed mainline integration approval found. | PENDING |

## Decision required

1. Resolve the exact Identity/Wealth Compass product-code mapping. If they are distinct products, authorize forward Migration 0036+ and rerun both versions and branch CI before approval.
2. Have the repository owner enable main branch protection/ruleset and verified CODEOWNERS review; require the new database CI and current website/Compass checks.
3. Obtain each named independent review and Jimson signoff, then sign M0–M5 acceptance and this integration decision against an exact integration commit SHA and Draft PR URL.

**Founder decision:** ☐ APPROVE integration merge after all gates PASS　☐ RETURN FOR CHANGES　☐ REJECT

**Integration commit SHA:** ____________________  **Draft PR URL:** ____________________

**Founder signature/date:** ____________________

Even after a future merge, Tencent database upgrade, real customer import, SQLite/Feishu migration, four-Compass production writes, Health medical records, production switch, old database deletion and private history deletion remain **HOLD** unless independently authorized.
