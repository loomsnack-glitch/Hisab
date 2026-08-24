-- migrate:up

ALTER TABLE whatsapp_cloud_quota_policies
    ADD COLUMN account_send_interval_seconds INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN recipient_window_seconds INTEGER NOT NULL DEFAULT 86_400,
    ADD COLUMN recipient_window_limit INTEGER,
    ADD COLUMN customer_cooldown_seconds INTEGER NOT NULL DEFAULT 0,
    ADD CONSTRAINT whatsapp_cloud_quota_send_interval_check
        CHECK (account_send_interval_seconds BETWEEN 0 AND 86_400),
    ADD CONSTRAINT whatsapp_cloud_quota_window_seconds_check
        CHECK (recipient_window_seconds BETWEEN 60 AND 2_592_000),
    ADD CONSTRAINT whatsapp_cloud_quota_window_limit_check
        CHECK (recipient_window_limit IS NULL OR recipient_window_limit > 0),
    ADD CONSTRAINT whatsapp_cloud_quota_customer_cooldown_check
        CHECK (customer_cooldown_seconds BETWEEN 0 AND 2_592_000);

ALTER TABLE whatsapp_cloud_quota_reservations
    ADD COLUMN campaign_key VARCHAR(255),
    ADD CONSTRAINT whatsapp_cloud_quota_campaign_key_check
        CHECK (campaign_key IS NULL OR LENGTH(BTRIM(campaign_key)) BETWEEN 1 AND 255);

CREATE UNIQUE INDEX whatsapp_cloud_quota_campaign_recipient_key
    ON whatsapp_cloud_quota_reservations (organization_id, campaign_key, customer_id)
    WHERE campaign_key IS NOT NULL;

CREATE INDEX idx_whatsapp_cloud_quota_recipient_window
    ON whatsapp_cloud_quota_reservations (organization_id, whatsapp_account_id, created_at, status);

-- migrate:down

DROP INDEX IF EXISTS idx_whatsapp_cloud_quota_recipient_window;
DROP INDEX IF EXISTS whatsapp_cloud_quota_campaign_recipient_key;

ALTER TABLE whatsapp_cloud_quota_reservations
    DROP CONSTRAINT IF EXISTS whatsapp_cloud_quota_campaign_key_check,
    DROP COLUMN IF EXISTS campaign_key;

ALTER TABLE whatsapp_cloud_quota_policies
    DROP CONSTRAINT IF EXISTS whatsapp_cloud_quota_customer_cooldown_check,
    DROP CONSTRAINT IF EXISTS whatsapp_cloud_quota_window_limit_check,
    DROP CONSTRAINT IF EXISTS whatsapp_cloud_quota_window_seconds_check,
    DROP CONSTRAINT IF EXISTS whatsapp_cloud_quota_send_interval_check,
    DROP COLUMN IF EXISTS customer_cooldown_seconds,
    DROP COLUMN IF EXISTS recipient_window_limit,
    DROP COLUMN IF EXISTS recipient_window_seconds,
    DROP COLUMN IF EXISTS account_send_interval_seconds;
