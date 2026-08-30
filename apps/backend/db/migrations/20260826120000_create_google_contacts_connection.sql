-- migrate:up

-- Short-lived Google OAuth state is signed in process, but its nonce must still
-- be consumed atomically across API instances. Store only the nonce hash so a
-- database read cannot reproduce a usable browser state token.
CREATE TABLE google_contacts_oauth_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nonce_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    consumed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (nonce_hash),
    CONSTRAINT google_contacts_oauth_states_nonce_hash_check
        CHECK (nonce_hash ~ '^[0-9a-f]{64}$'),
    CONSTRAINT google_contacts_oauth_states_expiry_check
        CHECK (expires_at > created_at),
    CONSTRAINT google_contacts_oauth_states_consumed_at_check
        CHECK (consumed_at IS NULL OR consumed_at >= created_at)
);

CREATE INDEX idx_google_contacts_oauth_states_active
    ON google_contacts_oauth_states (organization_id, user_id, expires_at)
    WHERE consumed_at IS NULL;

CREATE TABLE google_contacts_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    owner_key VARCHAR(255) NOT NULL,
    encrypted_payload TEXT NOT NULL,
    key_version VARCHAR(64) NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT google_contacts_credentials_owner_key_check
        CHECK (LENGTH(BTRIM(owner_key)) BETWEEN 1 AND 255),
    CONSTRAINT google_contacts_credentials_encrypted_payload_check
        CHECK (LENGTH(BTRIM(encrypted_payload)) > 0),
    CONSTRAINT google_contacts_credentials_key_version_check
        CHECK (LENGTH(BTRIM(key_version)) BETWEEN 1 AND 64)
);

CREATE INDEX idx_google_contacts_credentials_organization_owner
    ON google_contacts_credentials (organization_id, owner_key, created_at DESC);

CREATE INDEX idx_google_contacts_credentials_active
    ON google_contacts_credentials (organization_id, updated_at DESC)
    WHERE revoked_at IS NULL;

CREATE TABLE google_contacts_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
    status VARCHAR(32) NOT NULL,
    google_account_email VARCHAR(320),
    google_account_subject VARCHAR(255),
    credential_reference VARCHAR(255),
    credential_key_version VARCHAR(64),
    oauth_attempt_nonce_hash VARCHAR(64),
    connected_at TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT google_contacts_connections_status_check
        CHECK (status IN ('connecting', 'connected', 'reconnect_required')),
    CONSTRAINT google_contacts_connections_email_check
        CHECK (google_account_email IS NULL OR LENGTH(BTRIM(google_account_email)) BETWEEN 3 AND 320),
    CONSTRAINT google_contacts_connections_oauth_attempt_nonce_hash_check
        CHECK (oauth_attempt_nonce_hash IS NULL OR oauth_attempt_nonce_hash ~ '^[0-9a-f]{64}$'),
    CONSTRAINT google_contacts_connections_oauth_attempt_status_check
        CHECK ((status = 'connecting') = (oauth_attempt_nonce_hash IS NOT NULL)),
    CONSTRAINT google_contacts_connections_connected_credentials_check
        CHECK (
            status <> 'connected'
            OR (
                google_account_email IS NOT NULL
                AND google_account_subject IS NOT NULL
                AND credential_reference IS NOT NULL
                AND credential_key_version IS NOT NULL
                AND connected_at IS NOT NULL
            )
        )
);

-- migrate:down

DROP TABLE IF EXISTS google_contacts_connections;
DROP TABLE IF EXISTS google_contacts_credentials;
DROP TABLE IF EXISTS google_contacts_oauth_states;
