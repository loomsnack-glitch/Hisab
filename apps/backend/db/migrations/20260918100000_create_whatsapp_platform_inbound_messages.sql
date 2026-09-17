-- migrate:up

CREATE TABLE whatsapp_platform_inbound_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_key VARCHAR(100) NOT NULL DEFAULT 'ganatri_utility',
    waba_id VARCHAR(64) NOT NULL,
    phone_number_id VARCHAR(64) NOT NULL,
    provider_message_id VARCHAR(255) NOT NULL,
    contact_phone_number VARCHAR(20) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    message_type VARCHAR(32) NOT NULL DEFAULT 'text',
    body TEXT NOT NULL,
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT whatsapp_platform_inbound_sender_key_check
        CHECK (sender_key = 'ganatri_utility'),
    CONSTRAINT whatsapp_platform_inbound_waba_id_check
        CHECK (waba_id ~ '^[0-9]{6,32}$'),
    CONSTRAINT whatsapp_platform_inbound_phone_id_check
        CHECK (phone_number_id ~ '^[0-9]{6,32}$'),
    CONSTRAINT whatsapp_platform_inbound_phone_check
        CHECK (contact_phone_number ~ '^[+][1-9][0-9]{7,14}$'),
    CONSTRAINT whatsapp_platform_inbound_type_check
        CHECK (message_type = 'text'),
    CONSTRAINT whatsapp_platform_inbound_body_check
        CHECK (LENGTH(BTRIM(body)) > 0 AND LENGTH(body) <= 4096),
    UNIQUE (sender_key, provider_message_id)
);

CREATE INDEX idx_whatsapp_platform_inbound_created
    ON whatsapp_platform_inbound_messages (created_at DESC);

CREATE INDEX idx_whatsapp_platform_inbound_contact
    ON whatsapp_platform_inbound_messages (contact_phone_number, occurred_at DESC);

COMMENT ON TABLE whatsapp_platform_inbound_messages IS
    'Internal-only inbound replies to the Ganatri platform sender; never exposed as Organization conversations.';

-- migrate:down

DROP INDEX IF EXISTS idx_whatsapp_platform_inbound_contact;
DROP INDEX IF EXISTS idx_whatsapp_platform_inbound_created;
DROP TABLE IF EXISTS whatsapp_platform_inbound_messages;
