-- migrate:up

ALTER TYPE whatsapp_outbox_kind_enum ADD VALUE IF NOT EXISTS 'conversation_reply';

-- migrate:down

-- PostgreSQL enum values cannot be removed safely in a reversible migration.
