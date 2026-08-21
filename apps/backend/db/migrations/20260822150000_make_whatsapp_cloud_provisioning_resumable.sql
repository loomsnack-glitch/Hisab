-- migrate:up

-- An onboarding attempt exists before a local account can be created. Keep
-- provider identity and the opaque vault binding so a failed provider step can
-- resume without exchanging or persisting the access token again.
ALTER TABLE whatsapp_cloud_provisioning_attempts
    ALTER COLUMN whatsapp_account_id DROP NOT NULL,
    ADD COLUMN provider_waba_id VARCHAR(64),
    ADD COLUMN provider_phone_number_id VARCHAR(64),
    ADD COLUMN credential_reference VARCHAR(255),
    ADD COLUMN credential_key_version VARCHAR(64),
    ADD CONSTRAINT whatsapp_cloud_provisioning_provider_waba_id_check
        CHECK (provider_waba_id IS NULL OR LENGTH(BTRIM(provider_waba_id)) BETWEEN 1 AND 64),
    ADD CONSTRAINT whatsapp_cloud_provisioning_provider_phone_id_check
        CHECK (provider_phone_number_id IS NULL OR LENGTH(BTRIM(provider_phone_number_id)) BETWEEN 1 AND 64),
    ADD CONSTRAINT whatsapp_cloud_provisioning_credential_reference_check
        CHECK (credential_reference IS NULL OR LENGTH(BTRIM(credential_reference)) BETWEEN 1 AND 255),
    ADD CONSTRAINT whatsapp_cloud_provisioning_credential_version_check
        CHECK (credential_key_version IS NULL OR LENGTH(BTRIM(credential_key_version)) BETWEEN 1 AND 64),
    ADD CONSTRAINT whatsapp_cloud_provisioning_credential_pair_check
        CHECK ((credential_reference IS NULL) = (credential_key_version IS NULL));

CREATE INDEX idx_whatsapp_cloud_provisioning_attempts_resume
    ON whatsapp_cloud_provisioning_attempts (organization_id, idempotency_key, status, updated_at DESC);

-- migrate:down

DROP INDEX IF EXISTS idx_whatsapp_cloud_provisioning_attempts_resume;

ALTER TABLE whatsapp_cloud_provisioning_attempts
    DROP CONSTRAINT IF EXISTS whatsapp_cloud_provisioning_credential_pair_check,
    DROP CONSTRAINT IF EXISTS whatsapp_cloud_provisioning_credential_version_check,
    DROP CONSTRAINT IF EXISTS whatsapp_cloud_provisioning_credential_reference_check,
    DROP CONSTRAINT IF EXISTS whatsapp_cloud_provisioning_provider_phone_id_check,
    DROP CONSTRAINT IF EXISTS whatsapp_cloud_provisioning_provider_waba_id_check,
    DROP COLUMN IF EXISTS credential_key_version,
    DROP COLUMN IF EXISTS credential_reference,
    DROP COLUMN IF EXISTS provider_phone_number_id,
    DROP COLUMN IF EXISTS provider_waba_id;

-- Down is only valid after all resumable attempts have been finalized.
ALTER TABLE whatsapp_cloud_provisioning_attempts
    ALTER COLUMN whatsapp_account_id SET NOT NULL;
