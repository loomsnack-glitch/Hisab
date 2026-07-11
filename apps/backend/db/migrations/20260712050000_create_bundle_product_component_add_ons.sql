-- migrate:up

-- Parent-scoped Add-Ons nested under Bundle Product component Products
CREATE TABLE bundle_product_component_add_ons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    bundle_product_component_id UUID NOT NULL,
    add_on_id UUID NOT NULL,
    quantity INTEGER NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE (id, organization_id),
    UNIQUE (bundle_product_component_id, add_on_id),
    CONSTRAINT bundle_product_component_add_ons_quantity_check CHECK (quantity >= 1),
    FOREIGN KEY (bundle_product_component_id, organization_id)
        REFERENCES bundle_product_components(id, organization_id) ON DELETE CASCADE,
    FOREIGN KEY (add_on_id, organization_id)
        REFERENCES add_ons(id, organization_id) ON DELETE RESTRICT
);

CREATE INDEX idx_bundle_product_component_add_ons_organization_id
    ON bundle_product_component_add_ons(organization_id);
CREATE INDEX idx_bundle_product_component_add_ons_component_id
    ON bundle_product_component_add_ons(bundle_product_component_id);
CREATE INDEX idx_bundle_product_component_add_ons_add_on_id
    ON bundle_product_component_add_ons(add_on_id);

-- migrate:down

DROP TABLE IF EXISTS bundle_product_component_add_ons;
