#!/usr/bin/env bash
# Disposable synthetic cluster only. Every mechanism assertion uses separate
# real LOGINs; bootstrap is limited to synthetic fixture/role preparation.
set -euo pipefail
umask 077
base=${CANONICAL_FIXTURE_BASE:-36000}
id() { printf '018f0000-0000-7000-8000-%012d' "$((base+$1))"; }
DB=phoenix_canonical_dev
boot() { PGPASSFILE=/tmp/canonical-premerge.pgpass psql -X -qAt -h 127.0.0.1 -U phoenix_bootstrap -d "$DB" -v ON_ERROR_STOP=1 "$@"; }
login() { PGPASSFILE="/tmp/0036-$1.pgpass" psql -X -qAt -h 127.0.0.1 -U "canonical_0036_$1" -d "$DB" -v ON_ERROR_STOP=1 "${@:2}"; }
# Only generated synthetic credentials go through protected stdin/files.
for role in app binder config backup other; do
  secret=$(openssl rand -hex 32)
  printf '127.0.0.1:5432:*:canonical_0036_%s:%s\n' "$role" "$secret" >"/tmp/0036-$role.pgpass"
  chmod 600 "/tmp/0036-$role.pgpass"
  boot <<SQL
DO \$r\$ BEGIN
IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='canonical_0036_$role') THEN
 CREATE ROLE canonical_0036_$role LOGIN INHERIT;
