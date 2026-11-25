-- #97 independent candidate for the Learning card read entry on pinned A2.
-- Disposable synthetic 0037 only. This file is outside the formal ledger.
BEGIN;

DO $guard$
BEGIN
  IF current_database() <> 'phoenix_canonical_dev'
     OR current_setting('phoenix.learning_card_audit_candidate', true) IS DISTINCT FROM 'isolated' THEN
    RAISE EXCEPTION 'LEARNING_CARD_AUDIT_REQUIRES_ISOLATED_0037';
  END IF;
  IF (SELECT encode(sha256(convert_to(
       string_agg(migration_name || sha256, ',' ORDER BY migration_name), 'UTF8')), 'hex')
      FROM canonical_migrations.applied)
      IS DISTINCT FROM '726c328cf12e8e60d3697e798fcab94daf4398474da0e26b57adf9ce7f05ae75'
     OR to_regclass('learning.academy_staff_grants') IS NULL
     OR encode(sha256(convert_to(pg_get_functiondef(
       'learning.can_read_sensitive(uuid,uuid,uuid)'::regprocedure), 'UTF8')), 'hex')
       <> 'f6770d7391b0c62122d6fb8322611c18767a7e3a4a33da981f842c781b92ffdf'
     OR encode(sha256(convert_to(pg_get_functiondef(
       'audit.record_write_decision(text,text,uuid,boolean,text)'::regprocedure), 'UTF8')), 'hex')
       <> '4891e16cc45aec8b2a6879e5bc21056c3faa5e17e55e6a470d3b51b8b958b387'
     OR encode(sha256(convert_to(pg_get_functiondef(
       'learning.read_published_card(uuid)'::regprocedure), 'UTF8')), 'hex')
       <> '62b42d26baede3182b04989c7fca57705305431379e773972adbd93f61b8dd34' THEN
    RAISE EXCEPTION 'LEARNING_CARD_AUDIT_BASELINE_MISMATCH';
  END IF;
END
$guard$;

CREATE OR REPLACE FUNCTION learning.read_published_card(p_card_id uuid)
RETURNS TABLE(card_id uuid,student_person_id uuid,summary_text text,published_at timestamptz)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth,audit,learning AS $fn$
DECLARE v learning.after_class_card%ROWTYPE; v_allowed boolean; v_at timestamptz;
BEGIN
  SELECT * INTO v FROM learning.after_class_card WHERE learning.after_class_card.card_id=p_card_id;
  v_allowed := FOUND AND v.status='PUBLISHED' AND learning.can_read_sensitive(v.family_id,v.student_person_id,v.class_id);
  -- The private audit writer takes the nonce from the redeemed backend context.
  PERFORM audit.record_write_decision('READ','LEARNING_AFTER_CLASS_CARD',p_card_id,v_allowed,
    CASE WHEN v_allowed THEN 'PUBLISHED_AND_AUTHORIZED' ELSE 'CONTEXT_CONSENT_ASSIGNMENT_OR_STATE_DENIED' END);
  IF v_allowed THEN
    SELECT p.acted_at INTO v_at FROM learning.publication p
      WHERE p.card_id=p_card_id AND p.event_kind='PUBLISHED'
      ORDER BY p.acted_at DESC LIMIT 1;
    RETURN QUERY SELECT v.card_id,v.student_person_id,v.summary_text,v_at;
  END IF;
END
$fn$;

COMMIT;
