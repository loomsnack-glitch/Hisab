-- migrate:up

CREATE TYPE whatsapp_provider_event_status_enum AS ENUM (
    'pending',
    'processing',
    'completed',
    'retryable',
    'dead_letter'
);

CREATE TABLE whatsapp_provider_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    whatsapp_account_id UUID NOT NULL,
    provider_event_id VARCHAR(255) NOT NULL,
    payload JSONB NOT NULL,
    status whatsapp_provider_event_status_enum NOT NULL DEFAULT 'pending',
    attempt_count INTEGER NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    lease_owner VARCHAR(255),
    lease_expires_at TIMESTAMP WITH TIME ZONE,
    last_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (whatsapp_account_id, provider_event_id),
    FOREIGN KEY (whatsapp_account_id) REFERENCES whatsapp_accounts(id) ON DELETE CASCADE,
    CONSTRAINT whatsapp_provider_events_attempt_count_check CHECK (attempt_count >= 0)
);

CREATE INDEX idx_whatsapp_provider_events_dispatch
    ON whatsapp_provider_events (status, next_attempt_at, created_at);

-- migrate:down

DROP TABLE whatsapp_provider_events;
DROP TYPE whatsapp_provider_event_status_enum;
