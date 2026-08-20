-- migrate:up

-- A signed Embedded Signup state is short-lived, but its nonce must still be
-- consumed atomically across API instances. Store only the nonce hash so a
-- database read cannot reproduce a usable browser state token.
CREATE TABLE whatsapp_cloud_onboarding_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nonce_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    consumed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (nonce_hash),
    CONSTRAINT whatsapp_cloud_onboarding_states_nonce_hash_check
        CHECK (nonce_hash ~ '^[0-9a-f]{64}$'),
    CONSTRAINT whatsapp_cloud_onboarding_states_expiry_check
        CHECK (expires_at > created_at),
    CONSTRAINT whatsapp_cloud_onboarding_states_consumed_at_check
        CHECK (consumed_at IS NULL OR consumed_at >= created_at)
);

CREATE INDEX idx_whatsapp_cloud_onboarding_states_active
    ON whatsapp_cloud_onboarding_states (organization_id, user_id, expires_at)
    WHERE consumed_at IS NULL;

-- migrate:down

DROP TABLE whatsapp_cloud_onboarding_states;
