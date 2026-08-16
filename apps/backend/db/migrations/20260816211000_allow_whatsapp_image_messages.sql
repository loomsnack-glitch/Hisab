-- migrate:up

ALTER TABLE whatsapp_messages DROP CONSTRAINT IF EXISTS whatsapp_messages_content_check;
ALTER TABLE whatsapp_messages ADD CONSTRAINT whatsapp_messages_content_check CHECK (
    (message_type = 'text' AND body IS NOT NULL AND LENGTH(BTRIM(body)) > 0)
    OR (message_type IN ('document', 'image') AND attachment_storage_key IS NOT NULL)
);

-- migrate:down

ALTER TABLE whatsapp_messages DROP CONSTRAINT IF EXISTS whatsapp_messages_content_check;
ALTER TABLE whatsapp_messages ADD CONSTRAINT whatsapp_messages_content_check CHECK (
    (message_type = 'text' AND body IS NOT NULL AND LENGTH(BTRIM(body)) > 0)
    OR (message_type = 'document' AND attachment_storage_key IS NOT NULL)
);
