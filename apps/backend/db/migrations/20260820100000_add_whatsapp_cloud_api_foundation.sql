-- migrate:up

-- Cloud API state is additive while existing Baileys accounts are still being
-- migrated. The old provider/status columns remain readable until cutover.
CREATE TYPE whatsapp_cloud_account_status_enum AS ENUM (
    'pending_authorization',
    'provisioning',
    'connected',
    'needs_action',
    'disconnected',
    'revoked',
    'suspended',
    'failed'
);

CREATE TYPE whatsapp_cloud_provisioning_status_enum AS ENUM (
    'running',
    'completed',
    'failed',
    'cancelled'
);

CREATE TYPE whatsapp_cloud_provisioning_step_enum AS ENUM (
    'authorization_received',
    'waba_resolved',
    'system_user_assigned',
    'phone_registered',
    'webhook_subscribed',
    'templates_synced',
    'completed'
);

CREATE TABLE whatsapp_business_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    waba_id VARCHAR(64),
    display_name VARCHAR(255),
    credential_reference VARCHAR(255),
    credential_key_version VARCHAR(64),
    status whatsapp_cloud_account_status_enum NOT NULL DEFAULT 'pending_authorization',
    last_error_code VARCHAR(100),
    last_error_message TEXT,
    last_webhook_at TIMESTAMP WITH TIME ZONE,
    last_graph_api_at TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (id, organization_id),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT whatsapp_business_accounts_waba_id_check
        CHECK (waba_id IS NULL OR LENGTH(BTRIM(waba_id)) BETWEEN 1 AND 64),
    CONSTRAINT whatsapp_business_accounts_credential_reference_check
        CHECK (credential_reference IS NULL OR LENGTH(BTRIM(credential_reference)) BETWEEN 1 AND 255)
);

CREATE UNIQUE INDEX whatsapp_business_accounts_waba_id_key
    ON whatsapp_business_accounts (waba_id)
    WHERE waba_id IS NOT NULL;

CREATE INDEX idx_whatsapp_business_accounts_organization_status
    ON whatsapp_business_accounts (organization_id, status, updated_at DESC);

ALTER TABLE whatsapp_accounts
    ADD COLUMN whatsapp_business_account_id UUID,
    ADD COLUMN cloud_phone_number_id VARCHAR(64),
    ADD COLUMN cloud_verified_name VARCHAR(255),
    ADD COLUMN cloud_quality_rating VARCHAR(32),
    ADD COLUMN cloud_messaging_limit INTEGER,
    ADD COLUMN cloud_limit_synced_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN cloud_status whatsapp_cloud_account_status_enum,
    ADD COLUMN cloud_last_error_code VARCHAR(100),
    ADD COLUMN cloud_last_error_message TEXT,
    ADD COLUMN cloud_last_webhook_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN cloud_last_graph_api_at TIMESTAMP WITH TIME ZONE,
    ADD CONSTRAINT whatsapp_accounts_cloud_business_account_fkey
        FOREIGN KEY (whatsapp_business_account_id, organization_id)
        REFERENCES whatsapp_business_accounts(id, organization_id) ON DELETE RESTRICT,
    ADD CONSTRAINT whatsapp_accounts_cloud_phone_number_id_check
        CHECK (cloud_phone_number_id IS NULL OR LENGTH(BTRIM(cloud_phone_number_id)) BETWEEN 1 AND 64),
    ADD CONSTRAINT whatsapp_accounts_cloud_messaging_limit_check
        CHECK (cloud_messaging_limit IS NULL OR cloud_messaging_limit >= 0),
    ADD CONSTRAINT whatsapp_accounts_cloud_fields_provider_check
        CHECK (
            (cloud_status IS NULL AND cloud_phone_number_id IS NULL AND whatsapp_business_account_id IS NULL)
            OR provider = 'cloud_api'
        );

CREATE UNIQUE INDEX whatsapp_accounts_cloud_phone_number_id_key
    ON whatsapp_accounts (cloud_phone_number_id)
    WHERE cloud_phone_number_id IS NOT NULL;

