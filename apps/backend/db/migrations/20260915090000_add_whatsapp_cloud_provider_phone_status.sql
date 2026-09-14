-- migrate:up

-- Meta phone registration is independent of Ganatri cloud_status.
-- connected means credentials are stored; CONNECTED means Meta can send.
ALTER TABLE whatsapp_accounts
    ADD COLUMN cloud_provider_phone_status VARCHAR(32),
    ADD COLUMN cloud_provider_code_verification_status VARCHAR(64),
    ADD COLUMN cloud_provider_platform_type VARCHAR(64),
    ADD COLUMN cloud_provider_is_on_biz_app BOOLEAN,
    ADD CONSTRAINT whatsapp_accounts_cloud_provider_phone_status_check
        CHECK (
            cloud_provider_phone_status IS NULL
            OR LENGTH(BTRIM(cloud_provider_phone_status)) BETWEEN 1 AND 32
        ),
    ADD CONSTRAINT whatsapp_accounts_cloud_provider_code_verification_status_check
        CHECK (
            cloud_provider_code_verification_status IS NULL
            OR LENGTH(BTRIM(cloud_provider_code_verification_status)) BETWEEN 1 AND 64
        ),
    ADD CONSTRAINT whatsapp_accounts_cloud_provider_platform_type_check
        CHECK (
            cloud_provider_platform_type IS NULL
            OR LENGTH(BTRIM(cloud_provider_platform_type)) BETWEEN 1 AND 64
        );

-- migrate:down

ALTER TABLE whatsapp_accounts
    DROP CONSTRAINT IF EXISTS whatsapp_accounts_cloud_provider_phone_status_check,
    DROP CONSTRAINT IF EXISTS whatsapp_accounts_cloud_provider_code_verification_status_check,
    DROP CONSTRAINT IF EXISTS whatsapp_accounts_cloud_provider_platform_type_check,
    DROP COLUMN IF EXISTS cloud_provider_phone_status,
    DROP COLUMN IF EXISTS cloud_provider_code_verification_status,
    DROP COLUMN IF EXISTS cloud_provider_platform_type,
    DROP COLUMN IF EXISTS cloud_provider_is_on_biz_app;