END IF;
END \$r\$;
ALTER ROLE canonical_0036_$role LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD '$secret';
SQL
done
unset secret
boot <<'SQL'
GRANT phoenix_canonical_app TO canonical_0036_app,canonical_0036_other WITH INHERIT TRUE, SET FALSE;
GRANT phoenix_canonical_context_binder TO canonical_0036_binder WITH INHERIT TRUE, SET FALSE;
GRANT phoenix_canonical_migrator TO canonical_0036_config WITH INHERIT TRUE, SET FALSE;
ALTER ROLE canonical_0036_backup BYPASSRLS;
GRANT pg_read_all_data TO canonical_0036_backup WITH INHERIT TRUE, SET FALSE;
GRANT CONNECT ON DATABASE phoenix_canonical_dev TO canonical_0036_app,canonical_0036_other,canonical_0036_binder,canonical_0036_config,canonical_0036_backup;
SQL
F=$(id 1); B=$(id 2); U=$(id 11); V=$(id 12); A=$(id 13); C=$(id 14)
UP=$(id 21); VP=$(id 22); AP=$(id 23); CP=$(id 24); SP=$(id 25)
S=$(id 31); K=$(id 32); CON=$(id 33); L=$(id 41); X=$(id 42); Y=$(id 43)
H=$(printf a%.0s {1..64})
boot <<SQL
INSERT INTO core.families(family_id,display_name) VALUES('$F','Synthetic 0036 A'),('$B','Synthetic 0036 B');
INSERT INTO core.people(person_id,display_name) VALUES('$U','Synthetic 0036 User'),('$V','Synthetic 0036 Other'),('$A','Synthetic 0036 Advisor'),('$C','Synthetic 0036 Channel');
INSERT INTO core.family_memberships(membership_id,family_id,person_id,membership_role,valid_from)
VALUES('$(id 15)','$F','$U','PRIMARY',clock_timestamp()-interval '1 day'),('$(id 16)','$B','$V','PRIMARY',clock_timestamp()-interval '1 day');
INSERT INTO auth.principals(principal_id,person_id,principal_kind,status,service_label)
VALUES('$UP','$U','FAMILY','ACTIVE',NULL),('$VP','$V','FAMILY','ACTIVE',NULL),('$AP','$A','ADVISOR','ACTIVE',NULL),('$CP','$C','CHANNEL','ACTIVE',NULL),('$SP',NULL,'SERVICE','ACTIVE','canonical_crm_v2');
INSERT INTO crm.lead_sources(lead_source_id,source_system,source_channel,status,created_by_principal_id)
VALUES('$S','synthetic_0036_$base','WEBSITE','ACTIVE','$SP');
INSERT INTO identity.cases(identity_case_id,family_id,subject_person_id,case_kind,status)
VALUES('$(id 34)','$F','$U','SYNTHETIC','DRAFT');
INSERT INTO casework.cases(case_id,family_id,subject_person_id,title,status,resource_kind,resource_id)
VALUES('$K','$F','$U','Synthetic 0036 identity','OPEN','IDENTITY_CASE','$(id 34)');
INSERT INTO casework.advisor_assignments(assignment_id,case_id,advisor_person_id,valid_from,valid_until)
VALUES('$(id 35)','$K','$A',clock_timestamp()-interval '1 day',clock_timestamp()+interval '1 day');
INSERT INTO consent.grants(consent_id,family_id,grantor_person_id,grantee_person_id,subject_person_id,purpose,data_class,status,granted_at,expires_at)
VALUES('$(id 36)','$F','$U','$A','$U','IDENTITY_CASE','IDENTITY_SENSITIVE','ACTIVE',clock_timestamp()-interval '1 day',clock_timestamp()+interval '1 day');
SQL
session() {
  local principal=$1 actor=$2 family=$3 channel=$4 sql=$5 role=${6:-app} ticket
  ticket=$(login binder -c "SELECT auth.issue_context_ticket('$principal',$actor,'$family','$channel',clock_timestamp()+interval '45 seconds',gen_random_uuid(),'$principal')")
  { printf "SELECT auth.redeem_context_ticket('%s','%s');\n" "$ticket" "$principal"; printf '%s\n' "$sql"; printf '\nSELECT auth.clear_context();\n'; } | login "$role" -f -
}
assert_session() {
  local label=$1 principal=$2 actor=$3 family=$4 channel=$5 expression=$6 role=${7:-app} out
  echo "COMMAND 0036 $label (separate binder/app LOGIN and one-use ticket)"
  out=$(session "$principal" "$actor" "$family" "$channel" "SELECT ($expression) IS TRUE;" "$role")
  [ "$(grep -x '[tf]' <<<"$out")" = t ] || { echo "FAIL $label result=$out"; exit 1; }
  echo "PASS 0036 $label"
}
deny_sql() {
  local label=$1 role=$2 statement=$3 expected=$4 out
  echo "COMMAND 0036 $label"
  if out=$(login "$role" -c "$statement" 2>&1); then echo "FAIL $label accepted"; exit 1; fi
  grep -q "$expected" <<<"$out" || { echo "FAIL $label unexpected=$out"; exit 1; }
  echo "PASS 0036 $label rejected: $expected"
}
need() { printf "crm.assert_lead_need('%s','%s','%s','%s','%s','%s',%s,%s,'%s','%s')" "$(id "$1")" "$L" "$CON" "$2" "$3" "${4:-ASSERT}" "${5:-NULL}" "${6:-NULL}" "${7:-event-$1}" "$H"; }
create="crm.create_lead_v2('$L','$CON','$U','$F',NULL,'FAMILY_COMPASS','$(id 44)','$(id 45)','first-$base')"
assert_session 'missing contract fails closed' "$SP" NULL "$F" INTERNAL "$create IS NULL"
manifest="jsonb_build_object('entry_ref','synthetic/compass','entry_revision','fixture-1','manifest_ref','synthetic/approved-manifest','manifest_sha256','$H','geo_source_system','synthetic_geo','geo_ref','synthetic/content','geo_revision','fixture-1','geo_sha256','$H')"
registration="crm.register_acquisition_contract('$CON','$S','fixture-1',$manifest,'synthetic/founder-approval','$H','synthetic/retention-policy','$H','canonical_0036_app','2026-01-01 UTC','2099-01-01 UTC','IDENTITY_CASE')"
echo 'COMMAND 0036 config LOGIN registers explicitly synthetic source/retention evidence'
test "$(login config -c "SELECT $registration")" = "$CON"
test "$(login config -c "SELECT $registration")" = "$CON"
echo 'PASS 0036 contract registration idempotency; no live contract seeded'
deny_sql 'app cannot register policy' app "SELECT $registration" 'permission denied'
deny_sql 'app cannot read policy' app 'SELECT * FROM crm.acquisition_contract_revisions' 'permission denied'
deny_sql 'app cannot insert facts directly' app 'INSERT INTO crm.lead_events(lead_event_id) VALUES(gen_random_uuid())' 'permission denied'
deny_sql 'app cannot become binder' app 'SET ROLE phoenix_canonical_context_binder' 'permission denied'
assert_session 'approved versioned entry creates lead' "$SP" NULL "$F" INTERNAL "$create='$L'::uuid"
assert_session 'First Touch exact retry' "$SP" NULL "$F" INTERNAL "$create='$L'::uuid"
badcreate="crm.create_lead_v2('$(id 46)','$CON','$U','$F',NULL,'FAMILY_COMPASS','$(id 47)','$(id 48)','first-$base')"
assert_session 'same source key different payload rejected' "$SP" NULL "$F" INTERNAL "$badcreate IS NULL"
assert_session 'different app LOGIN cannot use contract' "$SP" NULL "$F" INTERNAL "$create IS NULL" other
expired_registration="crm.register_acquisition_contract('$(id 37)','$S','fixture-expired',$manifest,'synthetic/approval','$H','synthetic/retention','$H','canonical_0036_app','2020-01-01 UTC','2021-01-01 UTC','IDENTITY_CASE')"
test "$(login config -c "SELECT $expired_registration")" = "$(id 37)"
assert_session 'naturally expired source contract rejected' "$SP" NULL "$F" INTERNAL "crm.create_lead_v2('$(id 49)','$(id 37)','$U','$F',NULL,NULL,'$(id 50)','$(id 51)','expired') IS NULL"
assert_session 'conversion before qualification rejected' "$SP" NULL "$F" INTERNAL "crm.record_conversion_attribution_v2('$(id 52)','$L','$CON',NULL,NULL,'$(id 53)','conversion-$base') IS NULL"
boot -c "INSERT INTO crm.partner_relationships(partner_relationship_id,partner_kind,partner_person_id,relationship_type,lead_source_id,status,valid_from,valid_until,created_by_principal_id) VALUES('$(id 56)','PERSON','$C','CHANNEL_PARTNER','$S','ACTIVE',clock_timestamp()+interval '1 day',clock_timestamp()+interval '2 days','$SP')" >/dev/null
assert_session 'existing lead contacted transition' "$SP" NULL "$F" INTERNAL "crm.transition_lead('$L','CONTACTED','$(id 54)')"
assert_session 'existing lead qualified transition' "$SP" NULL "$F" INTERNAL "crm.transition_lead('$L','QUALIFIED','$(id 55)')"
assert_session 'future partner relationship rejected' "$SP" NULL "$F" INTERNAL "crm.record_conversion_attribution_v2('$(id 57)','$L','$CON','$(id 56)',NULL,'$(id 58)','future-partner') IS NULL"
conversion="crm.record_conversion_attribution_v2('$(id 52)','$L','$CON',NULL,NULL,'$(id 53)','conversion-$base')"
assert_session 'versioned conversion is separate from First Touch' "$SP" NULL "$F" INTERNAL "$conversion='$(id 52)'::uuid"
assert_session 'conversion retry returns original touch' "$SP" NULL "$F" INTERNAL "$conversion='$(id 52)'::uuid"
assert_session 'SERVICE cannot invent human assertion' "$SP" NULL "$F" INTERNAL "$(need 60 EDUCATION USER_SELECTED) IS NULL"
for spec in '61 EDUCATION' '62 IDENTITY' '63 WEALTH' '64 HEALTH'; do
  read -r event domain <<<"$spec"
  assert_session "user independently selects $domain" "$UP" "'$U'" "$F" FAMILY "$(need "$event" "$domain" USER_SELECTED)='$(id "$event")'::uuid"
