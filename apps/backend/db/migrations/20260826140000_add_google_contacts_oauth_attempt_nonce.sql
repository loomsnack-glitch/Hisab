-- migrate:up

-- Ticket 01's applied connection table predates the persisted OAuth attempt nonce.
-- Connecting work must be bound to that hash so a stale callback cannot complete.
ALTER TABLE google_contacts_connections
    ADD COLUMN oauth_attempt_nonce_hash VARCHAR(64);

ALTER TABLE google_contacts_connections
    ADD CONSTRAINT google_contacts_connections_oauth_attempt_nonce_hash_check
        CHECK (oauth_attempt_nonce_hash IS NULL OR oauth_attempt_nonce_hash ~ '^[0-9a-f]{64}$');

ALTER TABLE google_contacts_connections
    ADD CONSTRAINT google_contacts_connections_oauth_attempt_status_check
        CHECK ((status = 'connecting') = (oauth_attempt_nonce_hash IS NOT NULL));

-- migrate:down

ALTER TABLE google_contacts_connections
    DROP CONSTRAINT IF EXISTS google_contacts_connections_oauth_attempt_status_check;

ALTER TABLE google_contacts_connections
    DROP CONSTRAINT IF EXISTS google_contacts_connections_oauth_attempt_nonce_hash_check;

ALTER TABLE google_contacts_connections
    DROP COLUMN IF EXISTS oauth_attempt_nonce_hash;
