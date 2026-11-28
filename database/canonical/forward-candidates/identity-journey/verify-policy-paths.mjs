import assert from "node:assert/strict";
import {
  identityPathways,
  identityPolicyRules,
} from "../../../../website/phoenix-nova-website-v5/lib/identity-journey-policy.ts";

/*
 * GATE 9 scenarios 7 and 8 are candidate-only fixtures.  The dates and
 * document references below are synthetic evidence anchors; they are not
 * statements about statutory eligibility, an investment threshold, or a
 * right-of-abode outcome.
 *
 * This verifier deliberately owns no schema or policy vocabulary.  It only
 * exercises the already-installed candidate storage after member-profile.sql
 * has been applied.  The caller supplies the existing disposable-database
 * query adapter and may run this after verifyIdentityMemberProfile().
 */
export async function verifyIdentityPolicyPaths({ query }) {
  const id = (lane, sequence) => {
    const prefix = lane === "investor"
      ? "01910000-0000-7200-8300-"
      : "01910000-0000-7200-8400-";
    return `${prefix}${String(sequence).padStart(12, "0")}`;
  };

  const investorFamily = id("investor", 1);
  const investorPerson = id("investor", 2);
  const investorPrincipal = id("investor", 3);
  const investorMembership = id("investor", 4);
  const newCase = id("investor", 5);
  const legacyCase = id("investor", 6);
  const newEpisode = id("investor", 7);
  const legacyEpisode = id("investor", 8);
  const newDocument = id("investor", 9);
  const legacyDocument = id("investor", 10);
  const newReceipt = id("investor", 11);
  const newDecision = id("investor", 12);
  const legacyReceipt = id("investor", 13);
  const legacyDecision = id("investor", 14);
  const newStay = id("investor", 15);
  const legacyStay = id("investor", 16);
  const newWindow = id("investor", 17);
  const legacyWindow = id("investor", 18);
  const newStayReminder = id("investor", 19);
  const legacyStayReminder = id("investor", 20);
  const newWindowReminder = id("investor", 21);
  const legacyWindowReminder = id("investor", 22);

  const childFamily = id("child", 1);
  const parentPerson = id("child", 2);
  const childPerson = id("child", 3);
  const parentPrincipal = id("child", 4);
  const parentMembership = id("child", 5);
  const childMembership = id("child", 6);
  const parentCase = id("child", 7);
  const childCase = id("child", 8);
  const parentEpisode = id("child", 9);
  const childEpisode = id("child", 10);
  const birthDocument = id("child", 11);
  const parentStatusDocument = id("child", 12);
  const nationalityDocument = id("child", 13);
  const residenceDocument = id("child", 14);
  const guardianAuthority = id("child", 15);
  const parentDocument = id("child", 16);
  const parentCapacity = id("child", 20);
  const childCapacity = id("child", 21);
  const parentStay = id("child", 22);
  const ageEleven = id("child", 23);
  const ageEighteen = id("child", 24);

  assert.equal(identityPathways.NEW_CIES.candidateOnly, true);
  assert.equal(identityPathways.LEGACY_CIES.candidateOnly, true);
  assert.equal(identityPathways.HK_BIRTH_RIGHT_OF_ABODE.candidateOnly, true);
  assert.equal(identityPolicyRules["IDP-NEW-CIES"].reviewedState, "OFFICIAL_SOURCE_REVIEWED");
  assert.equal(identityPolicyRules["IDP-LEGACY-CIES"].reviewedState, "HISTORICAL_SCOPE_REVIEW_REQUIRED");
  for (const ruleId of ["IDP-NEW-CIES", "IDP-LEGACY-CIES", "IDP-HK-BIRTH-ROA"]) {
    assert.equal(identityPolicyRules[ruleId].automationGuardrail, "NO_AUTOMATIC_DECISION");
    assert.equal(identityPolicyRules[ruleId].professionalReviewState, "PENDING");
  }

  // All fixture writes are isolated to two disposable families.  The
  // investor case deliberately stores new and historical evidence separately.
  query(`
    INSERT INTO core.families(family_id, display_name) VALUES
      (:'investorFamily'::uuid, 'Synthetic CIES history household'),
      (:'childFamily'::uuid, 'Synthetic Hong Kong birth household');
    INSERT INTO core.people(person_id, display_name) VALUES
      (:'investorPerson'::uuid, 'Synthetic investor subject'),
      (:'parentPerson'::uuid, 'Synthetic parent'),
      (:'childPerson'::uuid, 'Synthetic Hong Kong-born child');
    INSERT INTO auth.principals(principal_id, person_id, principal_kind, status) VALUES
      (:'investorPrincipal'::uuid, :'investorPerson'::uuid, 'FAMILY', 'ACTIVE'),
      (:'parentPrincipal'::uuid, :'parentPerson'::uuid, 'FAMILY', 'ACTIVE');
    INSERT INTO core.family_memberships(membership_id, family_id, person_id, membership_role, valid_from) VALUES
      (:'investorMembership'::uuid, :'investorFamily'::uuid, :'investorPerson'::uuid, 'PRIMARY', clock_timestamp() - interval '1 day'),
      (:'parentMembership'::uuid, :'childFamily'::uuid, :'parentPerson'::uuid, 'PRIMARY', clock_timestamp() - interval '1 day'),
      (:'childMembership'::uuid, :'childFamily'::uuid, :'childPerson'::uuid, 'MEMBER', clock_timestamp() - interval '1 day');
    INSERT INTO core.civil_capacity_history(capacity_record_id, person_id, capacity_status, evidence_ref, verified_by_principal_id) VALUES
      (:'parentCapacity'::uuid, :'parentPerson'::uuid, 'ADULT_VERIFIED', 'synthetic/policy-path-parent-capacity', :'parentPrincipal'::uuid),
      (:'childCapacity'::uuid, :'childPerson'::uuid, 'MINOR_VERIFIED', 'synthetic/policy-path-child-capacity', :'parentPrincipal'::uuid);
    INSERT INTO identity.cases(identity_case_id, family_id, subject_person_id, case_kind, status) VALUES
      (:'newCase'::uuid, :'investorFamily'::uuid, :'investorPerson'::uuid, 'SYNTHETIC_NEW_CIES', 'UNDER_REVIEW'),
      (:'legacyCase'::uuid, :'investorFamily'::uuid, :'investorPerson'::uuid, 'SYNTHETIC_LEGACY_CIES', 'UNDER_REVIEW'),
      (:'parentCase'::uuid, :'childFamily'::uuid, :'parentPerson'::uuid, 'SYNTHETIC_ADULT_IDENTITY', 'UNDER_REVIEW'),
      (:'childCase'::uuid, :'childFamily'::uuid, :'childPerson'::uuid, 'SYNTHETIC_HK_BIRTH_ROA', 'EVIDENCE_PENDING');
    INSERT INTO identity.journey_episodes(episode_id, identity_case_id, started_on, recorded_by) VALUES
      (:'newEpisode'::uuid, :'newCase'::uuid, DATE '2025-04-01', :'investorPrincipal'::uuid),
      (:'legacyEpisode'::uuid, :'legacyCase'::uuid, DATE '2014-12-01', :'investorPrincipal'::uuid),
      (:'parentEpisode'::uuid, :'parentCase'::uuid, DATE '2024-01-01', :'parentPrincipal'::uuid),
      (:'childEpisode'::uuid, :'childCase'::uuid, DATE '2022-06-01', :'parentPrincipal'::uuid);
    INSERT INTO docs.documents(document_id, family_id, subject_person_id, data_class, document_kind, retention_until) VALUES
      (:'newDocument'::uuid, :'investorFamily'::uuid, :'investorPerson'::uuid, 'IDENTITY_SENSITIVE', 'SYNTHETIC_NEW_CIES_APPROVAL', clock_timestamp() + interval '1 day'),
      (:'legacyDocument'::uuid, :'investorFamily'::uuid, :'investorPerson'::uuid, 'IDENTITY_SENSITIVE', 'SYNTHETIC_LEGACY_CIES_APPROVAL', clock_timestamp() + interval '1 day'),
      (:'birthDocument'::uuid, :'childFamily'::uuid, :'childPerson'::uuid, 'IDENTITY_SENSITIVE', 'SYNTHETIC_HK_BIRTH_RECORD', clock_timestamp() + interval '1 day'),
      (:'parentStatusDocument'::uuid, :'childFamily'::uuid, :'childPerson'::uuid, 'IDENTITY_SENSITIVE', 'SYNTHETIC_PARENT_STATUS_RECORD', clock_timestamp() + interval '1 day'),
      (:'nationalityDocument'::uuid, :'childFamily'::uuid, :'childPerson'::uuid, 'IDENTITY_SENSITIVE', 'SYNTHETIC_NATIONALITY_RECORD', clock_timestamp() + interval '1 day'),
      (:'residenceDocument'::uuid, :'childFamily'::uuid, :'childPerson'::uuid, 'IDENTITY_SENSITIVE', 'SYNTHETIC_CHILD_RESIDENCE_RECORD', clock_timestamp() + interval '1 day'),
      (:'parentDocument'::uuid, :'childFamily'::uuid, :'parentPerson'::uuid, 'IDENTITY_SENSITIVE', 'SYNTHETIC_PARENT_IDENTITY_RECORD', clock_timestamp() + interval '1 day');
    INSERT INTO core.guardian_authorities(
      authority_id, family_id, guardian_person_id, subject_person_id,
      evidence_level, scope, valid_from, valid_until, evidence_ref,
      verified_by_principal_id, lifecycle_status
    ) VALUES (
      :'guardianAuthority'::uuid, :'childFamily'::uuid, :'parentPerson'::uuid, :'childPerson'::uuid,
      'VERIFIED', 'IDENTITY', clock_timestamp() - interval '1 day',
      clock_timestamp() + interval '30 days', 'synthetic/policy-path-guardian',
      :'parentPrincipal'::uuid, 'ACTIVE'
    );
    INSERT INTO identity.external_facts(fact_id, identity_case_id, fact_kind, source_name, external_reference, observed_at) VALUES
      (:'newReceipt'::uuid, :'newCase'::uuid, 'OFFICIAL_RECEIPT', 'Synthetic fixture only', 'synthetic-new-cies-receipt-2025-04-01', TIMESTAMPTZ '2025-04-01 00:00:00+08'),
      (:'newDecision'::uuid, :'newCase'::uuid, 'DECISION', 'Synthetic fixture only', 'synthetic-new-cies-decision-2025-04-15', TIMESTAMPTZ '2025-04-15 00:00:00+08'),
      (:'legacyReceipt'::uuid, :'legacyCase'::uuid, 'OFFICIAL_RECEIPT', 'Synthetic fixture only', 'synthetic-legacy-cies-receipt-2014-12-20', TIMESTAMPTZ '2014-12-20 00:00:00+08'),
      (:'legacyDecision'::uuid, :'legacyCase'::uuid, 'DECISION', 'Synthetic fixture only', 'synthetic-legacy-cies-decision-2015-01-05', TIMESTAMPTZ '2015-01-05 00:00:00+08');
    INSERT INTO identity.journey_date_revisions(
      date_revision_id, identity_case_id, episode_id, date_kind, date_basis,
      target_on, verification, official_fact_id, document_id, verified_by, recorded_by
    ) VALUES
      (:'newStay'::uuid, :'newCase'::uuid, :'newEpisode'::uuid, 'STAY_EXPIRY', 'CASE_APPROVAL', DATE '2030-04-15', 'VERIFIED', NULL, :'newDocument'::uuid, :'investorPrincipal'::uuid, :'investorPrincipal'::uuid),
      (:'legacyStay'::uuid, :'legacyCase'::uuid, :'legacyEpisode'::uuid, 'STAY_EXPIRY', 'CASE_APPROVAL', DATE '2028-12-20', 'VERIFIED', NULL, :'legacyDocument'::uuid, :'investorPrincipal'::uuid, :'investorPrincipal'::uuid),
      (:'newWindow'::uuid, :'newCase'::uuid, :'newEpisode'::uuid, 'RENEWAL_WINDOW_OPEN', 'OFFICIAL_WINDOW', DATE '2029-10-01', 'VERIFIED', :'newDecision'::uuid, :'newDocument'::uuid, :'investorPrincipal'::uuid, :'investorPrincipal'::uuid),
      (:'legacyWindow'::uuid, :'legacyCase'::uuid, :'legacyEpisode'::uuid, 'RENEWAL_WINDOW_OPEN', 'OFFICIAL_WINDOW', DATE '2028-06-01', 'VERIFIED', :'legacyDecision'::uuid, :'legacyDocument'::uuid, :'investorPrincipal'::uuid, :'investorPrincipal'::uuid);
    INSERT INTO identity.journey_station_reminders(
      reminder_id, identity_case_id, episode_id, date_revision_id, date_kind,
      target_on, offset_days, recipient_principal_id, state
    ) VALUES
      (:'newStayReminder'::uuid, :'newCase'::uuid, :'newEpisode'::uuid, :'newStay'::uuid, 'STAY_EXPIRY', DATE '2030-04-15', 90, :'investorPrincipal'::uuid, 'PENDING'),
      (:'legacyStayReminder'::uuid, :'legacyCase'::uuid, :'legacyEpisode'::uuid, :'legacyStay'::uuid, 'STAY_EXPIRY', DATE '2028-12-20', 90, :'investorPrincipal'::uuid, 'PENDING'),
      (:'newWindowReminder'::uuid, :'newCase'::uuid, :'newEpisode'::uuid, :'newWindow'::uuid, 'RENEWAL_WINDOW_OPEN', DATE '2029-10-01', 90, :'investorPrincipal'::uuid, 'PENDING'),
      (:'legacyWindowReminder'::uuid, :'legacyCase'::uuid, :'legacyEpisode'::uuid, :'legacyWindow'::uuid, 'RENEWAL_WINDOW_OPEN', DATE '2028-06-01', 90, :'investorPrincipal'::uuid, 'PENDING');
    INSERT INTO identity.journey_date_revisions(
      date_revision_id, identity_case_id, episode_id, date_kind, date_basis,
      target_on, verification, document_id, verified_by, recorded_by
    ) VALUES
      (:'parentStay'::uuid, :'parentCase'::uuid, :'parentEpisode'::uuid, 'STAY_EXPIRY', 'CASE_APPROVAL', DATE '2027-01-01', 'VERIFIED', :'parentDocument'::uuid, :'parentPrincipal'::uuid, :'parentPrincipal'::uuid),
      (:'ageEleven'::uuid, :'childCase'::uuid, :'childEpisode'::uuid, 'HKIC_AGE_11', 'STATUTORY', DATE '2033-06-01', 'VERIFIED', :'birthDocument'::uuid, :'parentPrincipal'::uuid, :'parentPrincipal'::uuid),
      (:'ageEighteen'::uuid, :'childCase'::uuid, :'childEpisode'::uuid, 'HKIC_AGE_18', 'STATUTORY', DATE '2040-06-01', 'VERIFIED', :'birthDocument'::uuid, :'parentPrincipal'::uuid, :'parentPrincipal'::uuid);
  `, {
    investorFamily,
    investorPerson,
    investorPrincipal,
    investorMembership,
    newCase,
    legacyCase,
    newEpisode,
    legacyEpisode,
    newDocument,
    legacyDocument,
    newReceipt,
    newDecision,
    legacyReceipt,
    legacyDecision,
    newStay,
    legacyStay,
    newWindow,
    legacyWindow,
    newStayReminder,
    legacyStayReminder,
    newWindowReminder,
    legacyWindowReminder,
    childFamily,
    parentPerson,
    childPerson,
    parentPrincipal,
    parentMembership,
    childMembership,
    parentCase,
    childCase,
    parentEpisode,
    childEpisode,
    birthDocument,
    parentStatusDocument,
    parentDocument,
    nationalityDocument,
    residenceDocument,
    guardianAuthority,
    ageEleven,
    ageEighteen,
    parentCapacity,
    childCapacity,
    parentStay,
  });

  const investorProjection = JSON.parse(query(`
    SELECT jsonb_build_object(
      'newCase', (SELECT jsonb_build_object('kind', c.case_kind, 'status', c.status)
        FROM identity.cases c WHERE c.identity_case_id = :'newCase'::uuid),
      'legacyCase', (SELECT jsonb_build_object('kind', c.case_kind, 'status', c.status)
        FROM identity.cases c WHERE c.identity_case_id = :'legacyCase'::uuid),
      'newDates', (SELECT jsonb_agg(jsonb_build_object('kind', d.date_kind, 'basis', d.date_basis, 'target', d.target_on::text) ORDER BY d.date_kind)
        FROM identity.journey_date_revisions d WHERE d.identity_case_id = :'newCase'::uuid),
      'legacyDates', (SELECT jsonb_agg(jsonb_build_object('kind', d.date_kind, 'basis', d.date_basis, 'target', d.target_on::text) ORDER BY d.date_kind)
        FROM identity.journey_date_revisions d WHERE d.identity_case_id = :'legacyCase'::uuid),
      'newFacts', (SELECT count(*) FROM identity.external_facts WHERE identity_case_id = :'newCase'::uuid),
      'legacyFacts', (SELECT count(*) FROM identity.external_facts WHERE identity_case_id = :'legacyCase'::uuid),
      'newReminders', (SELECT count(*) FROM identity.journey_station_reminders WHERE identity_case_id = :'newCase'::uuid),
      'legacyReminders', (SELECT count(*) FROM identity.journey_station_reminders WHERE identity_case_id = :'legacyCase'::uuid)
    );
  `, { newCase, legacyCase }));
  assert.equal(investorProjection.newCase.kind, "SYNTHETIC_NEW_CIES");
  assert.equal(investorProjection.legacyCase.kind, "SYNTHETIC_LEGACY_CIES");
  assert.deepEqual(investorProjection.newDates, [
    { kind: "RENEWAL_WINDOW_OPEN", basis: "OFFICIAL_WINDOW", target: "2029-10-01" },
    { kind: "STAY_EXPIRY", basis: "CASE_APPROVAL", target: "2030-04-15" },
  ]);
  assert.deepEqual(investorProjection.legacyDates, [
    { kind: "RENEWAL_WINDOW_OPEN", basis: "OFFICIAL_WINDOW", target: "2028-06-01" },
    { kind: "STAY_EXPIRY", basis: "CASE_APPROVAL", target: "2028-12-20" },
  ]);
  assert.equal(investorProjection.newFacts, 2);
  assert.equal(investorProjection.legacyFacts, 2);
  assert.equal(investorProjection.newReminders, 2);
  assert.equal(investorProjection.legacyReminders, 2);

  function inFamily({ principal, person, family }, statement, values) {
    const output = query(`BEGIN;
      SET LOCAL statement_timeout = '4s';
      SELECT auth.issue_context_ticket(:'principal'::uuid, :'person'::uuid, :'family'::uuid, 'FAMILY',
        clock_timestamp()+interval '45 seconds', gen_random_uuid(), :'principal'::uuid) AS ticket \\gset
      SELECT auth.redeem_context_ticket(:'ticket'::uuid, :'principal'::uuid);
      ${statement}
      SELECT auth.clear_context();
      COMMIT;`, { ...values, principal, person, family });
    return JSON.parse(output.split(/\r?\n/).map(line => line.trim()).filter(Boolean).at(-1));
  }
  const investorContext = { principal: investorPrincipal, person: investorPerson, family: investorFamily };
  const investorProfile = inFamily(investorContext, `SELECT identity.read_journey_member_profile(
    :'person'::uuid,NULL,ARRAY[:'newCase'::uuid,:'legacyCase'::uuid]);`, { newCase, legacyCase });
  assert.deepEqual(Object.fromEntries(investorProfile.episodes.map(episode => [episode.path,
    episode.milestones.find(date => date.kind === "STAY_EXPIRY")?.on])), {
    SYNTHETIC_NEW_CIES: "2030-04-15",
    SYNTHETIC_LEGACY_CIES: "2028-12-20",
  });
  assert.equal(inFamily(investorContext, `SELECT coalesce(identity.read_journey_member_profile(
    :'person'::uuid,NULL,ARRAY[:'newCase'::uuid,:'childCase'::uuid]),'null'::jsonb);`,
  { newCase, childCase }), null);

  const pathResult = JSON.parse(query(`
    SELECT jsonb_build_object(
      'newRuleStillSeparated', (SELECT :'newCase'::uuid <> :'legacyCase'::uuid),
      'legacyNoNewOverwrite', NOT EXISTS (
        SELECT 1 FROM identity.journey_date_revisions d
        WHERE d.identity_case_id = :'legacyCase'::uuid AND d.target_on = DATE '2030-04-15'
      ),
      'birthNoDecisionFact', NOT EXISTS (
        SELECT 1 FROM identity.external_facts f WHERE f.identity_case_id = :'childCase'::uuid
      ),
      'birthNoPermanentCase', NOT EXISTS (
        SELECT 1 FROM identity.cases c WHERE c.family_id = :'childFamily'::uuid
          AND c.subject_person_id = :'childPerson'::uuid AND c.case_kind IN ('HK_PERMANENT_RESIDENT','RIGHT_TO_LAND')
      ),
      'ageReminderKindsIndependent', (
        identity.journey_reminder_needs_open_episode('HKIC_AGE_11') IS FALSE
        AND identity.journey_reminder_needs_open_episode('HKIC_AGE_18') IS FALSE
      )
    );
  `, { newCase, legacyCase, childCase, childFamily, childPerson }));
  assert.deepEqual(pathResult, {
    newRuleStillSeparated: true,
    legacyNoNewOverwrite: true,
    birthNoDecisionFact: true,
    birthNoPermanentCase: true,
    ageReminderKindsIndependent: true,
  });

  // The child profile requires an explicit IDENTITY guardian grant.  The
  // parent’s own adult profile remains readable without that grant.
  const parentContext = { principal: parentPrincipal, person: parentPerson, family: childFamily };
  const contextValues = {
    parentPerson,
    parentCase,
    childPerson,
    childCase,
    guardianAuthority,
  };
  const beforeRevoke = inFamily(parentContext, `SELECT jsonb_build_object(
    'adultSelf', identity.read_journey_member_profile(:'parentPerson'::uuid, NULL, ARRAY[:'parentCase'::uuid]),
    'childWithoutGuardian', identity.read_journey_member_profile(:'childPerson'::uuid, NULL, ARRAY[:'childCase'::uuid]),
    'childWithGuardianBeforeRevoke', identity.read_journey_member_profile(:'childPerson'::uuid, :'guardianAuthority'::uuid, ARRAY[:'childCase'::uuid]),
    'guardianScopeBeforeRevoke', core.has_verified_guardian_authority(:'childPerson'::uuid, 'IDENTITY')
  );`, contextValues);
  assert.ok(beforeRevoke.adultSelf?.episodes, "adult self path should remain readable");
  assert.equal(beforeRevoke.childWithoutGuardian, null);
  assert.ok(beforeRevoke.childWithGuardianBeforeRevoke?.episodes, "explicit guardian scope should allow child profile");
  assert.equal(beforeRevoke.guardianScopeBeforeRevoke, true);
  assert.deepEqual(beforeRevoke.childWithGuardianBeforeRevoke.episodes.flatMap(episode =>
    episode.milestones.map(date => date.kind)).sort(), ["HKIC_AGE_11", "HKIC_AGE_18"]);

  // The trusted disposable fixture revokes the grant directly; the canonical
  // trigger derives lifecycle_status=REVOKED from revoked_at and prevents
  // accidental reactivation.
  query(`UPDATE core.guardian_authorities SET revoked_at = clock_timestamp(),
      revoked_by_principal_id = :'parentPrincipal'::uuid, lifecycle_status = 'REVOKED'
    WHERE authority_id = :'guardianAuthority'::uuid;`, { guardianAuthority, parentPrincipal });
  const afterRevoke = inFamily(parentContext, `SELECT jsonb_build_object(
    'childWithGuardianAfterRevoke', identity.read_journey_member_profile(:'childPerson'::uuid, :'guardianAuthority'::uuid, ARRAY[:'childCase'::uuid]),
    'guardianScopeAfterRevoke', core.has_verified_guardian_authority(:'childPerson'::uuid, 'IDENTITY'),
    'adultSelfAfterRevoke', identity.read_journey_member_profile(:'parentPerson'::uuid, NULL, ARRAY[:'parentCase'::uuid])
  );`, contextValues);
  assert.equal(afterRevoke.childWithGuardianAfterRevoke, null);
  assert.equal(afterRevoke.guardianScopeAfterRevoke, false);
  assert.ok(afterRevoke.adultSelfAfterRevoke?.episodes, "guardian revocation must not change adult self access");

  const documentKinds = query(`
    SELECT string_agg(document_kind, ',' ORDER BY document_kind)
    FROM docs.documents WHERE family_id = :'childFamily'::uuid AND subject_person_id = :'childPerson'::uuid;
  `, { childFamily, childPerson });
  assert.equal(documentKinds,
    "SYNTHETIC_CHILD_RESIDENCE_RECORD,SYNTHETIC_HK_BIRTH_RECORD,SYNTHETIC_NATIONALITY_RECORD,SYNTHETIC_PARENT_STATUS_RECORD");

  console.log("PASS GATE 9 candidate paths: New/Legacy CIES evidence and dates remain isolated; Hong Kong birth stays human-review-only; guardian scope/revocation and adult self path verified");
}
