-- Academic Studio Package B0, UNNUMBERED ISOLATED FORWARD CANDIDATE.
-- Teacher-controlled single-slot Online / Onsite / Hybrid scheduling.
-- DO NOT PROMOTE, MERGE OR INSTALL IN SHARED/PRODUCTION DATABASES.
BEGIN;
DO $guard$
BEGIN
 IF current_database()<>'phoenix_canonical_dev'
   OR current_setting('phoenix.academic_scheduling_candidate',true) IS DISTINCT FROM 'isolated'
 THEN RAISE EXCEPTION 'ACADEMY_B0_DISPOSABLE_CLUSTER_REQUIRED'; END IF;
 IF (SELECT count(*) FROM canonical_migrations.applied)<>37
   OR (SELECT max(migration_name) FROM canonical_migrations.applied)<>'0037_scoped_public_id_projection_read_audit.sql'
 THEN RAISE EXCEPTION 'ACADEMY_B0_FORMAL_BASELINE_REQUIRED'; END IF;
 IF to_regclass('learning.room') IS NOT NULL
   OR to_regclass('learning.schedule_slot_participant') IS NOT NULL
   OR to_regclass('learning.schedule_slot_event') IS NOT NULL
 THEN RAISE EXCEPTION 'ACADEMY_B0_ALREADY_PRESENT'; END IF;
END $guard$;

