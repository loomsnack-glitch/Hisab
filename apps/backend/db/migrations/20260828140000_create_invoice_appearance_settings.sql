-- migrate:up

CREATE TABLE organization_invoice_appearance_settings (
    organization_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    published_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    draft_settings JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

CREATE TABLE store_invoice_appearance_settings (
    organization_id UUID NOT NULL,
    store_id UUID NOT NULL,
    uses_organization_default BOOLEAN NOT NULL DEFAULT TRUE,
    published_settings JSONB,
    draft_settings JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    PRIMARY KEY (organization_id, store_id),
    FOREIGN KEY (store_id, organization_id) REFERENCES stores(id, organization_id) ON DELETE CASCADE
);

INSERT INTO organization_invoice_appearance_settings (organization_id)
SELECT id FROM organizations;

-- migrate:down

DROP TABLE IF EXISTS store_invoice_appearance_settings;
DROP TABLE IF EXISTS organization_invoice_appearance_settings;
