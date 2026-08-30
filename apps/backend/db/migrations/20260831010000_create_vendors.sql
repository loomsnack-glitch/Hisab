-- migrate:up

CREATE TYPE vendor_status_enum AS ENUM ('active', 'inactive');

CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(1000),
    status vendor_status_enum NOT NULL DEFAULT 'active',
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE (id, organization_id)
);

CREATE INDEX idx_vendors_organization_id ON vendors (organization_id);
CREATE INDEX idx_vendors_organization_status ON vendors (organization_id, status);

-- migrate:down

DROP TABLE IF EXISTS vendors;
DROP TYPE IF EXISTS vendor_status_enum;
