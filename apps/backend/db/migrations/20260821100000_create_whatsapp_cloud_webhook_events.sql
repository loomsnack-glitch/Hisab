-- migrate:up

CREATE TYPE whatsapp_cloud_webhook_event_status_enum AS ENUM (
    'pending',
    'processing',
    'completed',
    'retryable',
    'dead_letter',
    'ignored'
);

CREATE TABLE whatsapp_cloud_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_key VARCHAR(64) NOT NULL,
    waba_id VARCHAR(64),
    phone_number_id VARCHAR(64),
    whatsapp_account_id UUID,
    payload JSONB NOT NULL,
    status whatsapp_cloud_webhook_event_status_enum NOT NULL DEFAULT 'pending',
    attempt_count INTEGER NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    lease_owner VARCHAR(255),
    lease_expires_at TIMESTAMP WITH TIME ZONE,
    last_error_code VARCHAR(100),
    last_error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (event_key),
    FOREIGN KEY (whatsapp_account_id) REFERENCES whatsapp_accounts(id) ON DELETE SET NULL,
    CONSTRAINT whatsapp_cloud_webhook_events_event_key_check
        CHECK (event_key ~ '^[a-f0-9]{64}$'),
    CONSTRAINT whatsapp_cloud_webhook_events_waba_id_check
        CHECK (waba_id IS NULL OR LENGTH(BTRIM(waba_id)) BETWEEN 1 AND 64),
    CONSTRAINT whatsapp_cloud_webhook_events_phone_number_id_check
        CHECK (phone_number_id IS NULL OR LENGTH(BTRIM(phone_number_id)) BETWEEN 1 AND 64),
    CONSTRAINT whatsapp_cloud_webhook_events_payload_check
        CHECK (jsonb_typeof(payload) = 'object'),
    CONSTRAINT whatsapp_cloud_webhook_events_attempt_count_check
        CHECK (attempt_count >= 0)
);

CREATE INDEX idx_whatsapp_cloud_webhook_events_dispatch
    ON whatsapp_cloud_webhook_events (status, next_attempt_at, created_at);

CREATE INDEX idx_whatsapp_cloud_webhook_events_account
    ON whatsapp_cloud_webhook_events (whatsapp_account_id, created_at DESC);

CREATE INDEX idx_whatsapp_cloud_webhook_events_route
    ON whatsapp_cloud_webhook_events (waba_id, phone_number_id, created_at DESC);

-- migrate:down

DROP INDEX IF EXISTS idx_whatsapp_cloud_webhook_events_route;
DROP INDEX IF EXISTS idx_whatsapp_cloud_webhook_events_account;
DROP INDEX IF EXISTS idx_whatsapp_cloud_webhook_events_dispatch;
DROP TABLE IF EXISTS whatsapp_cloud_webhook_events;
DROP TYPE IF EXISTS whatsapp_cloud_webhook_event_status_enum;
