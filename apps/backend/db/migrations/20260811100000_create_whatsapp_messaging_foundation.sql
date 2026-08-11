-- migrate:up

CREATE TYPE whatsapp_provider_enum AS ENUM ('baileys', 'cloud_api');

CREATE TYPE whatsapp_account_status_enum AS ENUM (
    'pending_qr',
    'connecting',
    'connected',
    'disconnected',
    'failed',
    'revoked'
);

CREATE TYPE whatsapp_message_direction_enum AS ENUM ('inbound', 'outbound');

CREATE TYPE whatsapp_message_type_enum AS ENUM ('text', 'document');

CREATE TYPE whatsapp_message_status_enum AS ENUM ('queued', 'sending', 'sent', 'delivered', 'read', 'failed');

CREATE TYPE whatsapp_outbox_kind_enum AS ENUM ('invoice', 'text', 'document');

CREATE TYPE whatsapp_outbox_status_enum AS ENUM (
    'pending',
    'processing',
    'sent',
    'retryable',
    'dead_letter',
    'cancelled'
);

CREATE TABLE whatsapp_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    store_id UUID NOT NULL,
    provider whatsapp_provider_enum NOT NULL DEFAULT 'baileys',
    phone_number VARCHAR(20) NOT NULL,
    phone_number_normalized VARCHAR(20) NOT NULL,
    status whatsapp_account_status_enum NOT NULL DEFAULT 'pending_qr',
    session_reference VARCHAR(255),
    last_connected_at TIMESTAMP WITH TIME ZONE,
    last_seen_at TIMESTAMP WITH TIME ZONE,
    last_error_code VARCHAR(100),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (id, organization_id, store_id),
    UNIQUE (provider, phone_number_normalized),
    CONSTRAINT whatsapp_accounts_phone_number_normalized_check
        CHECK (phone_number_normalized ~ '^[+][1-9][0-9]{7,14}$'),
    FOREIGN KEY (store_id, organization_id) REFERENCES stores(id, organization_id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX whatsapp_accounts_one_active_store_key
    ON whatsapp_accounts (organization_id, store_id)
    WHERE status IN ('pending_qr', 'connecting', 'connected', 'failed');

CREATE INDEX idx_whatsapp_accounts_store_status
    ON whatsapp_accounts (organization_id, store_id, status);

CREATE TABLE whatsapp_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    store_id UUID NOT NULL,
    whatsapp_account_id UUID NOT NULL,
    customer_id UUID,
    external_chat_id VARCHAR(255) NOT NULL,
    contact_phone_number VARCHAR(20) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    last_message_at TIMESTAMP WITH TIME ZONE,
    unread_count INTEGER NOT NULL DEFAULT 0,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (id, organization_id, store_id, whatsapp_account_id),
    UNIQUE (whatsapp_account_id, external_chat_id),
    CONSTRAINT whatsapp_conversations_unread_count_check CHECK (unread_count >= 0),
    CONSTRAINT whatsapp_conversations_contact_phone_check
        CHECK (contact_phone_number ~ '^[+][1-9][0-9]{7,14}$'),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (store_id, organization_id) REFERENCES stores(id, organization_id) ON DELETE CASCADE,
    FOREIGN KEY (whatsapp_account_id, organization_id, store_id)
        REFERENCES whatsapp_accounts(id, organization_id, store_id) ON DELETE RESTRICT,
    FOREIGN KEY (customer_id, organization_id)
        REFERENCES customers(id, organization_id) ON DELETE RESTRICT
);

CREATE INDEX idx_whatsapp_conversations_store_last_message
    ON whatsapp_conversations (organization_id, store_id, last_message_at DESC);

CREATE INDEX idx_whatsapp_conversations_customer
    ON whatsapp_conversations (organization_id, customer_id);

