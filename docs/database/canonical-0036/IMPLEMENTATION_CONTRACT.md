# 0036 candidate — provenance and explicit professional needs

**POLICY APPROVED / ISOLATED IMPLEMENTATION CANDIDATE**. Founder is responsible for C-1–C-4. [Approval binding](FOUNDER_C1_C4_APPROVAL.md). No new Person, Family, Student, Principal, Client, CMS or Health medical database is created. SQL0001–0035 remain byte-identical.

| Existing authority / object | Additive candidate behavior |
|---|---|
| `crm.lead_sources` | Existing source authority retained; no runtime source is seeded |
| `crm.acquisition_contract_revisions` | New immutable technical reference to a reviewed source/entry revision, manifest, optional GEO revision/hash, approval and applicable retention evidence, exact app LOGIN and validity interval; not a content store |
| `crm.lead_attributions` | Optional new typed provenance plus source-event idempotency and actual recorder LOGIN; legacy rows stay unchanged. V2 can omit the old four-value scenario code rather than invent Identity/Wealth codes |
| `crm.lead_events` | Append-only NEED_ASSERTED / NEED_SUPERSEDED / NEED_RETRACTED; explicit EDUCATION / IDENTITY / WEALTH / HEALTH domain, user/advisor evidence kind, protected human principal and subject/case, prior event, source policy, evidence hash and technical recorder |
| Consultation / Deal / Service Project | Existing Lead links retained; no mandatory historical need backfill or automatic sales/project creation |

An entry reference states where a request entered. A typed assertion states an authenticated human's selected or confirmed professional need. The existing Deal/service contract states what was sold. These facts remain separate. FAMILY_COMPASS is never mapped automatically to WEALTH; First Touch remains immutable. An unknown live Identity/Wealth entry code is not guessed.

## Controlled functions and exact privileges

| Function | Capability role | Boundary |
|---|---|---|
| `crm.register_acquisition_contract` | migrator | Explicit reviewed manifest/approval/retention references and hashes; real nonprivileged app LOGIN; exact source/revision; explicit validity. Same ID/payload retries are stable; mutation/reactivation is denied |
| `crm.revoke_acquisition_contract` | migrator | Evidence-required, terminal revocation; no runtime role receives registration/revocation |
| `crm.create_lead_v2` | app | Existing protected canonical_crm_v2 SERVICE context; approved source contract for this exact LOGIN; existing family/contact scope; derives provenance server-side; creates Lead and First Touch atomically |
| `crm.record_conversion_attribution_v2` | app | Existing qualified/converted Lead and active partner/source scope; separate conversion touch and source-event key; never rewrites entry |
| `crm.assert_lead_need` | app | Existing protected FAMILY/ADVISOR context, separate binder LOGIN and one-use ticket. No caller-supplied human principal. Same key/payload returns the prior event; different payload is denied |
| Internal helpers / triggers | none at runtime | PUBLIC EXECUTE revoked; no app DML or registry SELECT. Registry enables FORCE RLS with no permissive runtime policy |

The authenticated human and database recorder are separate columns. User selection is the current person's own planning choice, not an assertion on behalf of a child. An advisor confirmation derives its subject from the assigned case and requires an active case, current assignment and applicable current Consent. Existing Education/Identity case contracts are reused; advisor Wealth/Health confirmation stays closed until an applicable scope/Consent contract exists. A SERVICE cannot assert somebody else's confirmation. A future delegated-SERVICE human-proof path is not fabricated by this candidate.

Supersession/retraction must stay in the same Lead, domain, evidence kind, human author and subject/case. Unique successor constraints prevent forks; retracted tips cannot be reactivated. Distinct human/evidence chains may coexist; there is no automatic primary need or last-write-wins projection. Own access-reducing retraction remains possible after source/Consent expiry or revocation, subject to a valid authenticated family context and the same author chain. This does not delete retained evidence or retract somebody else's confirmation.

## Unresolved runtime facts — EVIDENCE HOLD

All source/contract rows are absent after Migration. The actual source-system/entry/GEO release inventory, real issuer/audience/JWKS and approved route commit, app/binder/signing protected references and applicable classification/retention terms must be verified privately. References and hashes are administrative evidence checked by the privileged registrar; they are not a cryptographic Founder-signature verifier. No real retention period or live endpoint is inferred from synthetic fixtures. No live writer is enabled by this Migration.

The unsigned backup digest detects corruption, not malicious substitution of both dump and manifest. Production backup signing, destinations, encryption, retention and RPO/RTO remain under their separate decision gate. No actual keys, server topology, raw operational logs or backups belong in this public candidate.

The original0035 verifier remains unchanged. The new versioned inventory permits exactly35 frozen files plus this0036, with exact runner hashes and catalog expectations36/93/83. Existing five required check contexts and normal independent review remain in place. Candidate CI is not human merge approval.
