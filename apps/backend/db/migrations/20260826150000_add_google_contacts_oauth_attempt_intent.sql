-- migrate:up

-- Replacement OAuth must be cancellable back to a still-authorized connection.
-- Persist the attempt intent with the connecting nonce so a cancelled replace
-- cannot be mistaken for reconnect-required.
ALTER TABLE google_contacts_connections
    ADD COLUMN IF NOT EXISTS oauth_attempt_intent VARCHAR(32);

UPDATE google_contacts_connections
SET oauth_attempt_intent = 'connect'
WHERE status = 'connecting'
  AND oauth_attempt_intent IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'google_contacts_connections'::regclass
          AND conname = 'google_contacts_connections_oauth_attempt_intent_check'
    ) THEN
        ALTER TABLE google_contacts_connections
            ADD CONSTRAINT google_contacts_connections_oauth_attempt_intent_check
                CHECK (
                    oauth_attempt_intent IS NULL
                    OR oauth_attempt_intent IN ('connect', 'reconnect', 'replace')
                );
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'google_contacts_connections'::regclass
          AND conname = 'google_contacts_connections_oauth_attempt_intent_status_check'
    ) THEN
        ALTER TABLE google_contacts_connections
            ADD CONSTRAINT google_contacts_connections_oauth_attempt_intent_status_check
                CHECK ((status = 'connecting') = (oauth_attempt_intent IS NOT NULL));
    END IF;
END
$$;

-- migrate:down

ALTER TABLE google_contacts_connections
    DROP CONSTRAINT IF EXISTS google_contacts_connections_oauth_attempt_intent_status_check;

ALTER TABLE google_contacts_connections
    DROP CONSTRAINT IF EXISTS google_contacts_connections_oauth_attempt_intent_check;

ALTER TABLE google_contacts_connections
    DROP COLUMN IF EXISTS oauth_attempt_intent;
