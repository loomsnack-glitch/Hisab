-- migrate:up

ALTER TABLE whatsapp_messages
    DROP CONSTRAINT IF EXISTS whatsapp_messages_content_check,
    ADD CONSTRAINT whatsapp_messages_content_check CHECK (
        (message_type = 'text' AND body IS NOT NULL AND LENGTH(BTRIM(body)) > 0)
        OR (message_type = 'document' AND attachment_storage_key IS NOT NULL)
        OR (message_type = 'template' AND body IS NULL AND attachment_storage_key IS NULL)
    );

-- migrate:down

ALTER TABLE whatsapp_messages
    DROP CONSTRAINT IF EXISTS whatsapp_messages_content_check,
    ADD CONSTRAINT whatsapp_messages_content_check CHECK (
        (message_type = 'text' AND body IS NOT NULL AND LENGTH(BTRIM(body)) > 0)
        OR (message_type = 'document' AND attachment_storage_key IS NOT NULL)
    );
