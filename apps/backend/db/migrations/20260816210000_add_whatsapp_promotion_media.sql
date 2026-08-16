-- migrate:up

ALTER TYPE whatsapp_message_type_enum ADD VALUE IF NOT EXISTS 'image';
ALTER TYPE whatsapp_outbox_kind_enum ADD VALUE IF NOT EXISTS 'promotion';

-- migrate:down

-- Enum values are intentionally retained because PostgreSQL cannot remove them
-- safely in-place. The application no longer creates promotion rows after the
-- campaign migration is rolled back.
