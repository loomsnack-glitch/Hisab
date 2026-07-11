-- migrate:up

CREATE TYPE product_type_enum AS ENUM ('single', 'bundle');

ALTER TABLE products
    ADD COLUMN product_type product_type_enum NOT NULL DEFAULT 'single';

CREATE INDEX idx_products_organization_product_type ON products(organization_id, product_type);

-- Top-level Product components inside a Bundle Product (add-on nesting comes later)
CREATE TABLE bundle_product_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    bundle_product_id UUID NOT NULL,
    component_product_id UUID NOT NULL,
    quantity INTEGER NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE (id, organization_id),
    CONSTRAINT bundle_product_components_quantity_check CHECK (quantity >= 1),
    CONSTRAINT bundle_product_components_not_self CHECK (bundle_product_id <> component_product_id),
    FOREIGN KEY (bundle_product_id, organization_id) REFERENCES products(id, organization_id) ON DELETE CASCADE,
    FOREIGN KEY (component_product_id, organization_id) REFERENCES products(id, organization_id) ON DELETE RESTRICT
);

CREATE INDEX idx_bundle_product_components_organization_id ON bundle_product_components(organization_id);
CREATE INDEX idx_bundle_product_components_bundle_product_id ON bundle_product_components(bundle_product_id);
CREATE INDEX idx_bundle_product_components_component_product_id ON bundle_product_components(component_product_id);

-- migrate:down

DROP TABLE IF EXISTS bundle_product_components;

DROP INDEX IF EXISTS idx_products_organization_product_type;

ALTER TABLE products
    DROP COLUMN IF EXISTS product_type;

DROP TYPE IF EXISTS product_type_enum;
