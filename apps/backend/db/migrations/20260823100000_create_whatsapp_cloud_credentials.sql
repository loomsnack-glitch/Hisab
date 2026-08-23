-- migrate:up

CREATE TABLE whatsapp_cloud_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    owner_key VARCHAR(255) NOT NULL,
    encrypted_token TEXT NOT NULL,
    key_version VARCHAR(64) NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT whatsapp_cloud_credentials_owner_key_check
        CHECK (LENGTH(BTRIM(owner_key)) BETWEEN 1 AND 255),
    CONSTRAINT whatsapp_cloud_credentials_encrypted_token_check
        CHECK (LENGTH(BTRIM(encrypted_token)) > 0),
    CONSTRAINT whatsapp_cloud_credentials_key_version_check
        CHECK (LENGTH(BTRIM(key_version)) BETWEEN 1 AND 64),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX idx_whatsapp_cloud_credentials_organization_owner
    ON whatsapp_cloud_credentials (organization_id, owner_key, created_at DESC);

CREATE INDEX idx_whatsapp_cloud_credentials_active
    ON whatsapp_cloud_credentials (organization_id, updated_at DESC)
    WHERE revoked_at IS NULL;

-- migrate:down

DROP TABLE IF EXISTS whatsapp_cloud_credentials;
