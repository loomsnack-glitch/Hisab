-- migrate:up

CREATE TYPE whatsapp_cloud_template_submission_status_enum AS ENUM (
    'draft',
    'submitting',
    'pending',
    'approved',
    'rejected',
    'paused',
    'disabled',
    'failed'
);

-- The local template table has a UUID primary key, but submission ownership
-- must remain tenant-scoped at the foreign-key boundary as well.
ALTER TABLE whatsapp_message_templates
    ADD CONSTRAINT whatsapp_message_templates_id_organization_key
    UNIQUE (id, organization_id);

CREATE TABLE whatsapp_cloud_template_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    whatsapp_business_account_id UUID NOT NULL,
    originating_store_id UUID,
    local_template_id UUID,
    kind whatsapp_message_template_kind_enum NOT NULL,
    friendly_name VARCHAR(120) NOT NULL,
    meta_template_name VARCHAR(512) NOT NULL,
    language_code VARCHAR(64) NOT NULL,
    category whatsapp_cloud_template_category_enum NOT NULL,
    requested_components JSONB NOT NULL DEFAULT '[]'::jsonb,
    sample_values JSONB NOT NULL DEFAULT '{}'::jsonb,
    idempotency_key VARCHAR(255) NOT NULL,
    meta_template_id VARCHAR(255),
    status whatsapp_cloud_template_submission_status_enum NOT NULL DEFAULT 'draft',
    rejection_reason VARCHAR(1000),
    last_error_code VARCHAR(100),
    last_error_message VARCHAR(1000),
    submitted_at TIMESTAMP WITH TIME ZONE,
    provider_updated_at TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (id, organization_id),
    UNIQUE (organization_id, whatsapp_business_account_id, idempotency_key),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (whatsapp_business_account_id, organization_id)
        REFERENCES whatsapp_business_accounts(id, organization_id) ON DELETE CASCADE,
    FOREIGN KEY (originating_store_id, organization_id)
        REFERENCES stores(id, organization_id) ON DELETE SET NULL,
    FOREIGN KEY (local_template_id, organization_id)
        REFERENCES whatsapp_message_templates(id, organization_id) ON DELETE SET NULL,
    CONSTRAINT whatsapp_cloud_template_submissions_components_check
        CHECK (jsonb_typeof(requested_components) = 'array'),
    CONSTRAINT whatsapp_cloud_template_submissions_samples_check
        CHECK (jsonb_typeof(sample_values) = 'object'),
    CONSTRAINT whatsapp_cloud_template_submissions_name_check
        CHECK (LENGTH(BTRIM(friendly_name)) BETWEEN 1 AND 120),
    CONSTRAINT whatsapp_cloud_template_submissions_meta_name_check
        CHECK (meta_template_name ~ '^[a-z0-9_]{1,512}$'),
    CONSTRAINT whatsapp_cloud_template_submissions_language_check
        CHECK (language_code ~ '^[A-Za-z]{2,10}([_-][A-Za-z0-9]{2,10})*$')
);

CREATE UNIQUE INDEX whatsapp_cloud_template_submissions_active_name_key
    ON whatsapp_cloud_template_submissions (
        organization_id,
        whatsapp_business_account_id,
        meta_template_name,
        language_code
    )
    WHERE status IN ('draft', 'submitting', 'pending');

CREATE UNIQUE INDEX whatsapp_cloud_template_submissions_provider_id_key
    ON whatsapp_cloud_template_submissions (whatsapp_business_account_id, meta_template_id)
    WHERE meta_template_id IS NOT NULL;

CREATE INDEX idx_whatsapp_cloud_template_submissions_account_status
    ON whatsapp_cloud_template_submissions (
        organization_id,
        whatsapp_business_account_id,
        status,
        updated_at DESC
    );

CREATE INDEX idx_whatsapp_cloud_template_submissions_store_kind
    ON whatsapp_cloud_template_submissions (
        organization_id,
        originating_store_id,
        kind,
        status,
        updated_at DESC
    );

-- migrate:down

DROP INDEX IF EXISTS idx_whatsapp_cloud_template_submissions_store_kind;
DROP INDEX IF EXISTS idx_whatsapp_cloud_template_submissions_account_status;
DROP INDEX IF EXISTS whatsapp_cloud_template_submissions_provider_id_key;
DROP INDEX IF EXISTS whatsapp_cloud_template_submissions_active_name_key;
DROP TABLE IF EXISTS whatsapp_cloud_template_submissions;
DROP TYPE IF EXISTS whatsapp_cloud_template_submission_status_enum;

ALTER TABLE whatsapp_message_templates
    DROP CONSTRAINT IF EXISTS whatsapp_message_templates_id_organization_key;
