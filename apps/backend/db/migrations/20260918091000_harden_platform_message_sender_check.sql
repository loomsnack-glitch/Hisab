-- migrate:up

ALTER TABLE whatsapp_messages
    DROP CONSTRAINT IF EXISTS whatsapp_messages_sender_reference_check,
    ADD CONSTRAINT whatsapp_messages_sender_reference_check
        CHECK (
            (
                whatsapp_account_id IS NOT NULL
                AND platform_sender_key IS NULL
            )
            OR
            (
                whatsapp_account_id IS NULL
                AND platform_sender_key = 'ganatri_utility'
            )
        );

-- migrate:down

ALTER TABLE whatsapp_messages
    DROP CONSTRAINT IF EXISTS whatsapp_messages_sender_reference_check,
    ADD CONSTRAINT whatsapp_messages_sender_reference_check
        CHECK (
            whatsapp_account_id IS NOT NULL
            OR platform_sender_key = 'ganatri_utility'
        );
