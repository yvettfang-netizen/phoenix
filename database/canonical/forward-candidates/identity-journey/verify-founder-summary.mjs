import assert from "node:assert/strict";
import { identityRenewalMetricKeys, readFounderIdentitySummary } from "../../../../website/phoenix-nova-website-v5/lib/identity-journey-founder-summary.ts";

export async function verifyFounderSummary({ query, recipient, crmFixture }) {
  const id = n => `01910000-0000-7000-8100-${String(n).padStart(12, "0")}`;
  const organization = id(300);
  const outsideOrg = id(301);
  const request = headers => new Request("https://nova.synthetic.invalid/founder/identity-summary", { headers });
  query(`INSERT INTO core.organizations(organization_id,legal_name,display_name,organization_type,country_code,
    created_by_principal_id,updated_by_principal_id) VALUES
    ('${organization}','Synthetic Identity Organization','Synthetic Identity Organization','ENTERPRISE','HK','${id(21)}','${id(21)}'),
    ('${outsideOrg}','Synthetic Outside Organization','Synthetic Outside Organization','ENTERPRISE','HK','${id(21)}','${id(21)}');
    CREATE TABLE identity_journey_test.founder_case_scope (
      organization_id uuid NOT NULL REFERENCES core.organizations,
      case_id uuid NOT NULL REFERENCES identity.cases, PRIMARY KEY (organization_id,case_id)
    );
    INSERT INTO identity_journey_test.founder_case_scope VALUES ('${organization}',:'caseId'::uuid);`, recipient);

  for (const [index, days] of [90, 91, 180, 181, 30].entries()) {
    const base = 320 + index * 10;
    const home = id(base), subject = id(base + 1), principal = id(base + 2), journeyCase = id(base + 3),
      episode = id(base + 4), doc = id(base + 5), stay = id(base + 6);
    const values = { home, subject, principal, journeyCase, episode, doc, stay, days,
      organization: days === 30 ? outsideOrg : organization };
    query(`INSERT INTO core.families(family_id,display_name) VALUES(:'home'::uuid,'Synthetic metrics household');
      INSERT INTO core.people(person_id,display_name) VALUES(:'subject'::uuid,'Synthetic subject');
      INSERT INTO auth.principals(principal_id,person_id,principal_kind,status)
        VALUES(:'principal'::uuid,:'subject'::uuid,'FAMILY','ACTIVE');
      INSERT INTO identity.cases(identity_case_id,family_id,subject_person_id,case_kind,status)
        VALUES(:'journeyCase'::uuid,:'home'::uuid,:'subject'::uuid,'SYNTHETIC_SUMMARY','UNDER_REVIEW');
      INSERT INTO identity.journey_episodes(episode_id,identity_case_id,started_on,recorded_by)
        VALUES(:'episode'::uuid,:'journeyCase'::uuid,(clock_timestamp() AT TIME ZONE 'Asia/Hong_Kong')::date-10,:'principal'::uuid);
      INSERT INTO docs.documents(document_id,family_id,subject_person_id,data_class,document_kind,retention_until)
        VALUES(:'doc'::uuid,:'home'::uuid,:'subject'::uuid,'IDENTITY_SENSITIVE','SYNTHETIC_METRICS',clock_timestamp()+interval '1 day');
      INSERT INTO identity.journey_date_revisions(date_revision_id,identity_case_id,episode_id,date_kind,date_basis,
        target_on,verification,document_id,verified_by,recorded_by)
        VALUES(:'stay'::uuid,:'journeyCase'::uuid,:'episode'::uuid,'STAY_EXPIRY','CASE_APPROVAL',
          (clock_timestamp() AT TIME ZONE 'Asia/Hong_Kong')::date + :'days'::integer,
          'VERIFIED',:'doc'::uuid,:'principal'::uuid,:'principal'::uuid);
      INSERT INTO identity_journey_test.founder_case_scope VALUES(:'organization'::uuid,:'journeyCase'::uuid);`, values);
    if (days === 90 || days === 91) {
      query(`INSERT INTO identity.journey_date_revisions(date_revision_id,identity_case_id,episode_id,date_kind,date_basis,
        target_on,verification,recorded_by) SELECT '${id(base + 7)}',identity_case_id,episode_id,'FIRST_ENTRY_DEADLINE',
        'CASE_APPROVAL',target_on,'REPORTED',:'principal'::uuid FROM identity.journey_date_revisions WHERE date_revision_id=:'stay'::uuid;
        INSERT INTO identity.journey_station_reminders(reminder_id,identity_case_id,episode_id,date_revision_id,date_kind,
          target_on,offset_days,recipient_principal_id,state,attempt_count,retry_not_before)
        SELECT '${id(base + 8)}',identity_case_id,episode_id,date_revision_id,'STAY_EXPIRY',target_on,1,:'principal'::uuid,
          'RETRY',1,clock_timestamp()+interval '5 minutes' FROM identity.journey_date_revisions WHERE date_revision_id=:'stay'::uuid;`, values);
    }
  }

  const project = id(80);
  const duplicateServiceLinks = [{ case_id: recipient.caseId, project_id: project }, { case_id: recipient.caseId, project_id: project }];
  // The same prior consultation has since been withdrawn. It is excluded by
  // the approved-source side independently of the planning case whitelist.
  const discoveredConsultations = () => query(`SELECT coalesce(jsonb_agg(jsonb_build_object(
    'case_id', reminder.identity_case_id, 'lead_event_id', receipt.lead_event_id)), '[]')
    FROM identity.journey_crm_handoffs receipt
    JOIN consent.identity_journey_crm_intents intent USING(consent_id)
    JOIN identity.journey_station_reminders reminder ON reminder.reminder_id=intent.notice_id
    WHERE intent.accepted_topic='RENEWAL' AND intent.withdrawn_at IS NULL AND intent.expires_at > clock_timestamp();`);
  assert.deepEqual(JSON.parse(discoveredConsultations()), []);
  const allowed = { role: "FOUNDER", domain: "IDENTITY", purpose: "IDENTITY_RENEWAL_SUMMARY", organizationId: organization,
    expiresAt: Date.now() + 60_000, policy: { revision: "synthetic-policy-v1", minimumHouseholds: 2 } };
  let approved = allowed;
  let revoked = false;
  let hasData = true;
  let badProvider = false;
  const audits = [];
  const provider = {
    async bind() {
      if (!approved || approved.organizationId !== organization) return null;
      return {
        ...approved,
        async assertCurrent() { return !revoked; },
        async recordAudit(_, phase) { audits.push(phase); },
        async readAggregates(k) {
          const data = JSON.parse(query(`SELECT identity.founder_renewal_metrics(:'organization'::uuid,
            ARRAY(SELECT case_id FROM identity_journey_test.founder_case_scope
              WHERE organization_id=:'organization'::uuid AND :'hasData'::boolean),
            :'consultations'::jsonb, :'projects'::jsonb, :'k'::integer);`,
          { organization, hasData, k, consultations: discoveredConsultations(), projects: JSON.stringify(duplicateServiceLinks) }));
          if (badProvider) data.metrics.verifiedRenewalDates = 1;
          return { ...data, internalCaseIds: [recipient.caseId], leadIds: [crmFixture.lead] };
        },
      };
    },
  };
  const read = () => readFounderIdentitySummary(request(), provider);
  assert.equal((await readFounderIdentitySummary(request())).status, 403);
  assert.equal((await readFounderIdentitySummary(request({ "x-role": "FOUNDER" }), provider)).status, 403);
  for (const invalid of [null, { ...allowed, role: "DISPATCHER" }, { ...allowed, organizationId: outsideOrg },
    { ...allowed, domain: "EDUCATION" }, { ...allowed, purpose: "SALES_OUTREACH" },
    { ...allowed, policy: null }, { ...allowed, expiresAt: Date.now() - 1 }]) {
    approved = invalid;
    assert.equal((await read()).status, 403);
  }
  assert.equal(audits.length, 0);
  approved = allowed;
  const overview = await read();
  assert.equal(overview.status, 200);
  assert.equal(overview.headers.get("cache-control"), "private, no-store");
  const data = await overview.json();
  assert.deepEqual(Object.keys(data).sort(), ["asOfDate", "metrics", "status"]);
  assert.deepEqual(Object.keys(data.metrics).sort(), [...identityRenewalMetricKeys].sort());
  assert.deepEqual(data.metrics, {
    dueWithin90Days: 2, dueIn91To180Days: 2, datesToVerify: 2, reminderFailures: 2,
    authorizedRenewalConsultations: null, unassignedIdentityLeads: null, renewalServicesInProgress: null,
    renewalServicesCompleted: null, verifiedRenewalDates: null, serviceExceptions: null,
  });
  assert.deepEqual(audits, ["ATTEMPT", "PREPARED"]);
  hasData = false;
  assert.deepEqual(await (await read()).json(), { status: "NO_DATA" });
  hasData = true;
  badProvider = true;
  assert.equal((await read()).status, 503);
  badProvider = false;
  revoked = true;
  assert.equal((await read()).status, 403);
  assert.equal(query(`SELECT has_function_privilege('phoenix_canonical_app',
    'identity.founder_renewal_metrics(uuid,uuid[],jsonb,jsonb,integer)', 'EXECUTE');`), "f");
  console.log("PASS scoped Founder summary of linked renewal, 90/180 boundaries, no sales conversion, small household cohorts suppressed");
}
