#!/usr/bin/env bash
# Permanent boundary regression; synthetic disposable fixture only.
# Every negative result below is asserted; a reproduced counterexample fails.
set -euo pipefail
umask 077
base=${CANONICAL_FIXTURE_BASE:-36000}
id() { printf '018f0000-0000-7000-8000-%012d' "$((base+$1))"; }
DB=phoenix_canonical_dev
boot() { PGPASSFILE=/tmp/canonical-premerge.pgpass psql -X -qAt -h 127.0.0.1 -U phoenix_bootstrap -d "$DB" -v ON_ERROR_STOP=1 "$@"; }
login() { PGPASSFILE="/tmp/0036-$1.pgpass" psql -X -qAt -h 127.0.0.1 -U "canonical_0036_$1" -d "$DB" -v ON_ERROR_STOP=1 "${@:2}"; }
F=$(id 1); U=$(id 11); C=$(id 14); UP=$(id 21); SP=$(id 25); S=$(id 31); L=$(id 41)
H=$(printf b%.0s {1..64}); CON=$(id 88)
session() {
  local principal=$1 actor=$2 family=$3 channel=$4 sql=$5 ticket family_sql=NULL
  [ "$family" = NULL ] || family_sql="'$family'"
  ticket=$(login binder -c "SELECT auth.issue_context_ticket('$principal',$actor,$family_sql,'$channel',clock_timestamp()+interval '45 seconds',gen_random_uuid(),'$principal')")
  { printf "SELECT auth.redeem_context_ticket('%s','%s');\n" "$ticket" "$principal"; printf '%s\n' "$sql"; printf '\nSELECT auth.clear_context();\n'; } | login app -f -
}
manifest="jsonb_build_object('entry_ref','synthetic/compass','entry_revision','audit-1','manifest_ref','synthetic/audit','manifest_sha256','$H')"
test "$(login config -c "SELECT crm.register_acquisition_contract('$CON','$S','audit-active',$manifest,'synthetic/approval','$H','synthetic/retention','$H','canonical_0036_app',clock_timestamp()-interval '1 day',clock_timestamp()+interval '1 day','IDENTITY_CASE')")" = "$CON"
test "$(login config -c "SELECT crm.register_acquisition_contract('$(id 90)','$S','audit-future',$manifest,'synthetic/approval','$H','synthetic/retention','$H','canonical_0036_app',clock_timestamp()+interval '1 day',clock_timestamp()+interval '2 days','IDENTITY_CASE')")" = "$(id 90)"
echo 'COMMAND P41-A1 future source contract used for own retraction; expected refusal'
out=$(session "$UP" "'$U'" "$F" FAMILY "SELECT crm.assert_lead_need('$(id 91)','$L','$(id 90)','HEALTH','USER_SELECTED','RETRACT','$(id 64)',NULL,'audit-future-retraction','$H') IS NOT NULL;")
printf 'OBSERVE FUTURE_CONTRACT_RETRACTION_ACCEPTED=%s EXPECTED=f\n' "$(grep -x '[tf]' <<<"$out")"
test "$(grep -x '[tf]' <<<"$out")" = f
echo 'PASS P41-A1 future contract cannot authorize own retraction'

LOCK_PID=
cleanup() { if [ -n "$LOCK_PID" ]; then wait "$LOCK_PID" 2>/dev/null || true; fi; }
trap cleanup EXIT
hold_key() {
  local namespace=$1 key=$2 marker=$3
  rm -f "$marker"
  cat >/tmp/0036-audit-lock.sql <<SQL
BEGIN;
SELECT pg_advisory_xact_lock(3636,hashtext('synthetic_0036_$base:$namespace:$key'));
\! touch $marker
SELECT pg_sleep(6);
COMMIT;
SQL
  login app -f /tmp/0036-audit-lock.sql >/tmp/0036-audit-lock.out & LOCK_PID=$!
  for i in {1..100}; do [ -f "$marker" ] && return; sleep .05; done
  echo 'FAIL locker not ready'; exit 1
}
await_blocked() {
  local app=$1
  for i in {1..100}; do
    if [ "$(boot -c "SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE application_name='$app' AND wait_event='advisory')")" = t ]; then return; fi
    sleep .05
  done
  echo 'FAIL writer not observed waiting on advisory lock'; exit 1
}