CREATE TABLE whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    store_id UUID NOT NULL,
    whatsapp_account_id UUID NOT NULL,
    conversation_id UUID NOT NULL,
    direction whatsapp_message_direction_enum NOT NULL,
    message_type whatsapp_message_type_enum NOT NULL,
    body TEXT,
    caption TEXT,
    attachment_storage_key TEXT,
    attachment_file_name VARCHAR(255),
    attachment_mime_type VARCHAR(255),
    status whatsapp_message_status_enum NOT NULL DEFAULT 'queued',
    provider_message_id VARCHAR(255),
    idempotency_key VARCHAR(255) NOT NULL,
    failure_code VARCHAR(100),
    failure_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    UNIQUE (id, organization_id, store_id, whatsapp_account_id),
    UNIQUE (whatsapp_account_id, idempotency_key),
    CONSTRAINT whatsapp_messages_content_check CHECK (
        (message_type = 'text' AND body IS NOT NULL AND LENGTH(BTRIM(body)) > 0)
        OR (message_type = 'document' AND attachment_storage_key IS NOT NULL)
    ),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (store_id, organization_id) REFERENCES stores(id, organization_id) ON DELETE CASCADE,
    FOREIGN KEY (whatsapp_account_id, organization_id, store_id)
        REFERENCES whatsapp_accounts(id, organization_id, store_id) ON DELETE RESTRICT,
    FOREIGN KEY (conversation_id, organization_id, store_id, whatsapp_account_id)
        REFERENCES whatsapp_conversations(id, organization_id, store_id, whatsapp_account_id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX whatsapp_messages_provider_message_key
    ON whatsapp_messages (whatsapp_account_id, provider_message_id)
    WHERE provider_message_id IS NOT NULL;

CREATE INDEX idx_whatsapp_messages_conversation_created
    ON whatsapp_messages (conversation_id, created_at);

CREATE TABLE whatsapp_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    store_id UUID NOT NULL,
    whatsapp_account_id UUID NOT NULL,
    message_id UUID NOT NULL,
    sale_id UUID,
    kind whatsapp_outbox_kind_enum NOT NULL,
    status whatsapp_outbox_status_enum NOT NULL DEFAULT 'pending',
    attempt_count INTEGER NOT NULL DEFAULT 0,
    lease_owner VARCHAR(255),
    lease_expires_at TIMESTAMP WITH TIME ZONE,
    next_attempt_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_error_code VARCHAR(100),
    last_error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (message_id),
    CONSTRAINT whatsapp_outbox_attempt_count_check CHECK (attempt_count >= 0),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (store_id, organization_id) REFERENCES stores(id, organization_id) ON DELETE CASCADE,
    FOREIGN KEY (whatsapp_account_id, organization_id, store_id)
        REFERENCES whatsapp_accounts(id, organization_id, store_id) ON DELETE RESTRICT,
    FOREIGN KEY (message_id, organization_id, store_id, whatsapp_account_id)
        REFERENCES whatsapp_messages(id, organization_id, store_id, whatsapp_account_id) ON DELETE RESTRICT,
    FOREIGN KEY (sale_id, organization_id, store_id)
        REFERENCES sales(id, organization_id, store_id) ON DELETE RESTRICT
);

CREATE INDEX idx_whatsapp_outbox_dispatch
    ON whatsapp_outbox (status, next_attempt_at, created_at);

CREATE INDEX idx_whatsapp_outbox_account_status
    ON whatsapp_outbox (whatsapp_account_id, status, next_attempt_at);

CREATE UNIQUE INDEX whatsapp_outbox_one_invoice_per_sale_key
    ON whatsapp_outbox (whatsapp_account_id, sale_id, kind)
    WHERE kind = 'invoice' AND sale_id IS NOT NULL;

-- migrate:down

DROP INDEX IF EXISTS whatsapp_outbox_one_invoice_per_sale_key;
DROP TABLE IF EXISTS whatsapp_outbox;
DROP TABLE IF EXISTS whatsapp_messages;
DROP TABLE IF EXISTS whatsapp_conversations;
DROP INDEX IF EXISTS whatsapp_accounts_one_active_store_key;
DROP TABLE IF EXISTS whatsapp_accounts;

DROP TYPE IF EXISTS whatsapp_outbox_status_enum;
DROP TYPE IF EXISTS whatsapp_outbox_kind_enum;
DROP TYPE IF EXISTS whatsapp_message_status_enum;
DROP TYPE IF EXISTS whatsapp_message_type_enum;
DROP TYPE IF EXISTS whatsapp_message_direction_enum;
DROP TYPE IF EXISTS whatsapp_account_status_enum;
DROP TYPE IF EXISTS whatsapp_provider_enum;
