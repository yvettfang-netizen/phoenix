-- Academic Studio B1: unnumbered, isolated-only, teacher-controlled resources.
-- No payment, package, refund, account or organization tables.
BEGIN;
DO $gate$
BEGIN
 IF current_database()<>'phoenix_canonical_dev'
    OR current_setting('phoenix.academic_studio_candidate',true) IS DISTINCT FROM 'isolated'
    OR (SELECT count(*) FROM canonical_migrations.applied)<>37
    OR (SELECT max(migration_name) FROM canonical_migrations.applied)<>'0037_scoped_public_id_projection_read_audit.sql'
 THEN RAISE EXCEPTION 'ACADEMY_B1_DISPOSABLE_EXACT_0037_REQUIRED'; END IF;
 IF to_regclass('learning.room') IS NOT NULL OR to_regclass('learning.schedule_slot_participant') IS NOT NULL
 THEN RAISE EXCEPTION 'ACADEMY_B1_ALREADY_PRESENT'; END IF;
END $gate$;

CREATE TABLE learning.room (
 room_id uuid PRIMARY KEY CHECK (core.is_uuid_v7(room_id)),
 site_code text NOT NULL CHECK (length(btrim(site_code)) BETWEEN 2 AND 60),
 room_code text NOT NULL CHECK (length(btrim(room_code)) BETWEEN 1 AND 60),
 room_name text NOT NULL CHECK (length(btrim(room_name)) BETWEEN 1 AND 150),
 timezone_name text NOT NULL CHECK (length(btrim(timezone_name)) BETWEEN 1 AND 80),
 capacity integer NOT NULL CHECK(capacity BETWEEN 1 AND 200),
 status text NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','INACTIVE')),
 created_by_principal_id uuid NOT NULL REFERENCES auth.principals,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE (site_code,room_code)
);

CREATE FUNCTION learning.validate_room_timezone() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,learning AS $fn$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_timezone_names WHERE name=NEW.timezone_name)
 THEN RAISE EXCEPTION 'ACADEMY_ROOM_IANA_TIMEZONE_INVALID'; END IF;
 RETURN NEW;
END $fn$;
CREATE TRIGGER room_timezone_valid
 BEFORE INSERT OR UPDATE OF timezone_name ON learning.room
 FOR EACH ROW EXECUTE FUNCTION learning.validate_room_timezone();

ALTER TABLE learning.schedule_slot
 ADD COLUMN delivery_mode text CHECK(delivery_mode IN ('ONLINE','ONSITE','HYBRID')),
 ADD COLUMN delivery_finalized boolean NOT NULL DEFAULT false,
 ADD COLUMN room_id uuid REFERENCES learning.room,
 ADD COLUMN timezone_name text,
 ADD COLUMN mode_set_by_principal_id uuid REFERENCES auth.principals,
 ADD COLUMN mode_set_at timestamptz,
 ADD CONSTRAINT learning_slot_mode_room_ck CHECK(
   (delivery_mode IS NULL AND room_id IS NULL AND delivery_finalized=false)
   OR (delivery_mode='ONLINE' AND room_id IS NULL)
   OR (delivery_mode IN ('ONSITE','HYBRID') AND room_id IS NOT NULL)
 ),
 ADD CONSTRAINT learning_slot_mode_actor_ck CHECK(
   (delivery_mode IS NULL AND mode_set_by_principal_id IS NULL AND mode_set_at IS NULL)
   OR (delivery_mode IS NOT NULL AND timezone_name IS NOT NULL
       AND mode_set_by_principal_id IS NOT NULL AND mode_set_at IS NOT NULL)
 );
ALTER TABLE learning.schedule_slot
 ADD CONSTRAINT learning_slot_room_no_overlap
 EXCLUDE USING gist (
    room_id WITH =,
    tstzrange(starts_at,ends_at,'[)') WITH &&
 ) WHERE (room_id IS NOT NULL AND status<>'CANCELLED');

