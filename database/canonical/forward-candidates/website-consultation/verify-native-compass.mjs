import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createNativeCompassService } from "./native-compass-service.mjs";

export async function verifyNativeCompass({
  db, crmService, staff, Pool, connection, sourceFile, bindFamily, actor,
  familyPrincipal, otherFamily, mismatchFamily, principal, reviewerPrincipal,
  educationLead, cancelLead, publisherContracts, fixtureId, hash,
}) {
  const local = file => readFile(new URL(file, import.meta.url), "utf8");
  await db.query(await local("./native-compass-consent.sql"));
  await db.query(await local("./identity-native-authority.sql"));
  const roles = {
    fixture_native_binder: null,
    fixture_education_publisher: "phoenix_education_crm_reference_publisher",
    fixture_identity_publisher: "phoenix_identity_crm_reference_publisher",
    fixture_identity_writer: "phoenix_identity_assessment_writer",
  };
  for (const [login, role] of Object.entries(roles)) {
    await db.query("CREATE ROLE " + login + " LOGIN");
    if (role) await db.query("GRANT " + role + " TO " + login + " WITH INHERIT TRUE, SET FALSE");
  }
  await db.query(`GRANT CONNECT ON DATABASE phoenix_website_intake_fixture TO fixture_native_binder,
    fixture_education_publisher,fixture_identity_publisher,fixture_identity_writer;
    GRANT USAGE ON SCHEMA auth TO fixture_native_binder;
    GRANT EXECUTE ON FUNCTION auth.issue_application_family_context_ticket(text,text,text,timestamptz,uuid)
      TO fixture_native_binder`);

  const dedicatedContracts = {};
  for (const [i, domain] of ["EDUCATION", "IDENTITY"].entries()) {
    const id = fixtureId(230 + i);
    const registered = await db.query(`SELECT crm.register_native_compass_contract($1,$2,'native-synthetic',$3,
      'synthetic approval',$3,'synthetic retention',$3,$4,
      clock_timestamp()-interval '1 minute',clock_timestamp()+interval '1 hour') AS id`,
    [id, domain, hash, domain === "EDUCATION" ? "fixture_education_publisher" : "fixture_identity_publisher"]);
    assert.equal(registered.rows[0].id, id);
    dedicatedContracts[domain] = id;
  }

  const registerWithWrongLogin = await db.query(`SELECT crm.register_native_compass_contract($1,'IDENTITY','wrong-login',$2,
    'synthetic approval',$2,'synthetic retention',$2,'fixture_education_publisher',now(),now()+interval '1 hour') AS id`,
  [fixtureId(232), hash]);
  assert.equal(registerWithWrongLogin.rows[0].id, null);
  const familyKey = family => "fam_" + family.replaceAll("-", "");
  const issuer = "https://synthetic-compass-session.example.test";
  const subject = "usr_synthetic_family_applicant";
  await db.query(`INSERT INTO auth.external_identities(external_identity_id,issuer,subject,principal_id,status)
    VALUES($1,$2,$3,$4,'ACTIVE')`, [fixtureId(200), issuer, subject, familyPrincipal]);
  for (const [i, family] of [otherFamily, mismatchFamily].entries()) {
    await db.query(`INSERT INTO integration.legacy_id_mappings(mapping_id,source_system,entity_kind,legacy_id,canonical_id,
      mapping_status,evidence_ref,managed_lifecycle_version,proposed_by_principal_id,proposed_at,proposal_request_nonce,
      application_ownership_evidence_ref,application_ownership_evidence_sha256,canonical_membership_evidence_ref,
      canonical_membership_evidence_sha256,founder_approval_evidence_ref,founder_approval_evidence_sha256,
      decided_by_principal_id,decided_at,verification_request_nonce)
      VALUES($1,'PHOENIX_FAMILY_OS','FAMILY',$2,$3,'VERIFIED','evidence://synthetic/compass',
      'FM_V1',$4,clock_timestamp(),gen_random_uuid(),'evidence://synthetic/ownership',$6,
      'evidence://synthetic/membership',$6,'evidence://synthetic/approval-not-real',$6,
      $5,clock_timestamp(),gen_random_uuid())`,
    [fixtureId(201 + i), familyKey(family), family, principal, reviewerPrincipal, hash]);
  }

  const pools = Object.keys(roles).map(user => new Pool({ ...connection, user, max: 1 }));
  try {
    let sessionRevoked = false;
    const resolveFamilySession = async authorization => {
      if (!["synthetic-session-a", "synthetic-session-b"].includes(authorization)) return null;
      const family = authorization.endsWith("-a") ? otherFamily : mismatchFamily;
      return { iss: issuer, sub: subject, application_family_id: familyKey(family),
        exp: Math.floor(Date.now() / 1000) + 60, assertCurrent: async () => {
          if (sessionRevoked) throw new Error("Synthetic session revoked");
        },
      };
    };
    const deps = { enabled: true, authorizationPool: pools[0], resolveFamilySession };
    const ed = createNativeCompassService({ ...deps, domain: "EDUCATION", operationPool: pools[1] });
    const identity = createNativeCompassService({ ...deps, domain: "IDENTITY", operationPool: pools[2] });
    const identityWriter = createNativeCompassService({
      ...deps, domain: "IDENTITY", purpose: "IDENTITY_SUBMISSION", operationPool: pools[3],
    });
    assert.equal(createNativeCompassService({ enabled: false }), undefined);
    for (const domain of ["HEALTH", "WEALTH"]) {
      assert.throws(() => createNativeCompassService({ ...deps, domain, operationPool: pools[2] }), /unavailable/);
    }

    const session = "synthetic-session-a", otherSession = "synthetic-session-b";
    const call = async (query, params) => (await crmService.query(query, params)).rows[0].outcome;
    const readReference = event => crmService.query("SELECT * FROM crm.read_compass_event($1)", [event]);
    const projectCount = async () => (await db.query("SELECT count(*)::int AS n FROM service.projects")).rows[0].n;
    const initialProjects = await projectCount();
    const revision = "synthetic-reference-v1";
    const notice = domain => db.query(`INSERT INTO consent.compass_reference_notices
      (domain,revision,text_sha256,approval_ref,max_lifetime,accepts_new)
      VALUES($1,$2,$3,'synthetic only – no approval',interval '1 hour',true)`, [domain, revision, hash]);
    const receipt = (n, assessmentId) => ({ evidenceId: fixtureId(n), assessmentId, noticeRevision: revision,
      accepted: true, expiresAt: new Date(Date.now() + 20 * 60_000) });

    await bindFamily(otherFamily);
    const request = { submissionId: randomUUID(), questionnaireRevision: "identity-candidate-v1", sha256: hash };
    const submitted = await identityWriter.submit(session, randomUUID(), request);
    assert.match(submitted, /^[0-9a-f-]{36}$/);
    assert.equal(await identityWriter.submit(session, randomUUID(), request), submitted);
    assert.equal(await identityWriter.submit(session, randomUUID(), { ...request, sha256: "a".repeat(64) }), null);
    assert.deepEqual((await db.query(`SELECT family_id,applicant_id,submitted_by,questionnaire_revision,
      submitted_at IS NOT NULL AS sealed FROM identity.compass_assessments WHERE assessment_id=$1`, [submitted])).rows,
    [{ family_id: otherFamily, applicant_id: actor, submitted_by: familyPrincipal,
      questionnaire_revision: request.questionnaireRevision, sealed: true }]);
    await assert.rejects(crmService.query("SELECT * FROM identity.compass_assessments"), { code: "42501" });
    await assert.rejects(pools[2].query("SELECT identity.submit_compass_assessment($1,$2,$3)",
      [request.submissionId, request.questionnaireRevision, hash]), { code: "42501" });
    const identityEvent = { eventId: fixtureId(204), leadId: educationLead,
      contractId: dedicatedContracts.IDENTITY, assessmentId: submitted };
    assert.equal(await identity.publish(session, randomUUID(), identityEvent), null, "IDENTITY_CASE cannot authorize sharing");
    const idReceipt = receipt(205, submitted);
    assert.equal(await identity.acceptSharing(session, randomUUID(), idReceipt), null, "unconfigured notice");
    await notice("IDENTITY");
    assert.equal(await identity.acceptSharing(session, randomUUID(), { ...idReceipt, accepted: false }), null);
    assert.equal(await identity.acceptSharing(otherSession, randomUUID(), idReceipt), null);
    assert.equal(await identity.acceptSharing(session, randomUUID(), { ...idReceipt, assessmentId: fixtureId(206) }), null);
    assert.equal(await identity.acceptSharing(session, randomUUID(), idReceipt), idReceipt.evidenceId);
    assert.equal(await identity.acceptSharing(session, randomUUID(), idReceipt), idReceipt.evidenceId);
    assert.equal(await identity.acceptSharing(session, randomUUID(), { ...idReceipt, evidenceId: fixtureId(209) }), null,
      "overlapping evidence must not preserve access after withdrawal");
    assert.equal(await identity.publish(otherSession, randomUUID(), identityEvent), null);
    assert.equal(await identity.publish(session, randomUUID(), { ...identityEvent, contractId: dedicatedContracts.EDUCATION }), null);
    assert.equal(await identity.publish(session, randomUUID(), identityEvent), identityEvent.eventId);
    assert.equal(await identity.publish(session, randomUUID(), { ...identityEvent, eventId: fixtureId(207) }), identityEvent.eventId);
    assert.equal(await identity.publish(session, randomUUID(), { ...identityEvent, eventId: fixtureId(208), leadId: cancelLead }), null);
    assert.deepEqual((await readReference(identityEvent.eventId)).rows, [{ lead_id: educationLead, service_domain: "IDENTITY",
      assessment_id: submitted, source_system: "phoenix-nova-compass-identity" }]);
    await assert.rejects(staff.query("SELECT * FROM crm.read_compass_event($1)", [identityEvent.eventId]), { code: "42501" });
    await assert.rejects(staff.query("SELECT compass_assessment_id FROM crm.lead_events"), { code: "42501" });
    assert.equal(await identity.withdrawSharing(otherSession, randomUUID(), idReceipt.evidenceId), false);
    assert.equal(await identity.withdrawSharing(session, randomUUID(), idReceipt.evidenceId), true);
    assert.equal((await readReference(identityEvent.eventId)).rowCount, 0);
    assert.equal(await identity.publish(session, randomUUID(), identityEvent), null);
    assert.equal(await identity.acceptSharing(session, randomUUID(), idReceipt), null, "withdrawn receipt must never reopen");
    sessionRevoked = true;
    await assert.rejects(identity.publish(session, randomUUID(), identityEvent), /session revoked/);
    sessionRevoked = false;
    const context = await pools[2].query("SELECT auth.current_principal_id() AS principal");
    assert.equal(context.rows[0].principal, null);
    console.log("PASS native Identity sealed candidate, approved notice, distinct LOGINs, explicit sharing, retry, withdrawal, cross-family, staff denial and pool cleanup");

    if (sourceFile) {
      const sourceSql = (await readFile(sourceFile, "utf8")).replaceAll("\r\n", "\n");
      assert.equal(createHash("sha256").update(sourceSql).digest("hex"), "c02cd90ea37d800571772d54ac50bfb7597c919fc675c0ed3fe93b1d8e7692f6");
      await db.query("SET phoenix.education_compass_candidate='isolated'");
      await db.query(sourceSql);
      await db.query(await local("./education-native-publisher.sql"));
      await db.query("GRANT phoenix_education_compass_app TO website_fixture_crm_service WITH INHERIT TRUE, SET FALSE");
      const student = fixtureId(210), nativeGrant = fixtureId(211), nativeId = fixtureId(212);
      await db.query("INSERT INTO core.people(person_id,display_name) VALUES($1,'Synthetic candidate student')", [student]);
      await db.query("INSERT INTO core.student_profiles(person_id) VALUES($1)", [student]);
      await db.query("INSERT INTO core.family_memberships(membership_id,family_id,person_id,membership_role,valid_from) VALUES($1,$2,$3,'MEMBER',clock_timestamp())", [fixtureId(213), otherFamily, student]);
      await db.query(`INSERT INTO core.guardian_authorities(authority_id,family_id,guardian_person_id,subject_person_id,
        evidence_level,scope,valid_from,valid_until) VALUES($1,$2,$3,$4,'VERIFIED','EDUCATION',
        clock_timestamp()-interval '1 minute',clock_timestamp()+interval '1 hour')`, [fixtureId(214), otherFamily, actor, student]);
      await bindFamily(otherFamily);
      const message = { eventId: fixtureId(215), leadId: educationLead,
        contractId: dedicatedContracts.EDUCATION, assessmentId: nativeId };
      assert.equal(await ed.publish(session, randomUUID(), message), null);
      await notice("EDUCATION");
      const accepted = receipt(216, nativeId);
      assert.equal(await ed.acceptSharing(session, randomUUID(), accepted), null);
      assert.equal(await call(`SELECT education_compass.record_purpose($1,$2,'CORE_ASSESSMENT',
        'guardian_core_assessment_v1.0.0-rc1','334a1e8e455dfef386fcaf491acea3dac23b13c4ece010cfad66d1087f6a84a5',
        $3,clock_timestamp()+interval '30 minutes') AS outcome`, [nativeGrant, student, randomUUID()]), "RECORDED");
      assert.equal(await call("SELECT education_compass.open_draft($1,$2,'LEVEL_1',NULL,NULL,$3,NULL) AS outcome",
        [nativeId, student, nativeGrant]), "OPENED");
      assert.equal(await ed.acceptSharing(session, randomUUID(), accepted), null, "draft cannot be shared");
      const answers = Object.fromEntries(Array.from({ length: 8 }, (_, i) => ["FP0" + (i + 1), "synthetic"]));
      assert.equal(await call("SELECT education_compass.save_draft($1,1,$2) AS outcome", [nativeId, answers]), "SAVED");
      assert.equal(await call("SELECT education_compass.submit($1,2,$2) AS outcome", [nativeId, randomUUID()]), "SUBMITTED");
      assert.equal(await ed.publish(session, randomUUID(), message), null);
      assert.equal(await ed.acceptSharing(session, randomUUID(), accepted), accepted.evidenceId);
      await assert.rejects(pools[1].query("SELECT answers FROM education_compass.assessment"), { code: "42501" });
      await assert.rejects(pools[1].query("SELECT crm.record_compass_event($1,$2,$3,$4,'EDUCATION',$5)",
        [message.eventId, educationLead, student, publisherContracts.education, nativeId]), { code: "42501" });
      assert.equal(await call("SELECT crm.record_compass_event($1,$2,$3,$4,'EDUCATION',$5) AS outcome",
        [message.eventId, educationLead, student, publisherContracts.education, nativeId]), null);
      assert.equal(await ed.publish(session, randomUUID(), message), message.eventId);
      assert.equal(await ed.publish(session, randomUUID(), { ...message, eventId: fixtureId(217) }), message.eventId);
      assert.deepEqual((await readReference(message.eventId)).rows, [{ lead_id: educationLead, service_domain: "EDUCATION",
        assessment_id: nativeId, source_system: "phoenix-nova-compass-education" }]);
      assert.equal(await ed.withdrawSharing(session, randomUUID(), accepted.evidenceId), true);
      assert.equal((await readReference(message.eventId)).rowCount, 0);
      const acceptedAgain = receipt(218, nativeId);
      assert.equal(await ed.acceptSharing(session, randomUUID(), acceptedAgain), acceptedAgain.evidenceId);
      assert.equal((await readReference(message.eventId)).rowCount, 1);
      assert.equal(await call("SELECT education_compass.withdraw_purpose($1) AS outcome", [nativeGrant]), "WITHDRAWN");
      assert.equal((await readReference(message.eventId)).rowCount, 0);
      assert.equal(await ed.publish(session, randomUUID(), message), null);
      console.log("PASS native #74 Education trusted server publisher, dedicated LOGIN and actual candidate consent capture plus both withdrawal paths");
    } else {
      console.log("NOT RUN native Education publisher: pinned #74 source not supplied");
    }

    // Synthetic source fixtures only. Probe the exact scope matcher with a test-only
    // grant without enabling any Health/Wealth runtime consent or publisher.
    await db.query("GRANT EXECUTE ON FUNCTION consent.compass_reference_is_active(text,uuid,uuid) TO website_fixture_crm_service");
    for (const [offset, domain] of ["HEALTH", "WEALTH"].entries()) {
      await notice(domain);
      const ref = fixtureId(220 + offset), evidence = fixtureId(222 + offset);
      const active = (d = domain, id = ref, owner = actor) => call(
        "SELECT consent.compass_reference_is_active($1,$2,$3) AS outcome", [d, id, owner]);
      await bindFamily(otherFamily);
      await assert.rejects(db.query(`INSERT INTO consent.compass_reference_grants
        (evidence_id,domain,purpose,data_class,assessment_id,family_id,subject_id,signer_principal_id,signer_person_id,
          notice_revision,granted_at,expires_at)
        VALUES($1,$2,$2||'_COMPASS_CRM_REFERENCE','EDUCATION',$3,$4,$5,$6,$5,$7,now(),now()+interval '5 minutes')`,
      [evidence, domain, ref, otherFamily, actor, familyPrincipal, revision]), { code: "23514" });
      await db.query(`INSERT INTO consent.compass_reference_grants
        (evidence_id,domain,purpose,data_class,assessment_id,family_id,subject_id,signer_principal_id,signer_person_id,
          notice_revision,granted_at,expires_at)
        VALUES($1,$2,$2||'_COMPASS_CRM_REFERENCE',$2||'_SENSITIVE',$3,$4,$5,$6,$5,$7,now(),now()+interval '5 minutes')`,
      [evidence, domain, ref, otherFamily, actor, familyPrincipal, revision]);
      assert.equal(await active(), true);
      assert.equal(await active("EDUCATION"), false);
      assert.equal(await active(domain, ref, familyPrincipal), false);
      await bindFamily(mismatchFamily);
      assert.equal(await active(), false);
      await bindFamily(otherFamily);
      assert.equal(await call("SELECT crm.record_compass_event($1,$2,$3,$4,$5,$6) AS outcome",
        [fixtureId(224 + offset), educationLead, actor, publisherContracts[domain.toLowerCase()], domain, ref]), null);
      await db.query("UPDATE consent.compass_reference_grants SET withdrawn_at=clock_timestamp() WHERE evidence_id=$1", [evidence]);
      assert.equal(await active(), false);
      assert.equal((await readReference(fixtureId(224 + offset))).rowCount, 0);
      console.log("PASS synthetic " + domain + " consent scope, classification, cross-family, withdrawal and closed publication");
    }
    await db.query("REVOKE EXECUTE ON FUNCTION consent.compass_reference_is_active(text,uuid,uuid) FROM website_fixture_crm_service");
    assert.equal(await projectCount(), initialProjects);
    assert.equal((await db.query(`SELECT count(*)::int AS n FROM audit.access_events
      WHERE resource_kind='COMPASS_REFERENCE_CONSENT' AND decision='ALLOW'
        AND reason_code IN ('REFERENCE_CONSENT_RECORDED','REFERENCE_CONSENT_WITHDRAWN')`)).rows[0].n, sourceFile ? 5 : 2);
    await crmService.query("SELECT auth.clear_context()");
    console.log("PASS independent assessment submission, reference consent and CRM receipt; staff read and project opening stay separate");
  } finally {
    await Promise.all(pools.map(pool => pool.end()));
  }
}
