-- migrate:up

-- The published connection migration already contains these objects. Keep this
-- follow-up migration reconciling so databases with either historical shape can
-- record the migration without failing on duplicate objects.
ALTER TABLE google_contacts_connections
    ADD COLUMN IF NOT EXISTS oauth_attempt_nonce_hash VARCHAR(64);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'google_contacts_connections'::regclass
          AND conname = 'google_contacts_connections_oauth_attempt_nonce_hash_check'
    ) THEN
        ALTER TABLE google_contacts_connections
            ADD CONSTRAINT google_contacts_connections_oauth_attempt_nonce_hash_check
                CHECK (oauth_attempt_nonce_hash IS NULL OR oauth_attempt_nonce_hash ~ '^[0-9a-f]{64}$');
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'google_contacts_connections'::regclass
          AND conname = 'google_contacts_connections_oauth_attempt_status_check'
    ) THEN
        ALTER TABLE google_contacts_connections
            ADD CONSTRAINT google_contacts_connections_oauth_attempt_status_check
                CHECK ((status = 'connecting') = (oauth_attempt_nonce_hash IS NOT NULL));
    END IF;
END
$$;

-- migrate:down

ALTER TABLE google_contacts_connections
    DROP CONSTRAINT IF EXISTS google_contacts_connections_oauth_attempt_status_check;

ALTER TABLE google_contacts_connections
    DROP CONSTRAINT IF EXISTS google_contacts_connections_oauth_attempt_nonce_hash_check;

ALTER TABLE google_contacts_connections
    DROP COLUMN IF EXISTS oauth_attempt_nonce_hash;
