-- migrate:up

ALTER TABLE google_contacts_connections
    ADD COLUMN IF NOT EXISTS contact_name_prefix VARCHAR(32) NOT NULL DEFAULT '';

ALTER TABLE google_contacts_connections
    ADD COLUMN IF NOT EXISTS contact_name_postfix VARCHAR(32) NOT NULL DEFAULT '';

-- migrate:down

ALTER TABLE google_contacts_connections
    DROP COLUMN IF EXISTS contact_name_postfix;

ALTER TABLE google_contacts_connections
    DROP COLUMN IF EXISTS contact_name_prefix;
