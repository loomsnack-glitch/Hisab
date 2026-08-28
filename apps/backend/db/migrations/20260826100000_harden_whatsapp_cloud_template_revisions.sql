-- migrate:up

ALTER TYPE whatsapp_cloud_template_submission_status_enum ADD VALUE IF NOT EXISTS 'archived';

ALTER TABLE whatsapp_cloud_template_bindings
    ADD COLUMN language_code VARCHAR(64),
    ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN archived_by UUID REFERENCES users(id);

UPDATE whatsapp_cloud_template_bindings bindings
SET language_code = assets.language_code
FROM whatsapp_cloud_templates assets
WHERE assets.id = bindings.cloud_template_id
  AND assets.organization_id = bindings.organization_id
  AND bindings.language_code IS NULL;

ALTER TABLE whatsapp_cloud_template_bindings
    ALTER COLUMN language_code SET DEFAULT 'en_US',
    ALTER COLUMN language_code SET NOT NULL,
    ADD CONSTRAINT whatsapp_cloud_template_bindings_language_check
        CHECK (LENGTH(BTRIM(language_code)) BETWEEN 1 AND 64);

DROP INDEX IF EXISTS whatsapp_cloud_template_bindings_one_default_key;

CREATE UNIQUE INDEX whatsapp_cloud_template_bindings_one_default_key
    ON whatsapp_cloud_template_bindings (
        organization_id,
        store_id,
        whatsapp_business_account_id,
        kind,
        language_code
    )
    WHERE is_default = TRUE AND is_active = TRUE;

CREATE INDEX idx_whatsapp_cloud_template_bindings_revision_scope
    ON whatsapp_cloud_template_bindings (
        organization_id,
        store_id,
        whatsapp_business_account_id,
        kind,
        language_code,
        is_active,
        updated_at DESC
    );

CREATE TABLE whatsapp_cloud_template_audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    whatsapp_business_account_id UUID NOT NULL,
    store_id UUID,
    binding_id UUID,
    submission_id UUID,
    event_type VARCHAR(64) NOT NULL,
    actor_id UUID REFERENCES users(id),
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (whatsapp_business_account_id, organization_id)
        REFERENCES whatsapp_business_accounts(id, organization_id) ON DELETE CASCADE,
    FOREIGN KEY (store_id, organization_id)
        REFERENCES stores(id, organization_id) ON DELETE CASCADE,
    FOREIGN KEY (binding_id, organization_id)
        REFERENCES whatsapp_cloud_template_bindings(id, organization_id) ON DELETE CASCADE,
    FOREIGN KEY (submission_id, organization_id)
        REFERENCES whatsapp_cloud_template_submissions(id, organization_id) ON DELETE CASCADE,
    CONSTRAINT whatsapp_cloud_template_audit_events_details_check
        CHECK (jsonb_typeof(details) = 'object')
);

CREATE INDEX idx_whatsapp_cloud_template_audit_events_scope
    ON whatsapp_cloud_template_audit_events (
        organization_id,
        whatsapp_business_account_id,
        created_at DESC
    );

-- migrate:down

DROP INDEX IF EXISTS idx_whatsapp_cloud_template_audit_events_scope;
DROP TABLE IF EXISTS whatsapp_cloud_template_audit_events;
DROP INDEX IF EXISTS idx_whatsapp_cloud_template_bindings_revision_scope;
DROP INDEX IF EXISTS whatsapp_cloud_template_bindings_one_default_key;
CREATE UNIQUE INDEX whatsapp_cloud_template_bindings_one_default_key
    ON whatsapp_cloud_template_bindings (organization_id, store_id, kind)
    WHERE is_default = TRUE AND is_active = TRUE;
ALTER TABLE whatsapp_cloud_template_bindings
    DROP CONSTRAINT IF EXISTS whatsapp_cloud_template_bindings_language_check,
    DROP COLUMN IF EXISTS archived_by,
    DROP COLUMN IF EXISTS archived_at,
    DROP COLUMN IF EXISTS language_code;