CREATE TABLE learning.schedule_slot_participant (
 slot_id uuid NOT NULL,
 class_id uuid NOT NULL,
 enrollment_id uuid NOT NULL,
 family_id uuid NOT NULL,
 student_person_id uuid NOT NULL,
 participation_mode text NOT NULL CHECK (participation_mode IN ('ONLINE','ONSITE')),
 status text NOT NULL DEFAULT 'ASSIGNED' CHECK (status IN ('ASSIGNED','CANCELLED')),
 starts_at timestamptz NOT NULL,
 ends_at timestamptz NOT NULL,
 assigned_by_principal_id uuid NOT NULL REFERENCES auth.principals,
 assigned_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(slot_id,enrollment_id),
 FOREIGN KEY(slot_id,class_id) REFERENCES learning.schedule_slot(slot_id,class_id),
 FOREIGN KEY(enrollment_id,class_id,family_id,student_person_id)
   REFERENCES learning.enrollment_class(enrollment_id,class_id,family_id,student_person_id),
 CHECK(ends_at>starts_at),
 EXCLUDE USING gist (
    student_person_id WITH =,
    tstzrange(starts_at,ends_at,'[)') WITH &&
 ) WHERE (status='ASSIGNED')
);

CREATE TABLE learning.schedule_slot_event (
 event_id uuid PRIMARY KEY,
 slot_id uuid NOT NULL REFERENCES learning.schedule_slot,
 enrollment_id uuid,
 event_kind text NOT NULL CHECK(event_kind IN ('DELIVERY_SET','PARTICIPANT_ASSIGNED','PARTICIPANT_CHANGED','FINALIZED','CANCELLED','COMPLETED')),
 previous_mode text,
 next_mode text,
 previous_room_id uuid,
 next_room_id uuid,
 reason_code text NOT NULL CHECK(length(btrim(reason_code)) BETWEEN 1 AND 100),
 actor_principal_id uuid NOT NULL REFERENCES auth.principals,
 occurred_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TRIGGER schedule_slot_event_immutable
 BEFORE UPDATE OR DELETE ON learning.schedule_slot_event
 FOR EACH ROW EXECUTE FUNCTION learning.reject_history_change();


-- An existing audited slot-complete/cancel operation must release per-student
-- reservations, even if the caller uses the formal 0022 API. No standalone
-- deletion or second cancellation state machine is introduced.
CREATE FUNCTION learning.release_slot_reservations() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,auth,learning
AS $fn$
BEGIN
 IF OLD.status='SCHEDULED' AND NEW.status IN ('COMPLETED','CANCELLED') THEN
   IF auth.current_principal_id() IS NULL
   THEN RAISE EXCEPTION 'ACADEMY_SLOT_RELEASE_ACTOR_REQUIRED'; END IF;
   UPDATE learning.schedule_slot_participant SET status='CANCELLED'
    WHERE slot_id=NEW.slot_id AND status='ASSIGNED';
   NEW.delivery_finalized:=false;
   INSERT INTO learning.schedule_slot_event(event_id,slot_id,event_kind,
       previous_mode,next_mode,reason_code,actor_principal_id)
   VALUES(gen_random_uuid(),NEW.slot_id,NEW.status,OLD.delivery_mode,NEW.delivery_mode,
       'EXISTING_SLOT_STATE_CHANGE',auth.current_principal_id());
 END IF;
 RETURN NEW;
END $fn$;
CREATE TRIGGER learning_slot_release_reservations
 BEFORE UPDATE OF status ON learning.schedule_slot
 FOR EACH ROW EXECUTE FUNCTION learning.release_slot_reservations();

CREATE FUNCTION learning.lead_teacher_owns_slot(p_slot_id uuid) RETURNS boolean
LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth,learning
RETURN coalesce(
 auth.write_context_is_live() AND auth.current_channel()='STAFF'
 AND learning.current_staff_kind()='TEACHER'
 AND EXISTS (
  SELECT 1 FROM learning.schedule_slot s
  JOIN learning.teacher_assignment a
    ON a.class_id=s.class_id AND a.teacher_person_id=s.teacher_person_id
  WHERE s.slot_id=p_slot_id AND s.teacher_person_id=auth.current_actor_person_id()
    AND s.status='SCHEDULED'
    AND a.status='ACTIVE' AND a.role='LEAD' AND a.revoked_at IS NULL
    AND a.valid_from<=s.starts_at AND a.valid_until>=s.ends_at
 ),false);

CREATE FUNCTION learning.set_slot_delivery(
 p_event_id uuid,p_slot_id uuid,p_mode text,p_room_id uuid,p_timezone text,p_reason text
) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth,core,learning,audit AS $fn$
DECLARE v_slot learning.schedule_slot%ROWTYPE; v_room learning.room%ROWTYPE;
BEGIN
 SELECT * INTO v_slot FROM learning.schedule_slot WHERE slot_id=p_slot_id FOR UPDATE;
 IF (FOUND AND core.is_uuid_v7(p_event_id)
     AND learning.lead_teacher_owns_slot(p_slot_id)
     AND p_mode IN ('ONLINE','ONSITE','HYBRID')
     AND length(btrim(p_reason)) BETWEEN 1 AND 100
     AND EXISTS (SELECT 1 FROM pg_catalog.pg_timezone_names WHERE name=p_timezone)
     AND ((p_mode='ONLINE' AND p_room_id IS NULL)
       OR (p_mode IN ('ONSITE','HYBRID') AND p_room_id IS NOT NULL))) IS NOT TRUE
 THEN RETURN audit.record_write_decision('SET','LEARNING_SLOT_DELIVERY',p_slot_id,false,'TEACHER_MODE_OR_INPUT_DENIED'); END IF;
 IF p_room_id IS NOT NULL THEN
   SELECT * INTO v_room FROM learning.room WHERE room_id=p_room_id FOR SHARE;
   IF NOT FOUND OR v_room.status<>'ACTIVE' OR v_room.timezone_name<>p_timezone
   THEN RETURN audit.record_write_decision('SET','LEARNING_SLOT_DELIVERY',p_slot_id,false,'ROOM_OR_TIMEZONE_DENIED'); END IF;
 END IF;
 UPDATE learning.schedule_slot SET delivery_mode=p_mode,room_id=p_room_id,timezone_name=p_timezone,
   mode_set_by_principal_id=auth.current_principal_id(),mode_set_at=clock_timestamp(),
   delivery_finalized=false WHERE slot_id=p_slot_id;
 INSERT INTO learning.schedule_slot_event(event_id,slot_id,event_kind,
   previous_mode,next_mode,previous_room_id,next_room_id,reason_code,actor_principal_id)
 VALUES(p_event_id,p_slot_id,'DELIVERY_SET',v_slot.delivery_mode,p_mode,v_slot.room_id,p_room_id,btrim(p_reason),auth.current_principal_id());
 RETURN audit.record_write_decision('SET','LEARNING_SLOT_DELIVERY',p_slot_id,true,'TEACHER_SET_MODE');
END $fn$;

CREATE FUNCTION learning.assign_slot_participant(
 p_event_id uuid,p_slot_id uuid,p_enrollment_id uuid,p_mode text,p_reason text
) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth,core,learning,audit AS $fn$
DECLARE v_slot learning.schedule_slot%ROWTYPE; v_enrollment learning.enrollment_class%ROWTYPE;
 v_old learning.schedule_slot_participant%ROWTYPE; v_room_capacity integer; v_onsite_count integer;
BEGIN
 SELECT * INTO v_slot FROM learning.schedule_slot WHERE slot_id=p_slot_id FOR UPDATE;
 IF (FOUND AND core.is_uuid_v7(p_event_id) AND learning.lead_teacher_owns_slot(p_slot_id)
     AND p_mode IN ('ONLINE','ONSITE') AND v_slot.delivery_mode IS NOT NULL
     AND length(btrim(p_reason)) BETWEEN 1 AND 100
     AND (v_slot.delivery_mode='HYBRID' OR
       v_slot.delivery_mode='ONLINE' AND p_mode='ONLINE' OR
       v_slot.delivery_mode='ONSITE' AND p_mode='ONSITE')) IS NOT TRUE
 THEN RETURN audit.record_write_decision('ASSIGN','LEARNING_SLOT_PARTICIPANT',p_slot_id,false,'TEACHER_MODE_OR_STATE_DENIED'); END IF;
 SELECT * INTO v_enrollment FROM learning.enrollment_class ec
 WHERE ec.enrollment_id=p_enrollment_id AND ec.class_id=v_slot.class_id AND ec.status='ACTIVE'
   AND EXISTS(SELECT 1 FROM learning.enrollment e
     WHERE e.enrollment_id=ec.enrollment_id AND e.status='ACTIVE');
 IF NOT FOUND OR learning.teacher_has_class_access(v_slot.class_id,v_enrollment.student_person_id) IS NOT TRUE
 THEN RETURN audit.record_write_decision('ASSIGN','LEARNING_SLOT_PARTICIPANT',p_slot_id,false,'ROSTER_OR_CONSENT_DENIED'); END IF;
 SELECT * INTO v_old FROM learning.schedule_slot_participant
   WHERE slot_id=p_slot_id AND enrollment_id=p_enrollment_id FOR UPDATE;
 IF p_mode='ONSITE' THEN
   SELECT capacity INTO v_room_capacity FROM learning.room WHERE room_id=v_slot.room_id FOR SHARE;
   SELECT count(*) INTO v_onsite_count FROM learning.schedule_slot_participant
   WHERE slot_id=p_slot_id AND status='ASSIGNED' AND participation_mode='ONSITE'
     AND enrollment_id<>p_enrollment_id;
   IF v_room_capacity IS NULL OR v_onsite_count>=v_room_capacity
   THEN RETURN audit.record_write_decision('ASSIGN','LEARNING_SLOT_PARTICIPANT',p_slot_id,false,'ROOM_CAPACITY_DENIED'); END IF;
 END IF;
 INSERT INTO learning.schedule_slot_participant(
   slot_id,class_id,enrollment_id,family_id,student_person_id,participation_mode,
   status,starts_at,ends_at,assigned_by_principal_id)
 VALUES(p_slot_id,v_slot.class_id,v_enrollment.enrollment_id,v_enrollment.family_id,
   v_enrollment.student_person_id,p_mode,'ASSIGNED',v_slot.starts_at,v_slot.ends_at,auth.current_principal_id())
 ON CONFLICT(slot_id,enrollment_id) DO UPDATE
 SET participation_mode=excluded.participation_mode,status='ASSIGNED',
     starts_at=excluded.starts_at,ends_at=excluded.ends_at,
     assigned_by_principal_id=excluded.assigned_by_principal_id,
     assigned_at=clock_timestamp();
 UPDATE learning.schedule_slot SET delivery_finalized=false WHERE slot_id=p_slot_id;
 INSERT INTO learning.schedule_slot_event(event_id,slot_id,enrollment_id,event_kind,
   previous_mode,next_mode,reason_code,actor_principal_id)
 VALUES(p_event_id,p_slot_id,p_enrollment_id,
   CASE WHEN v_old.slot_id IS NULL THEN 'PARTICIPANT_ASSIGNED' ELSE 'PARTICIPANT_CHANGED' END,
   v_old.participation_mode,p_mode,btrim(p_reason),auth.current_principal_id());
 RETURN audit.record_write_decision('ASSIGN','LEARNING_SLOT_PARTICIPANT',p_slot_id,true,'TEACHER_ASSIGNED_PARTICIPATION');
END $fn$;

CREATE FUNCTION learning.finalize_slot_delivery(p_event_id uuid,p_slot_id uuid,p_reason text)
RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,auth,core,learning,audit AS $fn$
DECLARE v_slot learning.schedule_slot%ROWTYPE; v_total integer; v_on integer; v_off integer; v_capacity integer;
BEGIN
 SELECT * INTO v_slot FROM learning.schedule_slot WHERE slot_id=p_slot_id FOR UPDATE;
 IF (FOUND AND core.is_uuid_v7(p_event_id) AND learning.lead_teacher_owns_slot(p_slot_id)
     AND v_slot.delivery_mode IS NOT NULL AND v_slot.delivery_finalized=false
     AND length(btrim(p_reason)) BETWEEN 1 AND 100) IS NOT TRUE
 THEN RETURN audit.record_write_decision('FINALIZE','LEARNING_SLOT_DELIVERY',p_slot_id,false,'TEACHER_OR_STATE_DENIED'); END IF;
 SELECT count(*),count(*) FILTER(WHERE participation_mode='ONLINE'),
   count(*) FILTER(WHERE participation_mode='ONSITE')
 INTO v_total,v_on,v_off FROM learning.schedule_slot_participant
 WHERE slot_id=p_slot_id AND status='ASSIGNED';
 IF v_total=0 OR (v_slot.delivery_mode='ONLINE' AND v_off>0)
   OR (v_slot.delivery_mode='ONSITE' AND v_on>0)
   OR (v_slot.delivery_mode='HYBRID' AND (v_on=0 OR v_off=0))
 THEN RETURN audit.record_write_decision('FINALIZE','LEARNING_SLOT_DELIVERY',p_slot_id,false,'PARTICIPATION_NOT_READY'); END IF;
 IF v_slot.room_id IS NOT NULL THEN
   SELECT capacity INTO v_capacity FROM learning.room WHERE room_id=v_slot.room_id AND status='ACTIVE' FOR SHARE;
   IF v_capacity IS NULL OR v_off>v_capacity
   THEN RETURN audit.record_write_decision('FINALIZE','LEARNING_SLOT_DELIVERY',p_slot_id,false,'ROOM_CAPACITY_DENIED'); END IF;
 END IF;
 UPDATE learning.schedule_slot SET delivery_finalized=true WHERE slot_id=p_slot_id;
 INSERT INTO learning.schedule_slot_event(event_id,slot_id,event_kind,
   previous_mode,next_mode,reason_code,actor_principal_id)
 VALUES(p_event_id,p_slot_id,'FINALIZED',v_slot.delivery_mode,v_slot.delivery_mode,btrim(p_reason),auth.current_principal_id());
 RETURN audit.record_write_decision('FINALIZE','LEARNING_SLOT_DELIVERY',p_slot_id,true,'TEACHER_FINALIZED');
END $fn$;

-- Direct queries/updates remain blocked. The new functions are the only write API.
DO $rls$
DECLARE tbl text;
BEGIN
 FOREACH tbl IN ARRAY ARRAY['room','schedule_slot_participant','schedule_slot_event'] LOOP
   EXECUTE format('ALTER TABLE learning.%I ENABLE ROW LEVEL SECURITY',tbl);
   EXECUTE format('ALTER TABLE learning.%I FORCE ROW LEVEL SECURITY',tbl);
   EXECUTE format('CREATE POLICY %I ON learning.%I FOR ALL TO phoenix_canonical_app,phoenix_canonical_reader USING(false) WITH CHECK(false)',tbl||'_no_direct_access',tbl);
 END LOOP;
END $rls$;
REVOKE ALL ON learning.room,learning.schedule_slot_participant,learning.schedule_slot_event
 FROM PUBLIC,phoenix_canonical_app,phoenix_canonical_reader;
REVOKE EXECUTE ON FUNCTION learning.validate_room_timezone(),learning.release_slot_reservations(),learning.lead_teacher_owns_slot(uuid),
 learning.set_slot_delivery(uuid,uuid,text,uuid,text,text),
 learning.assign_slot_participant(uuid,uuid,uuid,text,text),
 learning.finalize_slot_delivery(uuid,uuid,text)
 FROM PUBLIC,phoenix_canonical_reader,phoenix_canonical_context_binder;
REVOKE EXECUTE ON FUNCTION learning.validate_room_timezone(),learning.release_slot_reservations(),learning.lead_teacher_owns_slot(uuid)
 FROM phoenix_canonical_app;
GRANT EXECUTE ON FUNCTION learning.set_slot_delivery(uuid,uuid,text,uuid,text,text),
 learning.assign_slot_participant(uuid,uuid,uuid,text,text),
 learning.finalize_slot_delivery(uuid,uuid,text)
 TO phoenix_canonical_app;
COMMIT;
