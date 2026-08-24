-- migrate:up

ALTER TABLE whatsapp_messages
    ADD COLUMN cloud_status_at TIMESTAMP WITH TIME ZONE;

-- migrate:down

ALTER TABLE whatsapp_messages
    DROP COLUMN IF EXISTS cloud_status_at;
