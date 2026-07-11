-- migrate:up

CREATE TYPE add_on_status_enum AS ENUM ('active', 'inactive');

CREATE TYPE product_add_on_attachment_status_enum AS ENUM ('active', 'inactive');

-- Flat organization-level Add-On catalog
CREATE TABLE add_ons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    discount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    status add_on_status_enum NOT NULL DEFAULT 'active',
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE (organization_id, name),
    UNIQUE (id, organization_id),
    CONSTRAINT add_ons_price_check CHECK (price >= 0),
    CONSTRAINT add_ons_discount_check CHECK (discount >= 0)
);

-- Per-product Add-On eligibility + selection cap (price stays on add_ons)
CREATE TABLE product_add_on_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    product_id UUID NOT NULL,
    add_on_id UUID NOT NULL,
    selection_cap INTEGER NOT NULL DEFAULT 1,
    status product_add_on_attachment_status_enum NOT NULL DEFAULT 'active',
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE (product_id, add_on_id),
    UNIQUE (id, organization_id),
    CONSTRAINT product_add_on_attachments_selection_cap_check CHECK (selection_cap >= 1),
    FOREIGN KEY (product_id, organization_id) REFERENCES products(id, organization_id) ON DELETE CASCADE,
    FOREIGN KEY (add_on_id, organization_id) REFERENCES add_ons(id, organization_id) ON DELETE RESTRICT
);

CREATE INDEX idx_add_ons_organization_id ON add_ons(organization_id);
CREATE INDEX idx_add_ons_organization_status ON add_ons(organization_id, status);
CREATE INDEX idx_product_add_on_attachments_organization_id ON product_add_on_attachments(organization_id);
CREATE INDEX idx_product_add_on_attachments_product_id ON product_add_on_attachments(product_id);
CREATE INDEX idx_product_add_on_attachments_add_on_id ON product_add_on_attachments(add_on_id);
CREATE INDEX idx_product_add_on_attachments_product_status ON product_add_on_attachments(product_id, status);

-- migrate:down

DROP TABLE IF EXISTS product_add_on_attachments;
DROP TABLE IF EXISTS add_ons;

DROP TYPE IF EXISTS product_add_on_attachment_status_enum;
DROP TYPE IF EXISTS add_on_status_enum;
