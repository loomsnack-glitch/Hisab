-- migrate:up

ALTER TABLE whatsapp_conversations
    DROP CONSTRAINT IF EXISTS whatsapp_conversations_whatsapp_account_id_external_chat_id_key;

ALTER TABLE whatsapp_conversations
    ADD CONSTRAINT whatsapp_conversations_account_store_chat_key
        UNIQUE (whatsapp_account_id, store_id, external_chat_id);

-- migrate:down

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM whatsapp_conversations
        GROUP BY whatsapp_account_id, external_chat_id
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Cannot restore account-global WhatsApp conversations while Store-scoped duplicates exist';
    END IF;
END;
$$;

ALTER TABLE whatsapp_conversations
    DROP CONSTRAINT IF EXISTS whatsapp_conversations_account_store_chat_key;

ALTER TABLE whatsapp_conversations
    ADD CONSTRAINT whatsapp_conversations_whatsapp_account_id_external_chat_id_key
        UNIQUE (whatsapp_account_id, external_chat_id);
