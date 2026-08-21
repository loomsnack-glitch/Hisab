-- migrate:up

CREATE TYPE whatsapp_cloud_quota_reservation_status_enum AS ENUM (
    'reserved',
    'settled',
    'released'
);

CREATE TYPE whatsapp_cloud_quota_event_type_enum AS ENUM (
    'reserved',
    'settled',
    'released'
);

CREATE TABLE whatsapp_cloud_quota_policies (
    organization_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    monthly_message_limit BIGINT,
    monthly_budget_minor BIGINT,
    currency_code VARCHAR(3) NOT NULL DEFAULT 'INR',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT whatsapp_cloud_quota_message_limit_check
        CHECK (monthly_message_limit IS NULL OR monthly_message_limit >= 0),
    CONSTRAINT whatsapp_cloud_quota_budget_check
        CHECK (monthly_budget_minor IS NULL OR monthly_budget_minor >= 0),
    CONSTRAINT whatsapp_cloud_quota_currency_check
        CHECK (currency_code ~ '^[A-Z]{3}$')
);

CREATE TABLE whatsapp_cloud_quota_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    whatsapp_account_id UUID NOT NULL,
    store_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    idempotency_key VARCHAR(255) NOT NULL,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    units INTEGER NOT NULL DEFAULT 1,
    estimated_cost_minor BIGINT NOT NULL DEFAULT 0,
    status whatsapp_cloud_quota_reservation_status_enum NOT NULL DEFAULT 'reserved',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    settled_at TIMESTAMP WITH TIME ZONE,
    released_at TIMESTAMP WITH TIME ZONE,
    UNIQUE (organization_id, idempotency_key),
    UNIQUE (id, organization_id),
    CONSTRAINT whatsapp_cloud_quota_reservation_units_check CHECK (units > 0),
    CONSTRAINT whatsapp_cloud_quota_reservation_cost_check CHECK (estimated_cost_minor >= 0),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (whatsapp_account_id, organization_id)
        REFERENCES whatsapp_accounts(id, organization_id) ON DELETE RESTRICT,
    FOREIGN KEY (store_id, organization_id)
        REFERENCES stores(id, organization_id) ON DELETE RESTRICT,
    FOREIGN KEY (customer_id, organization_id)
        REFERENCES customers(id, organization_id) ON DELETE RESTRICT
);

CREATE INDEX idx_whatsapp_cloud_quota_reservations_period
    ON whatsapp_cloud_quota_reservations (organization_id, period_start, status);

CREATE TABLE whatsapp_cloud_usage_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    reservation_id UUID NOT NULL,
    event_type whatsapp_cloud_quota_event_type_enum NOT NULL,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    units_delta INTEGER NOT NULL,
    cost_minor_delta BIGINT NOT NULL,
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (reservation_id, event_type),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (reservation_id, organization_id)
        REFERENCES whatsapp_cloud_quota_reservations(id, organization_id) ON DELETE RESTRICT,
    CONSTRAINT whatsapp_cloud_usage_ledger_delta_check
        CHECK (units_delta <> 0 OR cost_minor_delta <> 0 OR event_type = 'settled')
);

CREATE INDEX idx_whatsapp_cloud_usage_ledger_period
    ON whatsapp_cloud_usage_ledger (organization_id, period_start, occurred_at);

ALTER TABLE whatsapp_outbox
    ADD COLUMN cloud_quota_reservation_id UUID,
    ADD CONSTRAINT whatsapp_outbox_cloud_quota_reservation_fkey
        FOREIGN KEY (cloud_quota_reservation_id, organization_id)
        REFERENCES whatsapp_cloud_quota_reservations(id, organization_id) ON DELETE RESTRICT;

ALTER TABLE whatsapp_messages
    DROP CONSTRAINT IF EXISTS whatsapp_messages_content_check,
    ADD CONSTRAINT whatsapp_messages_content_check CHECK (
        (message_type = 'text' AND body IS NOT NULL AND LENGTH(BTRIM(body)) > 0)
        OR (message_type = 'document' AND attachment_storage_key IS NOT NULL)
        OR (message_type = 'image' AND attachment_storage_key IS NOT NULL)
        OR (message_type = 'template' AND body IS NULL)
    );

-- migrate:down

ALTER TABLE whatsapp_messages
    DROP CONSTRAINT IF EXISTS whatsapp_messages_content_check,
    ADD CONSTRAINT whatsapp_messages_content_check CHECK (
        (message_type = 'text' AND body IS NOT NULL AND LENGTH(BTRIM(body)) > 0)
        OR (message_type = 'document' AND attachment_storage_key IS NOT NULL)
    );

ALTER TABLE whatsapp_outbox
    DROP CONSTRAINT IF EXISTS whatsapp_outbox_cloud_quota_reservation_fkey,
    DROP COLUMN IF EXISTS cloud_quota_reservation_id;

DROP TABLE IF EXISTS whatsapp_cloud_usage_ledger;
DROP TABLE IF EXISTS whatsapp_cloud_quota_reservations;
DROP TABLE IF EXISTS whatsapp_cloud_quota_policies;
DROP TYPE IF EXISTS whatsapp_cloud_quota_event_type_enum;
DROP TYPE IF EXISTS whatsapp_cloud_quota_reservation_status_enum;
