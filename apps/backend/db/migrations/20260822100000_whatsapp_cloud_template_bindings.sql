-- migrate:up

CREATE TYPE whatsapp_cloud_template_status_enum AS ENUM (
    'approved',
    'rejected',
    'paused',
    'disabled',
    'pending',
    'unknown'
);

CREATE TYPE whatsapp_cloud_template_category_enum AS ENUM (
    'marketing',
    'utility',
    'authentication',
    'unknown'
);

CREATE TABLE whatsapp_cloud_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    whatsapp_business_account_id UUID NOT NULL,
    meta_template_id VARCHAR(255) NOT NULL,
    name VARCHAR(512) NOT NULL,
    language_code VARCHAR(64) NOT NULL,
    category whatsapp_cloud_template_category_enum NOT NULL DEFAULT 'unknown',
    status whatsapp_cloud_template_status_enum NOT NULL DEFAULT 'unknown',
    components JSONB NOT NULL DEFAULT '[]'::jsonb,
    rejection_reason VARCHAR(1000),
    provider_updated_at TIMESTAMP WITH TIME ZONE,
    last_synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (id, organization_id),
    UNIQUE (whatsapp_business_account_id, meta_template_id),
    UNIQUE (whatsapp_business_account_id, name, language_code),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (whatsapp_business_account_id, organization_id)
        REFERENCES whatsapp_business_accounts(id, organization_id) ON DELETE CASCADE,
    CONSTRAINT whatsapp_cloud_templates_components_check
        CHECK (jsonb_typeof(components) = 'array'),
    CONSTRAINT whatsapp_cloud_templates_version_check
        CHECK (version >= 1)
);

CREATE INDEX idx_whatsapp_cloud_templates_waba_status
    ON whatsapp_cloud_templates (organization_id, whatsapp_business_account_id, status, updated_at DESC);

CREATE TABLE whatsapp_cloud_template_bindings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    store_id UUID NOT NULL,
    local_template_id UUID NOT NULL,
    cloud_template_id UUID NOT NULL,
    whatsapp_business_account_id UUID NOT NULL,
    kind whatsapp_message_template_kind_enum NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (id, organization_id),
    UNIQUE (organization_id, store_id, local_template_id, cloud_template_id),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (store_id, organization_id) REFERENCES stores(id, organization_id) ON DELETE CASCADE,
    FOREIGN KEY (cloud_template_id, organization_id)
        REFERENCES whatsapp_cloud_templates(id, organization_id) ON DELETE CASCADE,
    FOREIGN KEY (whatsapp_business_account_id, organization_id)
        REFERENCES whatsapp_business_accounts(id, organization_id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX whatsapp_cloud_template_bindings_one_default_key
    ON whatsapp_cloud_template_bindings (organization_id, store_id, kind)
    WHERE is_default = TRUE AND is_active = TRUE;

CREATE INDEX idx_whatsapp_cloud_template_bindings_store_kind
    ON whatsapp_cloud_template_bindings (organization_id, store_id, kind, is_active, updated_at DESC);

ALTER TABLE whatsapp_outbox
    ADD COLUMN cloud_template_binding_id UUID,
    ADD COLUMN cloud_template_snapshot JSONB,
    ADD CONSTRAINT whatsapp_outbox_cloud_template_binding_fkey
        FOREIGN KEY (cloud_template_binding_id, organization_id)
        REFERENCES whatsapp_cloud_template_bindings(id, organization_id) ON DELETE RESTRICT,
    ADD CONSTRAINT whatsapp_outbox_cloud_template_snapshot_check
        CHECK (cloud_template_snapshot IS NULL OR jsonb_typeof(cloud_template_snapshot) = 'object');

CREATE INDEX idx_whatsapp_outbox_cloud_template_binding
    ON whatsapp_outbox (cloud_template_binding_id)
    WHERE cloud_template_binding_id IS NOT NULL;

-- migrate:down

DROP INDEX IF EXISTS idx_whatsapp_outbox_cloud_template_binding;

ALTER TABLE whatsapp_outbox
    DROP CONSTRAINT IF EXISTS whatsapp_outbox_cloud_template_snapshot_check,
    DROP CONSTRAINT IF EXISTS whatsapp_outbox_cloud_template_binding_fkey,
    DROP COLUMN IF EXISTS cloud_template_snapshot,
    DROP COLUMN IF EXISTS cloud_template_binding_id;

DROP INDEX IF EXISTS idx_whatsapp_cloud_template_bindings_store_kind;
DROP INDEX IF EXISTS whatsapp_cloud_template_bindings_one_default_key;
DROP TABLE IF EXISTS whatsapp_cloud_template_bindings;

DROP INDEX IF EXISTS idx_whatsapp_cloud_templates_waba_status;
DROP TABLE IF EXISTS whatsapp_cloud_templates;

DROP TYPE IF EXISTS whatsapp_cloud_template_category_enum;
DROP TYPE IF EXISTS whatsapp_cloud_template_status_enum;