CREATE INDEX idx_whatsapp_accounts_cloud_status
    ON whatsapp_accounts (organization_id, cloud_status, cloud_limit_synced_at);

CREATE TABLE whatsapp_cloud_provisioning_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    whatsapp_account_id UUID NOT NULL,
    whatsapp_business_account_id UUID,
    idempotency_key VARCHAR(255) NOT NULL,
    status whatsapp_cloud_provisioning_status_enum NOT NULL DEFAULT 'running',
    current_step whatsapp_cloud_provisioning_step_enum NOT NULL DEFAULT 'authorization_received',
    completed_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    provider_code VARCHAR(100),
    safe_error_code VARCHAR(100),
    safe_error_message TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, idempotency_key),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (whatsapp_account_id, organization_id)
        REFERENCES whatsapp_accounts(id, organization_id) ON DELETE CASCADE,
    FOREIGN KEY (whatsapp_business_account_id, organization_id)
        REFERENCES whatsapp_business_accounts(id, organization_id) ON DELETE RESTRICT,
    CONSTRAINT whatsapp_cloud_provisioning_attempts_completed_steps_check
        CHECK (jsonb_typeof(completed_steps) = 'array'),
    CONSTRAINT whatsapp_cloud_provisioning_attempts_idempotency_key_check
        CHECK (LENGTH(BTRIM(idempotency_key)) BETWEEN 1 AND 255)
);

CREATE INDEX idx_whatsapp_cloud_provisioning_attempts_active
    ON whatsapp_cloud_provisioning_attempts (organization_id, status, updated_at DESC);

-- A provider submission may have succeeded even when the HTTP request timed
-- out. It must not be retried as ordinary pending work until reconciled.
ALTER TYPE whatsapp_outbox_status_enum ADD VALUE IF NOT EXISTS 'reconciling';

-- migrate:down

DROP INDEX IF EXISTS idx_whatsapp_cloud_provisioning_attempts_active;
DROP TABLE IF EXISTS whatsapp_cloud_provisioning_attempts;

DROP INDEX IF EXISTS idx_whatsapp_accounts_cloud_status;
DROP INDEX IF EXISTS whatsapp_accounts_cloud_phone_number_id_key;

ALTER TABLE whatsapp_accounts
    DROP CONSTRAINT IF EXISTS whatsapp_accounts_cloud_fields_provider_check,
    DROP CONSTRAINT IF EXISTS whatsapp_accounts_cloud_messaging_limit_check,
    DROP CONSTRAINT IF EXISTS whatsapp_accounts_cloud_phone_number_id_check,
    DROP CONSTRAINT IF EXISTS whatsapp_accounts_cloud_business_account_fkey,
    DROP COLUMN IF EXISTS cloud_last_graph_api_at,
    DROP COLUMN IF EXISTS cloud_last_webhook_at,
    DROP COLUMN IF EXISTS cloud_last_error_message,
    DROP COLUMN IF EXISTS cloud_last_error_code,
    DROP COLUMN IF EXISTS cloud_status,
    DROP COLUMN IF EXISTS cloud_limit_synced_at,
    DROP COLUMN IF EXISTS cloud_messaging_limit,
    DROP COLUMN IF EXISTS cloud_quality_rating,
    DROP COLUMN IF EXISTS cloud_verified_name,
    DROP COLUMN IF EXISTS cloud_phone_number_id,
    DROP COLUMN IF EXISTS whatsapp_business_account_id;

DROP INDEX IF EXISTS idx_whatsapp_business_accounts_organization_status;
DROP INDEX IF EXISTS whatsapp_business_accounts_waba_id_key;
DROP TABLE IF EXISTS whatsapp_business_accounts;

DROP TYPE IF EXISTS whatsapp_cloud_provisioning_step_enum;
DROP TYPE IF EXISTS whatsapp_cloud_provisioning_status_enum;
DROP TYPE IF EXISTS whatsapp_cloud_account_status_enum;

-- PostgreSQL enum values cannot be removed safely in-place. The additive
-- `reconciling` value is intentionally retained on rollback.
