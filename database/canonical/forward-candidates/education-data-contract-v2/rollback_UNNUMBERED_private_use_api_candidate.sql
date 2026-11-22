BEGIN;
-- Disposable test rollback only. Apply before the EDC V2 base rollback.
REVOKE ALL ON FUNCTION service.edc_request_private_document_use(uuid,uuid,uuid,text) FROM phoenix_canonical_app,PUBLIC;
DROP FUNCTION service.edc_request_private_document_use(uuid,uuid,uuid,text);
COMMIT;
