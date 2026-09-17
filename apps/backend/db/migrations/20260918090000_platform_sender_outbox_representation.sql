-- migrate:up

CREATE TYPE whatsapp_outbox_sender_kind_enum AS ENUM (
    'organization_account',
    'ganatri_platform'
);

ALTER TABLE whatsapp_messages
    ALTER COLUMN whatsapp_account_id DROP NOT NULL,
    ALTER COLUMN conversation_id DROP NOT NULL,
    ADD COLUMN recipient_phone_number VARCHAR(20),
    ADD COLUMN platform_sender_key VARCHAR(100),
    ADD CONSTRAINT whatsapp_messages_recipient_phone_check
        CHECK (recipient_phone_number IS NULL OR recipient_phone_number ~ '^[+][1-9][0-9]{7,14}$'),
    ADD CONSTRAINT whatsapp_messages_sender_reference_check
        CHECK (
            whatsapp_account_id IS NOT NULL
            OR platform_sender_key = 'ganatri_utility'
        ),
    ADD CONSTRAINT whatsapp_messages_conversation_or_recipient_check
        CHECK (conversation_id IS NOT NULL OR recipient_phone_number IS NOT NULL),
    ADD CONSTRAINT whatsapp_messages_id_organization_store_key
        UNIQUE (id, organization_id, store_id);

CREATE UNIQUE INDEX whatsapp_messages_platform_idempotency_key
    ON whatsapp_messages (organization_id, platform_sender_key, idempotency_key)
    WHERE platform_sender_key IS NOT NULL;

CREATE UNIQUE INDEX whatsapp_messages_platform_provider_message_key
    ON whatsapp_messages (platform_sender_key, provider_message_id)
    WHERE platform_sender_key IS NOT NULL AND provider_message_id IS NOT NULL;

ALTER TABLE whatsapp_outbox
    ALTER COLUMN whatsapp_account_id DROP NOT NULL,
    ADD COLUMN customer_id UUID,
    ADD COLUMN sender_kind whatsapp_outbox_sender_kind_enum NOT NULL DEFAULT 'organization_account',
    ADD COLUMN platform_sender_key VARCHAR(100),
    ADD COLUMN platform_sender_snapshot JSONB,
    ADD CONSTRAINT whatsapp_outbox_platform_customer_fkey
        FOREIGN KEY (customer_id, organization_id)
        REFERENCES customers(id, organization_id) ON DELETE RESTRICT,
    ADD CONSTRAINT whatsapp_outbox_platform_snapshot_check
        CHECK (platform_sender_snapshot IS NULL OR jsonb_typeof(platform_sender_snapshot) = 'object'),
    ADD CONSTRAINT whatsapp_outbox_sender_reference_check
        CHECK (
            (
                sender_kind = 'organization_account'
                AND whatsapp_account_id IS NOT NULL
                AND platform_sender_key IS NULL
                AND platform_sender_snapshot IS NULL
            )
            OR
            (
                sender_kind = 'ganatri_platform'
                AND whatsapp_account_id IS NULL
                AND platform_sender_key = 'ganatri_utility'
                AND platform_sender_snapshot IS NOT NULL
            )
        ),
    ADD CONSTRAINT whatsapp_outbox_message_scope_key_fkey
        FOREIGN KEY (message_id, organization_id, store_id)
        REFERENCES whatsapp_messages(id, organization_id, store_id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX whatsapp_outbox_platform_invoice_key
    ON whatsapp_outbox (organization_id, store_id, platform_sender_key, sale_id, kind)
    WHERE sender_kind = 'ganatri_platform' AND kind = 'template' AND sale_id IS NOT NULL;

CREATE INDEX idx_whatsapp_outbox_platform_dispatch
    ON whatsapp_outbox (sender_kind, status, next_attempt_at, created_at)
    WHERE sender_kind = 'ganatri_platform';

-- migrate:down

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM whatsapp_outbox
        WHERE sender_kind = 'ganatri_platform'
    ) OR EXISTS (
        SELECT 1
        FROM whatsapp_messages
        WHERE platform_sender_key IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'Cannot roll back platform sender representation while platform records exist';
    END IF;
END;
$$;

DROP INDEX IF EXISTS idx_whatsapp_outbox_platform_dispatch;
DROP INDEX IF EXISTS whatsapp_outbox_platform_invoice_key;
DROP INDEX IF EXISTS whatsapp_messages_platform_provider_message_key;
DROP INDEX IF EXISTS whatsapp_messages_platform_idempotency_key;

ALTER TABLE whatsapp_outbox
    DROP CONSTRAINT IF EXISTS whatsapp_outbox_message_scope_key_fkey,
    DROP CONSTRAINT IF EXISTS whatsapp_outbox_sender_reference_check,
    DROP CONSTRAINT IF EXISTS whatsapp_outbox_platform_snapshot_check,
    DROP CONSTRAINT IF EXISTS whatsapp_outbox_platform_customer_fkey,
    DROP COLUMN IF EXISTS platform_sender_snapshot,
    DROP COLUMN IF EXISTS platform_sender_key,
    DROP COLUMN IF EXISTS sender_kind,
    DROP COLUMN IF EXISTS customer_id;

ALTER TABLE whatsapp_outbox
    ALTER COLUMN whatsapp_account_id SET NOT NULL;

ALTER TABLE whatsapp_messages
    DROP CONSTRAINT IF EXISTS whatsapp_messages_conversation_or_recipient_check,
    DROP CONSTRAINT IF EXISTS whatsapp_messages_sender_reference_check,
    DROP CONSTRAINT IF EXISTS whatsapp_messages_recipient_phone_check,
    DROP CONSTRAINT IF EXISTS whatsapp_messages_id_organization_store_key,
    DROP COLUMN IF EXISTS platform_sender_key,
    DROP COLUMN IF EXISTS recipient_phone_number;

ALTER TABLE whatsapp_messages
    ALTER COLUMN whatsapp_account_id SET NOT NULL,
    ALTER COLUMN conversation_id SET NOT NULL;

DROP TYPE IF EXISTS whatsapp_outbox_sender_kind_enum;
