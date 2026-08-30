-- migrate:up

ALTER TABLE google_contacts_connections
    ADD COLUMN initial_sync_status VARCHAR(32) NOT NULL DEFAULT 'not_started',
    ADD COLUMN last_successful_sync_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE google_contacts_connections
    ADD CONSTRAINT google_contacts_connections_initial_sync_status_check
        CHECK (initial_sync_status IN ('not_started', 'pending', 'completed'));

CREATE TABLE google_contacts_sync_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    connection_id UUID NOT NULL REFERENCES google_contacts_connections(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL,
    status VARCHAR(32) NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    lease_owner VARCHAR(100),
    lease_expires_at TIMESTAMP WITH TIME ZONE,
    customer_updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_error_code VARCHAR(64),
    last_error_message VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (connection_id, customer_id),
    FOREIGN KEY (customer_id, organization_id) REFERENCES customers(id, organization_id) ON DELETE CASCADE,
    CONSTRAINT google_contacts_sync_outbox_status_check
        CHECK (status IN ('pending', 'processing', 'completed', 'skipped', 'failed', 'conflict')),
    CONSTRAINT google_contacts_sync_outbox_attempt_count_check
        CHECK (attempt_count >= 0),
    CONSTRAINT google_contacts_sync_outbox_lease_check
        CHECK ((lease_owner IS NULL) = (lease_expires_at IS NULL)),
    CONSTRAINT google_contacts_sync_outbox_error_code_check
        CHECK (last_error_code IS NULL OR LENGTH(BTRIM(last_error_code)) BETWEEN 1 AND 64),
    CONSTRAINT google_contacts_sync_outbox_error_message_check
        CHECK (last_error_message IS NULL OR LENGTH(BTRIM(last_error_message)) BETWEEN 1 AND 500)
);

CREATE INDEX idx_google_contacts_sync_outbox_claim
    ON google_contacts_sync_outbox (next_attempt_at, id)
    WHERE status IN ('pending', 'processing');

CREATE INDEX idx_google_contacts_sync_outbox_connection_status
    ON google_contacts_sync_outbox (connection_id, status);

CREATE TABLE google_contacts_customer_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    connection_id UUID NOT NULL REFERENCES google_contacts_connections(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL,
    google_resource_name VARCHAR(255) NOT NULL,
    matched_phone VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (connection_id, customer_id),
    UNIQUE (connection_id, google_resource_name),
    FOREIGN KEY (customer_id, organization_id) REFERENCES customers(id, organization_id) ON DELETE CASCADE,
    CONSTRAINT google_contacts_customer_links_resource_check
        CHECK (LENGTH(BTRIM(google_resource_name)) BETWEEN 1 AND 255),
    CONSTRAINT google_contacts_customer_links_phone_check
        CHECK (LENGTH(BTRIM(matched_phone)) BETWEEN 1 AND 20)
);

-- migrate:down

DROP TABLE IF EXISTS google_contacts_customer_links;
DROP TABLE IF EXISTS google_contacts_sync_outbox;

ALTER TABLE google_contacts_connections
    DROP CONSTRAINT IF EXISTS google_contacts_connections_initial_sync_status_check;

ALTER TABLE google_contacts_connections
    DROP COLUMN IF EXISTS last_successful_sync_at,
    DROP COLUMN IF EXISTS initial_sync_status;
