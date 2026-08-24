-- migrate:up

-- A credential reference is meaningful only with the key version that can be
-- used to resolve it. The access token itself must never be stored here.
ALTER TABLE whatsapp_business_accounts
    ADD CONSTRAINT whatsapp_business_accounts_credential_binding_check
        CHECK (
            (credential_reference IS NULL AND credential_key_version IS NULL)
            OR (credential_reference IS NOT NULL AND credential_key_version IS NOT NULL)
        ),
    ADD CONSTRAINT whatsapp_business_accounts_identity_status_check
        CHECK (
            status IN ('pending_authorization', 'provisioning', 'failed')
            OR (
                waba_id IS NOT NULL
                AND credential_reference IS NOT NULL
                AND credential_key_version IS NOT NULL
            )
        );

-- A sender is either still waiting for Cloud provisioning, or has both
-- provider identities. Never persist a half-bound WABA/phone pair.
ALTER TABLE whatsapp_accounts
    ADD CONSTRAINT whatsapp_accounts_cloud_identity_pair_check
        CHECK (
            (
                cloud_phone_number_id IS NULL
                AND whatsapp_business_account_id IS NULL
                AND cloud_status IN ('pending_authorization', 'provisioning', 'failed')
            )
            OR (
                cloud_phone_number_id IS NOT NULL
                AND whatsapp_business_account_id IS NOT NULL
                AND cloud_status IS NOT NULL
            )
            OR (
                provider <> 'cloud_api'
                AND
                cloud_phone_number_id IS NULL
                AND whatsapp_business_account_id IS NULL
                AND cloud_status IS NULL
            )
        );

-- Every account with Store assignments must have exactly one deterministic
-- inbound route at transaction commit. The trigger is deferred so replacing
-- one default assignment inside a transaction remains atomic.
CREATE FUNCTION ensure_whatsapp_account_default_store() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    account_id UUID;
BEGIN
    account_id := COALESCE(NEW.whatsapp_account_id, OLD.whatsapp_account_id);

    IF EXISTS (
        SELECT 1
        FROM whatsapp_account_stores
        WHERE whatsapp_account_id = account_id
    ) AND NOT EXISTS (
        SELECT 1
        FROM whatsapp_account_stores
        WHERE whatsapp_account_id = account_id
          AND is_default_for_inbound
    ) THEN
        RAISE EXCEPTION 'WhatsApp account must have one default inbound Store';
    END IF;

    RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER whatsapp_account_stores_default_store_trigger
    AFTER INSERT OR UPDATE OR DELETE ON whatsapp_account_stores
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE FUNCTION ensure_whatsapp_account_default_store();

-- migrate:down

DROP TRIGGER IF EXISTS whatsapp_account_stores_default_store_trigger ON whatsapp_account_stores;
DROP FUNCTION IF EXISTS ensure_whatsapp_account_default_store();

ALTER TABLE whatsapp_accounts
    DROP CONSTRAINT IF EXISTS whatsapp_accounts_cloud_identity_pair_check;

ALTER TABLE whatsapp_business_accounts
    DROP CONSTRAINT IF EXISTS whatsapp_business_accounts_identity_status_check,
    DROP CONSTRAINT IF EXISTS whatsapp_business_accounts_credential_binding_check;
