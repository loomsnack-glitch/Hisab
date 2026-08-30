-- migrate:up

CREATE TYPE vendor_item_status_enum AS ENUM ('active', 'inactive');

CREATE TABLE vendor_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    unit_id UUID NOT NULL,
    default_purchase_price NUMERIC(10, 2) NOT NULL,
    status vendor_item_status_enum NOT NULL DEFAULT 'active',
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE (id, organization_id),
    CONSTRAINT vendor_items_price_non_negative CHECK (default_purchase_price >= 0),
    FOREIGN KEY (vendor_id, organization_id) REFERENCES vendors (id, organization_id) ON DELETE CASCADE,
    FOREIGN KEY (unit_id, organization_id) REFERENCES units (id, organization_id)
);

CREATE INDEX idx_vendor_items_organization_id ON vendor_items (organization_id);
CREATE INDEX idx_vendor_items_organization_vendor ON vendor_items (organization_id, vendor_id);
CREATE INDEX idx_vendor_items_organization_status ON vendor_items (organization_id, status);

-- migrate:down

DROP TABLE IF EXISTS vendor_items;
DROP TYPE IF EXISTS vendor_item_status_enum;
