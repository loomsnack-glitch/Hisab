-- migrate:up

ALTER TYPE whatsapp_message_type_enum ADD VALUE IF NOT EXISTS 'template';
ALTER TYPE whatsapp_outbox_kind_enum ADD VALUE IF NOT EXISTS 'template';

-- migrate:down

-- PostgreSQL enum values cannot be removed safely in a reversible migration.
