-- migrate:up

-- Dedicated child snapshot rows for Bundle Product internals under a priced sale_item.
-- Component money is non-billing metadata; charged totals stay on the parent bundle sale_item.
CREATE TABLE sale_item_bundle_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    store_id UUID NOT NULL,
    sale_id UUID NOT NULL,
    sale_item_id UUID NOT NULL,
    component_product_id UUID NOT NULL,
    quantity_per_bundle INTEGER NOT NULL,
    total_quantity INTEGER NOT NULL,
    product_name_snapshot VARCHAR(255) NOT NULL,
    unit_price_snapshot NUMERIC(10, 2) NOT NULL,
    unit_discount_snapshot NUMERIC(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT sale_item_bundle_components_quantity_per_bundle_check CHECK (quantity_per_bundle >= 1),
    CONSTRAINT sale_item_bundle_components_total_quantity_check CHECK (total_quantity >= 1),
    CONSTRAINT sale_item_bundle_components_unit_price_snapshot_check CHECK (unit_price_snapshot >= 0),
    CONSTRAINT sale_item_bundle_components_unit_discount_snapshot_check CHECK (unit_discount_snapshot >= 0),
    CONSTRAINT sale_item_bundle_components_id_scope_key
        UNIQUE (id, organization_id, store_id, sale_id, sale_item_id),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (store_id, organization_id) REFERENCES stores(id, organization_id) ON DELETE CASCADE,
    FOREIGN KEY (sale_id, organization_id, store_id) REFERENCES sales(id, organization_id, store_id) ON DELETE CASCADE,
    FOREIGN KEY (sale_item_id, organization_id, store_id, sale_id)
        REFERENCES sale_items(id, organization_id, store_id, sale_id) ON DELETE CASCADE,
    FOREIGN KEY (component_product_id, organization_id) REFERENCES products(id, organization_id) ON DELETE RESTRICT
);

CREATE INDEX idx_sale_item_bundle_components_sale_id ON sale_item_bundle_components(sale_id);
CREATE INDEX idx_sale_item_bundle_components_sale_item_id ON sale_item_bundle_components(sale_item_id);
CREATE INDEX idx_sale_item_bundle_components_component_product_id
    ON sale_item_bundle_components(component_product_id);

CREATE TABLE sale_item_bundle_component_add_ons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    store_id UUID NOT NULL,
    sale_id UUID NOT NULL,
    sale_item_id UUID NOT NULL,
    sale_item_bundle_component_id UUID NOT NULL,
    add_on_id UUID NOT NULL,
    quantity_per_component INTEGER NOT NULL,
    total_quantity INTEGER NOT NULL,
    add_on_name_snapshot VARCHAR(255) NOT NULL,
    unit_price_snapshot NUMERIC(10, 2) NOT NULL,
    unit_discount_snapshot NUMERIC(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT sale_item_bundle_component_add_ons_quantity_per_component_check
        CHECK (quantity_per_component >= 1),
    CONSTRAINT sale_item_bundle_component_add_ons_total_quantity_check CHECK (total_quantity >= 1),
    CONSTRAINT sale_item_bundle_component_add_ons_unit_price_snapshot_check CHECK (unit_price_snapshot >= 0),
    CONSTRAINT sale_item_bundle_component_add_ons_unit_discount_snapshot_check
        CHECK (unit_discount_snapshot >= 0),
    UNIQUE (sale_item_bundle_component_id, add_on_id),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (store_id, organization_id) REFERENCES stores(id, organization_id) ON DELETE CASCADE,
    FOREIGN KEY (sale_id, organization_id, store_id) REFERENCES sales(id, organization_id, store_id) ON DELETE CASCADE,
    FOREIGN KEY (sale_item_id, organization_id, store_id, sale_id)
        REFERENCES sale_items(id, organization_id, store_id, sale_id) ON DELETE CASCADE,
    FOREIGN KEY (sale_item_bundle_component_id, organization_id, store_id, sale_id, sale_item_id)
        REFERENCES sale_item_bundle_components(id, organization_id, store_id, sale_id, sale_item_id)
        ON DELETE CASCADE,
    FOREIGN KEY (add_on_id, organization_id) REFERENCES add_ons(id, organization_id) ON DELETE RESTRICT
);

CREATE INDEX idx_sale_item_bundle_component_add_ons_sale_id ON sale_item_bundle_component_add_ons(sale_id);
CREATE INDEX idx_sale_item_bundle_component_add_ons_sale_item_id
    ON sale_item_bundle_component_add_ons(sale_item_id);
CREATE INDEX idx_sale_item_bundle_component_add_ons_component_id
    ON sale_item_bundle_component_add_ons(sale_item_bundle_component_id);
CREATE INDEX idx_sale_item_bundle_component_add_ons_add_on_id
    ON sale_item_bundle_component_add_ons(add_on_id);

-- migrate:down

DROP TABLE IF EXISTS sale_item_bundle_component_add_ons;
DROP TABLE IF EXISTS sale_item_bundle_components;
