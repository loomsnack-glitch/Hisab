-- migrate:up

CREATE TYPE whatsapp_store_policy_mode_enum AS ENUM (
    'disabled',
    'ganatri_utility',
    'organization_cloud'
);

CREATE TABLE whatsapp_store_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    store_id UUID NOT NULL,
    mode whatsapp_store_policy_mode_enum NOT NULL,
    whatsapp_account_id UUID,
    revision INTEGER NOT NULL,
    effective_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    effective_to TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL REFERENCES users(id),
    ended_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (id, organization_id),
    UNIQUE (organization_id, store_id, revision),
    CONSTRAINT whatsapp_store_policies_revision_check CHECK (revision > 0),
    CONSTRAINT whatsapp_store_policies_effective_range_check CHECK (
        effective_to IS NULL OR effective_to >= effective_from
    ),
    CONSTRAINT whatsapp_store_policies_ended_by_check CHECK (
        (effective_to IS NULL AND ended_by IS NULL)
        OR effective_to IS NOT NULL
    ),
    CONSTRAINT whatsapp_store_policies_mode_account_check CHECK (
        (mode = 'organization_cloud' AND whatsapp_account_id IS NOT NULL)
        OR (mode IN ('disabled', 'ganatri_utility') AND whatsapp_account_id IS NULL)
    ),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (store_id, organization_id)
        REFERENCES stores(id, organization_id) ON DELETE CASCADE,
    FOREIGN KEY (whatsapp_account_id, organization_id)
        REFERENCES whatsapp_accounts(id, organization_id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX whatsapp_store_policies_one_current_store_key
    ON whatsapp_store_policies (organization_id, store_id)
    WHERE effective_to IS NULL;

CREATE INDEX idx_whatsapp_store_policies_history
    ON whatsapp_store_policies (organization_id, store_id, effective_from DESC);

INSERT INTO whatsapp_store_policies (
    organization_id,
    store_id,
    mode,
    revision,
    created_by
)
SELECT
    organization_id,
    id,
    'disabled',
    1,
    created_by
FROM stores
ON CONFLICT (organization_id, store_id, revision) DO NOTHING;

COMMENT ON TABLE whatsapp_store_policies IS
    'History-aware Store WhatsApp policy. The open row is the current policy; transitions close it and create the next revision.';

COMMENT ON COLUMN whatsapp_store_policies.whatsapp_account_id IS
    'Organization-owned Cloud account for organization_cloud mode; null for disabled and Ganatri Utility modes.';

-- migrate:down

DROP INDEX IF EXISTS idx_whatsapp_store_policies_history;
DROP INDEX IF EXISTS whatsapp_store_policies_one_current_store_key;
DROP TABLE IF EXISTS whatsapp_store_policies;
DROP TYPE IF EXISTS whatsapp_store_policy_mode_enum;