echo 'COMMAND P41-A2 end partner after conversion eligibility check while its writer waits; expected refusal'
NL=$(id 200); P=$(id 204)
out=$(session "$SP" NULL "$F" INTERNAL "SELECT crm.create_lead_v2('$NL','$CON','$U','$F',NULL,NULL,'$(id 201)','$(id 202)','audit-conversion-lead'); SELECT crm.transition_lead('$NL','CONTACTED','$(id 205)'); SELECT crm.transition_lead('$NL','QUALIFIED','$(id 206)');")
test "$(grep -c '^t$' <<<"$out")" = 2
boot -c "INSERT INTO crm.partner_relationships(partner_relationship_id,partner_kind,partner_person_id,relationship_type,lead_source_id,status,valid_from,valid_until,created_by_principal_id) VALUES('$P','PERSON','$C','CHANNEL_PARTNER','$S','ACTIVE',clock_timestamp()-interval '1 day',clock_timestamp()+interval '1 hour','$SP')" >/dev/null
hold_key CONVERSION_TOUCH audit-partner-race /tmp/0036-audit-partner-ready
PGAPPNAME=canonical0036-partner-probe session "$SP" NULL "$F" INTERNAL "SELECT crm.record_conversion_attribution_v2('$(id 207)','$NL','$CON','$P',NULL,'$(id 208)','audit-partner-race') IS NOT NULL;" >/tmp/0036-audit-conversion.out & writer=$!
await_blocked canonical0036-partner-probe
echo 'OBSERVE conversion writer blocked before partner revocation'
test "$(session "$SP" NULL NULL INTERNAL "SELECT crm.end_partner_relationship('$P','$(id 209)');" | grep -x '[tf]')" = t
echo 'OBSERVE controlled partner revocation committed before writer released'
wait "$LOCK_PID"; LOCK_PID=
wait "$writer"
printf 'OBSERVE ENDED_PARTNER_CONVERSION_ACCEPTED=%s EXPECTED=f\n' "$(grep -x '[tf]' /tmp/0036-audit-conversion.out)"
test "$(grep -x '[tf]' /tmp/0036-audit-conversion.out)" = f
test "$(boot -c "SELECT count(*)=0 FROM crm.lead_attributions WHERE lead_attribution_id='$(id 207)'")" = t
test "$(boot -c "SELECT EXISTS(SELECT 1 FROM audit.access_events WHERE resource_id='$NL' AND decision='DENY' AND reason_code='ACQUISITION_CONVERSION_CHANGED_WHILE_WAITING')")" = t
echo 'PASS P41-A2 committed partner revocation blocks waiting conversion and is audited'
boot -c "SELECT 'OBSERVE ATTRIBUTED_PARTNER_CURRENT_STATUS='||p.status FROM crm.lead_attributions a JOIN crm.partner_relationships p ON p.partner_relationship_id=a.partner_relationship_id WHERE a.lead_attribution_id='$(id 207)'"

echo 'COMMAND P41-A3 contact membership expires while Lead creation waits; expected refusal'
NP=$(id 220)
boot <<SQL
INSERT INTO core.people(person_id,display_name) VALUES('$NP','Synthetic 0036 expiring contact');
INSERT INTO core.family_memberships(membership_id,family_id,person_id,membership_role,valid_from,valid_until)
VALUES('$(id 221)','$F','$NP','MEMBER',clock_timestamp()-interval '1 day',clock_timestamp()+interval '2 seconds');
SQL
hold_key FIRST_TOUCH audit-contact-race /tmp/0036-audit-contact-ready
PGAPPNAME=canonical0036-contact-probe session "$SP" NULL "$F" INTERNAL "SELECT crm.create_lead_v2('$(id 222)','$CON','$NP','$F',NULL,NULL,'$(id 223)','$(id 224)','audit-contact-race') IS NOT NULL;" >/tmp/0036-audit-contact.out & writer=$!
await_blocked canonical0036-contact-probe
wait "$LOCK_PID"; LOCK_PID=
wait "$writer"
printf 'OBSERVE EXPIRED_CONTACT_LEAD_ACCEPTED=%s EXPECTED=f\n' "$(grep -x '[tf]' /tmp/0036-audit-contact.out)"
test "$(grep -x '[tf]' /tmp/0036-audit-contact.out)" = f
test "$(boot -c "SELECT count(*)=0 FROM crm.leads WHERE lead_id='$(id 222)'")" = t
test "$(boot -c "SELECT EXISTS(SELECT 1 FROM audit.access_events WHERE resource_id='$(id 222)' AND decision='DENY' AND reason_code='ACQUISITION_SCOPE_CHANGED_WHILE_WAITING')")" = t
echo 'PASS P41-A3 expired contact membership blocks waiting Lead creation; no orphan, denial audited'
boot -c "SELECT 'OBSERVE ACCEPTED_CONTACT_MEMBERSHIP_CURRENTLY_VALID='||(m.valid_until>clock_timestamp())::text FROM crm.leads l JOIN core.family_memberships m ON m.person_id=l.contact_person_id AND m.family_id=l.family_id WHERE l.lead_id='$(id 222)'"
echo 'COMMAND P41-A4 unbounded source validity; expected refusal'
if login config -c "SELECT crm.register_acquisition_contract('$(id 230)','$S','audit-unbounded',$manifest,'synthetic/approval','$H','synthetic/retention','$H','canonical_0036_app',clock_timestamp()-interval '1 day','infinity'::timestamptz,'IDENTITY_CASE')" >/tmp/0036-audit-unbounded.out 2>&1; then
  echo 'OBSERVE INFINITE_CONTRACT_VALIDITY_ACCEPTED=t EXPECTED=f'
  echo 'FAIL unbounded source validity accepted'; exit 1
else
  grep -q 'ACQUISITION_CONTRACT_EVIDENCE_OR_LOGIN_DENIED' /tmp/0036-audit-unbounded.out
  echo 'OBSERVE INFINITE_CONTRACT_VALIDITY_ACCEPTED=f EXPECTED=f'
fi
if login config -c "SELECT crm.register_acquisition_contract('$(id 231)','$S','audit-unbounded-start',$manifest,'synthetic/approval','$H','synthetic/retention','$H','canonical_0036_app','-infinity'::timestamptz,clock_timestamp()+interval '1 day','IDENTITY_CASE')" >/tmp/0036-audit-unbounded.out 2>&1; then
  echo 'FAIL unbounded source start accepted'; exit 1
fi
grep -q 'ACQUISITION_CONTRACT_EVIDENCE_OR_LOGIN_DENIED' /tmp/0036-audit-unbounded.out
echo 'PASS P41-A4 explicit finite contract start/end required; no real duration selected'
echo 'PASS P41-A1/A2/A3/A4 effective validity and post-wait scope regression'