done
assert_session 'need retry returns original event' "$UP" "'$U'" "$F" FAMILY "$(need 69 EDUCATION USER_SELECTED ASSERT NULL NULL event-61)='$(id 61)'::uuid"
assert_session 'need source-key conflict rejected' "$UP" "'$U'" "$F" FAMILY "$(need 70 WEALTH USER_SELECTED ASSERT NULL NULL event-61) IS NULL"
assert_session 'cross-family assertion rejected' "$VP" "'$V'" "$B" FAMILY "$(need 71 EDUCATION USER_SELECTED) IS NULL"
assert_session 'user cannot impersonate advisor confirmation' "$UP" "'$U'" "$F" FAMILY "$(need 72 IDENTITY ADVISOR_CONFIRMED ASSERT NULL "'$K'") IS NULL"
assert_session 'advisor cannot impersonate user choice' "$AP" "'$A'" "$F" ADVISOR "$(need 73 IDENTITY USER_SELECTED) IS NULL"
assert_session 'advisor with scope and Consent confirms identity' "$AP" "'$A'" "$F" ADVISOR "$(need 74 IDENTITY ADVISOR_CONFIRMED ASSERT NULL "'$K'")='$(id 74)'::uuid"
assert_session 'identity assignment does not grant education scope' "$AP" "'$A'" "$F" ADVISOR "$(need 75 EDUCATION ADVISOR_CONFIRMED ASSERT NULL "'$K'") IS NULL"
assert_session 'Health advisor scope unavailable remains closed' "$AP" "'$A'" "$F" ADVISOR "$(need 76 HEALTH ADVISOR_CONFIRMED ASSERT NULL "'$K'") IS NULL"
assert_session 'explicit supersession appends event' "$UP" "'$U'" "$F" FAMILY "$(need 77 EDUCATION USER_SELECTED SUPERSEDE "'$(id 61)'")='$(id 77)'::uuid"
assert_session 'cannot fork superseded event' "$UP" "'$U'" "$F" FAMILY "$(need 78 EDUCATION USER_SELECTED SUPERSEDE "'$(id 61)'") IS NULL"
assert_session 'explicit retraction appends terminal event' "$UP" "'$U'" "$F" FAMILY "$(need 79 EDUCATION USER_SELECTED RETRACT "'$(id 77)'")='$(id 79)'::uuid"
assert_session 'cannot reactivate terminal event' "$UP" "'$U'" "$F" FAMILY "$(need 80 EDUCATION USER_SELECTED SUPERSEDE "'$(id 79)'") IS NULL"
assert_session 'advisor cannot replace user evidence' "$AP" "'$A'" "$F" ADVISOR "$(need 81 IDENTITY ADVISOR_CONFIRMED SUPERSEDE "'$(id 62)'" "'$K'") IS NULL"
boot -c "UPDATE consent.grants SET status='WITHDRAWN',withdrawn_at=clock_timestamp() WHERE consent_id='$(id 36)'" >/dev/null
assert_session 'withdrawn Consent blocks new confirmation' "$AP" "'$A'" "$F" ADVISOR "$(need 82 IDENTITY ADVISOR_CONFIRMED ASSERT NULL "'$K'") IS NULL"
assert_session 'own retraction remains possible after Consent withdrawal' "$AP" "'$A'" "$F" ADVISOR "$(need 83 IDENTITY ADVISOR_CONFIRMED RETRACT "'$(id 74)'" "'$K'")='$(id 83)'::uuid"
assert_session 'clear leaves no context' "$UP" "'$U'" "$F" FAMILY 'auth.clear_context() IS NULL OR auth.current_family_id() IS NULL'
test "$(login app -c 'SELECT auth.current_family_id() IS NULL')" = t
echo 'PASS 0036 disconnected app LOGIN has no inherited context'
ticket=$(login binder -c "SELECT auth.issue_context_ticket('$UP','$U','$F','FAMILY',clock_timestamp()+interval '45 seconds',gen_random_uuid(),'$UP')")
printf "SELECT auth.redeem_context_ticket('%s','%s');\n" "$ticket" "$UP" | login app -f - >/dev/null
if printf "SELECT auth.redeem_context_ticket('%s','%s');\n" "$ticket" "$UP" | login app -f - >/tmp/0036-ticket.out 2>&1; then echo 'FAIL ticket replay accepted'; exit 1; fi
grep -q 'INVALID_OR_ALREADY_USED' /tmp/0036-ticket.out
unset ticket
echo 'PASS 0036 redeemed ticket cannot be reused; credential and ticket values not printed'
test "$(boot -c "SELECT count(*)=4 AND count(DISTINCT need_domain)=4 FROM crm.lead_events WHERE lead_id='$L' AND event_kind='NEED_ASSERTED' AND need_assertion_kind='USER_SELECTED'")" = t
test "$(boot -c "SELECT compass_kind='FAMILY_COMPASS' AND content_ref='synthetic/content' AND entry_revision='fixture-1' AND recorded_by_login='canonical_0036_app' FROM crm.lead_attributions WHERE lead_id='$L' AND attribution_kind='FIRST_TOUCH'")" = t
test "$(boot -c "SELECT bool_and(actor_principal_id=asserted_by_principal_id AND recorded_by_login='canonical_0036_app') FROM crm.lead_events WHERE lead_id='$L' AND need_domain IS NOT NULL")" = t
echo 'PASS 0036 original entry retained; no FAMILY-to-WEALTH mapping; human and technical recorder distinct'
if boot -c "UPDATE crm.lead_events SET need_domain='HEALTH' WHERE lead_event_id='$(id 61)'" >/tmp/0036-immutable.out 2>&1; then echo 'FAIL mutable history'; exit 1; fi
grep -q 'IMMUTABLE' /tmp/0036-immutable.out
if boot -c "DELETE FROM crm.lead_attributions WHERE lead_id='$L'" >/tmp/0036-immutable.out 2>&1; then echo 'FAIL First Touch deletion'; exit 1; fi
grep -q 'IMMUTABLE' /tmp/0036-immutable.out
echo 'PASS 0036 need history and First Touch immutable even under fixture bootstrap'
test "$(login config -c "SELECT crm.revoke_acquisition_contract('$CON','synthetic/revocation','$H')")" = t
assert_session 'revoked source contract blocks assertion' "$UP" "'$U'" "$F" FAMILY "$(need 84 WEALTH USER_SELECTED) IS NULL"
assert_session 'own withdrawal allowed after source revoked' "$UP" "'$U'" "$F" FAMILY "$(need 85 WEALTH USER_SELECTED RETRACT "'$(id 63)'")='$(id 85)'::uuid"
if login config -c "SELECT $registration" >/tmp/0036-register.out 2>&1; then echo 'FAIL contract reactivation'; exit 1; fi
grep -q 'IDEMPOTENCY_CONFLICT' /tmp/0036-register.out
echo 'PASS 0036 revoked publication cannot be registered back into activity'
test "$(boot -c "SELECT count(*)=0 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='crm' AND has_function_privilege('public',p.oid,'EXECUTE')")" = t
test "$(boot -c "SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid='crm.acquisition_contract_revisions'::regclass")" = t
echo 'PASS 0036 no PUBLIC execute; registry FORCE RLS; real separate LOGIN credentials and single-use tickets'
echo 'PASS 0036 full synthetic acquisition/need contract regression'