CREATE TABLE learning.room (
 room_id uuid PRIMARY KEY CHECK (core.is_uuid_v7(room_id)),
 room_code text NOT NULL UNIQUE CHECK (room_code~'^[A-Z0-9_-]{4,40}$'),
 location_code text NOT NULL CHECK (length(btrim(location_code)) BETWEEN 1 AND 80),
 display_name text NOT NULL CHECK (length(btrim(display_name)) BETWEEN 1 AND 120),
 capacity integer NOT NULL CHECK (capacity BETWEEN 1 AND 200),
 timezone_name text NOT NULL CHECK (length(btrim(timezone_name)) BETWEEN 1 AND 100),
 status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
 created_by_principal_id uuid NOT NULL REFERENCES auth.principals,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

ALTER TABLE learning.schedule_slot
 ADD COLUMN delivery_mode text CHECK (delivery_mode IN ('ONLINE','ONSITE','HYBRID')),
 ADD COLUMN delivery_status text NOT NULL DEFAULT 'DRAFT'
   CHECK (delivery_status IN ('DRAFT','FINALIZED')),
 ADD COLUMN room_id uuid REFERENCES learning.room,
 ADD COLUMN timezone_name text,
 ADD COLUMN delivery_set_by_principal_id uuid REFERENCES auth.principals,
 ADD COLUMN delivery_set_at timestamptz,
 ADD CONSTRAINT schedule_slot_delivery_consistency CHECK (
  delivery_status='DRAFT' OR
  (delivery_mode IS NOT NULL AND timezone_name IS NOT NULL
   AND delivery_set_by_principal_id IS NOT NULL AND delivery_set_at IS NOT NULL
   AND ((delivery_mode='ONLINE' AND room_id IS NULL)
        OR (delivery_mode IN ('ONSITE','HYBRID') AND room_id IS NOT NULL)))
 );
-- The existing 0022 exclusion already protects teacher overlap.
-- This adds physical-room collision prevention independent of a free-text label.
ALTER TABLE learning.schedule_slot
 ADD CONSTRAINT learning_schedule_slot_room_overlap
 EXCLUDE USING gist (room_id WITH =, tstzrange(starts_at,ends_at,'[)') WITH &&)
 WHERE (room_id IS NOT NULL AND status <> 'CANCELLED');

CREATE TABLE learning.schedule_slot_participant (
 participant_id uuid PRIMARY KEY CHECK (core.is_uuid_v7(participant_id)),
 slot_id uuid NOT NULL,
 class_id uuid NOT NULL,
 enrollment_id uuid NOT NULL,
 family_id uuid NOT NULL,
 student_person_id uuid NOT NULL,
 participation_mode text NOT NULL CHECK (participation_mode IN ('ONLINE','ONSITE')),
 status text NOT NULL DEFAULT 'ASSIGNED' CHECK (status IN ('ASSIGNED','CANCELLED')),
 starts_at timestamptz NOT NULL,
 ends_at timestamptz NOT NULL,
 set_by_principal_id uuid NOT NULL REFERENCES auth.principals,
 set_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 FOREIGN KEY (slot_id,class_id) REFERENCES learning.schedule_slot(slot_id,class_id),
 FOREIGN KEY (enrollment_id,class_id,family_id,student_person_id)
  REFERENCES learning.enrollment_class(enrollment_id,class_id,family_id,student_person_id),
 CHECK (ends_at>starts_at),
 UNIQUE(slot_id,enrollment_id),
 EXCLUDE USING gist (
  student_person_id WITH =,tstzrange(starts_at,ends_at,'[)') WITH &&
 ) WHERE (status='ASSIGNED')
);
CREATE INDEX slot_participant_roster_idx
 ON learning.schedule_slot_participant(slot_id,status,participation_mode);

CREATE TABLE learning.schedule_slot_event (
 event_id uuid PRIMARY KEY CHECK(core.is_uuid_v7(event_id)),
 slot_id uuid NOT NULL REFERENCES learning.schedule_slot,
 participant_id uuid REFERENCES learning.schedule_slot_participant,
 event_kind text NOT NULL CHECK (event_kind IN
  ('MODE_SET','PARTICIPANT_ASSIGNED','DELIVERY_FINALIZED','SLOT_CANCELLED')),
 from_mode text,
 to_mode text,
 reason_code text NOT NULL CHECK(length(btrim(reason_code)) BETWEEN 1 AND 100),
 actor_principal_id uuid NOT NULL REFERENCES auth.principals,
 occurred_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TRIGGER slot_event_immutable BEFORE UPDATE OR DELETE ON learning.schedule_slot_event
 FOR EACH ROW EXECUTE FUNCTION learning.reject_history_change();

DO $rls$
DECLARE v_tab text;
BEGIN
 FOREACH v_tab IN ARRAY ARRAY['room','schedule_slot_participant','schedule_slot_event']
 LOOP
  EXECUTE format('ALTER TABLE learning.%I ENABLE ROW LEVEL SECURITY',v_tab);
  EXECUTE format('ALTER TABLE learning.%I FORCE ROW LEVEL SECURITY',v_tab);
  EXECUTE format('CREATE POLICY %I ON learning.%I FOR ALL TO phoenix_canonical_app,phoenix_canonical_reader USING (false) WITH CHECK(false)',
    v_tab||'_no_direct_access',v_tab);
  EXECUTE format('REVOKE ALL ON learning.%I FROM PUBLIC,phoenix_canonical_app,phoenix_canonical_reader',v_tab);
 END LOOP;
END $rls$;

-- Only an active assigned LEAD teacher with an authenticated STAFF context may
-- set a lesson's mode and per-student participation. No student/parent override.
CREATE FUNCTION learning.teacher_can_schedule_slot(p_slot_id uuid) RETURNS boolean
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,auth,learning
RETURN coalesce(
 auth.write_context_is_live() AND auth.current_channel()='STAFF'
 -- Dual-role Academy Admin/Founder may also be the assigned LEAD teacher.
 -- Check the active human Principal and the real teaching assignment instead
 -- of the priority-ordered current_staff_kind() label.
 AND EXISTS (SELECT 1 FROM auth.principals p
   WHERE p.principal_id=auth.current_principal_id()
     AND p.person_id=auth.current_actor_person_id()
     AND p.person_id IS NOT NULL AND p.status='ACTIVE')
 AND EXISTS(
  SELECT 1 FROM learning.schedule_slot s
  JOIN learning.teacher_assignment a
   ON a.class_id=s.class_id AND a.teacher_person_id=s.teacher_person_id
  JOIN learning.teacher t ON t.teacher_person_id=s.teacher_person_id
  WHERE s.slot_id=p_slot_id AND s.status='SCHEDULED'
   AND s.teacher_person_id=auth.current_actor_person_id()
   AND t.status='ACTIVE' AND a.role='LEAD' AND a.status='ACTIVE'
   AND a.revoked_at IS NULL AND a.valid_from<=clock_timestamp()
   AND a.valid_until>clock_timestamp()
   AND a.valid_from<=s.starts_at AND a.valid_until>=s.ends_at
 ),false);

CREATE FUNCTION learning.set_slot_delivery(
 p_slot_id uuid,p_mode text,p_room_id uuid,p_timezone text,p_event_id uuid,p_reason text
) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth,core,learning,audit
AS $fn$
DECLARE v learning.schedule_slot%ROWTYPE; v_room learning.room%ROWTYPE;
BEGIN
 SELECT * INTO v FROM learning.schedule_slot WHERE slot_id=p_slot_id FOR UPDATE;
 IF (FOUND AND learning.teacher_can_schedule_slot(p_slot_id) AND v.delivery_status='DRAFT'
  AND p_mode IN ('ONLINE','ONSITE','HYBRID') AND core.is_uuid_v7(p_event_id)
  AND length(btrim(p_reason)) BETWEEN 1 AND 100
  AND p_timezone IS NOT NULL
  AND EXISTS(SELECT 1 FROM pg_catalog.pg_timezone_names z WHERE z.name=p_timezone)
  AND NOT EXISTS(SELECT 1 FROM learning.schedule_slot_participant sp
    WHERE sp.slot_id=p_slot_id AND sp.status='ASSIGNED')
  AND ((p_mode='ONLINE' AND p_room_id IS NULL)
       OR (p_mode IN ('ONSITE','HYBRID') AND p_room_id IS NOT NULL))
 ) IS NOT TRUE THEN
  RETURN audit.record_write_decision('SET','LEARNING_SLOT_DELIVERY',p_slot_id,false,'LEAD_MODE_OR_INPUT_DENIED');
 END IF;
 IF p_room_id IS NOT NULL THEN
  SELECT * INTO v_room FROM learning.room WHERE room_id=p_room_id FOR UPDATE;
  IF NOT FOUND OR v_room.status<>'ACTIVE'
    OR v_room.timezone_name<>p_timezone THEN
   RETURN audit.record_write_decision('SET','LEARNING_SLOT_DELIVERY',p_slot_id,false,'ROOM_TIMEZONE_OR_STATUS_DENIED');
  END IF;
 END IF;
 UPDATE learning.schedule_slot SET delivery_mode=p_mode,room_id=p_room_id,
  timezone_name=p_timezone,delivery_set_by_principal_id=auth.current_principal_id(),
  delivery_set_at=clock_timestamp()
 WHERE slot_id=p_slot_id;
 INSERT INTO learning.schedule_slot_event(event_id,slot_id,event_kind,from_mode,to_mode,reason_code,actor_principal_id)
 VALUES(p_event_id,p_slot_id,'MODE_SET',v.delivery_mode,p_mode,btrim(p_reason),auth.current_principal_id());
 RETURN audit.record_write_decision('SET','LEARNING_SLOT_DELIVERY',p_slot_id,true,'LEAD_TEACHER_SET_MODE');
EXCEPTION WHEN exclusion_violation THEN
 RETURN audit.record_write_decision('SET','LEARNING_SLOT_DELIVERY',p_slot_id,false,'ROOM_OVERLAP_DENIED');
END $fn$;

CREATE FUNCTION learning.assign_slot_participant(
 p_id uuid,p_slot_id uuid,p_enrollment_id uuid,p_mode text,p_event_id uuid,p_reason text
) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth,core,learning,audit
AS $fn$
DECLARE v learning.schedule_slot%ROWTYPE; v_ec learning.enrollment_class%ROWTYPE;
 v_room_capacity integer; v_onsite integer;
BEGIN
 SELECT * INTO v FROM learning.schedule_slot WHERE slot_id=p_slot_id FOR UPDATE;
 SELECT ec.* INTO v_ec FROM learning.enrollment_class ec
 JOIN learning.enrollment e ON e.enrollment_id=ec.enrollment_id
 WHERE ec.class_id=v.class_id AND ec.enrollment_id=p_enrollment_id
  AND ec.status='ACTIVE' AND e.status='ACTIVE';
 IF (FOUND AND learning.teacher_can_schedule_slot(p_slot_id)
   AND v.delivery_status='DRAFT' AND v.delivery_mode IS NOT NULL
   AND core.is_uuid_v7(p_id) AND core.is_uuid_v7(p_event_id)
   AND p_mode IN ('ONLINE','ONSITE') AND length(btrim(p_reason)) BETWEEN 1 AND 100
   AND (v.delivery_mode='HYBRID' OR
      (v.delivery_mode='ONLINE' AND p_mode='ONLINE') OR
      (v.delivery_mode='ONSITE' AND p_mode='ONSITE'))
   AND learning.teacher_has_class_access(v.class_id,v_ec.student_person_id)
 ) IS NOT TRUE THEN
  RETURN audit.record_write_decision('ASSIGN','LEARNING_SLOT_PARTICIPANT',p_id,false,'LEAD_ROSTER_MODE_OR_CONSENT_DENIED');
 END IF;
 IF p_mode='ONSITE' THEN
  SELECT capacity INTO v_room_capacity FROM learning.room
    WHERE room_id=v.room_id AND status='ACTIVE' FOR UPDATE;
  IF v_room_capacity IS NULL THEN
    RETURN audit.record_write_decision('ASSIGN','LEARNING_SLOT_PARTICIPANT',p_id,false,'ROOM_REQUIRED');
  END IF;
  SELECT count(*) INTO v_onsite FROM learning.schedule_slot_participant
    WHERE slot_id=p_slot_id AND status='ASSIGNED' AND participation_mode='ONSITE';
  IF v_onsite>=v_room_capacity THEN
    RETURN audit.record_write_decision('ASSIGN','LEARNING_SLOT_PARTICIPANT',p_id,false,'ONSITE_CAPACITY_DENIED');
  END IF;
 END IF;
 INSERT INTO learning.schedule_slot_participant(
  participant_id,slot_id,class_id,enrollment_id,family_id,student_person_id,
  participation_mode,starts_at,ends_at,set_by_principal_id)
 VALUES(p_id,v.slot_id,v.class_id,v_ec.enrollment_id,v_ec.family_id,
  v_ec.student_person_id,p_mode,v.starts_at,v.ends_at,auth.current_principal_id());
 INSERT INTO learning.schedule_slot_event(
  event_id,slot_id,participant_id,event_kind,to_mode,reason_code,actor_principal_id)
 VALUES(p_event_id,p_slot_id,p_id,'PARTICIPANT_ASSIGNED',p_mode,btrim(p_reason),auth.current_principal_id());
 RETURN audit.record_write_decision('ASSIGN','LEARNING_SLOT_PARTICIPANT',p_id,true,'TEACHER_ASSIGNED_PARTICIPATION');
EXCEPTION WHEN unique_violation OR exclusion_violation THEN
 RETURN audit.record_write_decision('ASSIGN','LEARNING_SLOT_PARTICIPANT',p_id,false,'STUDENT_OVERLAP_OR_DUPLICATE');
END $fn$;

CREATE FUNCTION learning.finalize_slot_delivery(p_slot_id uuid,p_event_id uuid,p_reason text)
RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth,core,learning,audit
AS $fn$
DECLARE v learning.schedule_slot%ROWTYPE;
 v_expected integer;v_assigned integer;v_onsite integer;v_online integer;v_capacity integer;
BEGIN
 SELECT * INTO v FROM learning.schedule_slot WHERE slot_id=p_slot_id FOR UPDATE;
 IF (FOUND AND learning.teacher_can_schedule_slot(p_slot_id)
   AND v.delivery_status='DRAFT' AND v.delivery_mode IS NOT NULL
   AND core.is_uuid_v7(p_event_id) AND length(btrim(p_reason)) BETWEEN 1 AND 100) IS NOT TRUE THEN
  RETURN audit.record_write_decision('FINALIZE','LEARNING_SLOT_DELIVERY',p_slot_id,false,'LEAD_MODE_OR_STATE_DENIED');
 END IF;
 SELECT count(*) INTO v_expected FROM learning.enrollment_class ec
   JOIN learning.enrollment e USING(enrollment_id)
 WHERE ec.class_id=v.class_id AND ec.status='ACTIVE' AND e.status='ACTIVE';
 SELECT count(*),count(*) FILTER(WHERE participation_mode='ONSITE'),
   count(*) FILTER(WHERE participation_mode='ONLINE')
 INTO v_assigned,v_onsite,v_online FROM learning.schedule_slot_participant
 WHERE slot_id=p_slot_id AND status='ASSIGNED';
 IF v_expected=0 OR v_expected<>v_assigned
  OR EXISTS(SELECT 1 FROM learning.enrollment_class ec
    JOIN learning.enrollment e USING(enrollment_id)
    WHERE ec.class_id=v.class_id AND ec.status='ACTIVE' AND e.status='ACTIVE'
    AND NOT EXISTS (SELECT 1 FROM learning.schedule_slot_participant sp
      WHERE sp.slot_id=p_slot_id AND sp.enrollment_id=ec.enrollment_id AND sp.status='ASSIGNED'))
  OR (v.delivery_mode='HYBRID' AND (v_onsite=0 OR v_online=0))
  OR (v.delivery_mode='ONSITE' AND v_online>0)
  OR (v.delivery_mode='ONLINE' AND v_onsite>0)
 THEN RETURN audit.record_write_decision('FINALIZE','LEARNING_SLOT_DELIVERY',p_slot_id,false,'ROSTER_OR_HYBRID_DENIED');
 END IF;
 IF v.delivery_mode IN ('ONSITE','HYBRID') THEN
  SELECT capacity INTO v_capacity FROM learning.room WHERE room_id=v.room_id AND status='ACTIVE' FOR UPDATE;
  IF v_capacity IS NULL OR v_onsite>v_capacity THEN
   RETURN audit.record_write_decision('FINALIZE','LEARNING_SLOT_DELIVERY',p_slot_id,false,'ROOM_CAPACITY_DENIED');
  END IF;
 END IF;
 UPDATE learning.schedule_slot SET delivery_status='FINALIZED' WHERE slot_id=p_slot_id;
 INSERT INTO learning.schedule_slot_event(event_id,slot_id,event_kind,to_mode,reason_code,actor_principal_id)
 VALUES(p_event_id,p_slot_id,'DELIVERY_FINALIZED',v.delivery_mode,btrim(p_reason),auth.current_principal_id());
 RETURN audit.record_write_decision('FINALIZE','LEARNING_SLOT_DELIVERY',p_slot_id,true,'TEACHER_FINALIZED');
END $fn$;

-- Existing management cancellation must release future student overlap without
-- creating a second cancellation authority.
CREATE FUNCTION learning.cancel_slot_participants() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,auth,learning
AS $fn$
BEGIN
 IF NEW.status='CANCELLED' AND OLD.status<>'CANCELLED' THEN
  UPDATE learning.schedule_slot_participant
    SET status='CANCELLED' WHERE slot_id=NEW.slot_id AND status='ASSIGNED';
 END IF;
 RETURN NEW;
END $fn$;
CREATE TRIGGER cancel_slot_participants
 AFTER UPDATE OF status ON learning.schedule_slot
 FOR EACH ROW WHEN (NEW.status='CANCELLED')
 EXECUTE FUNCTION learning.cancel_slot_participants();

REVOKE EXECUTE ON FUNCTION learning.teacher_can_schedule_slot(uuid),
 learning.cancel_slot_participants()
 FROM PUBLIC,phoenix_canonical_app,phoenix_canonical_reader,phoenix_canonical_context_binder;
REVOKE EXECUTE ON FUNCTION learning.set_slot_delivery(uuid,text,uuid,text,uuid,text),
 learning.assign_slot_participant(uuid,uuid,uuid,text,uuid,text),
 learning.finalize_slot_delivery(uuid,uuid,text)
 FROM PUBLIC,phoenix_canonical_reader,phoenix_canonical_context_binder;
GRANT EXECUTE ON FUNCTION learning.set_slot_delivery(uuid,text,uuid,text,uuid,text),
 learning.assign_slot_participant(uuid,uuid,uuid,text,uuid,text),
 learning.finalize_slot_delivery(uuid,uuid,text)
 TO phoenix_canonical_app;
COMMIT;
