-- migrate:up

ALTER TABLE store_billing_settings
    ADD COLUMN kot_number_reset_period sale_number_reset_period_enum NOT NULL DEFAULT 'daily';

CREATE TABLE store_kot_sequences (
    store_id UUID NOT NULL,
    organization_id UUID NOT NULL,
    period_key VARCHAR(32) NOT NULL,
    next_sequence_number BIGINT NOT NULL DEFAULT 1,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (store_id, period_key),
    CONSTRAINT store_kot_sequences_next_number_check CHECK (next_sequence_number > 0),
    CONSTRAINT store_kot_sequences_period_key_check CHECK (length(trim(period_key)) > 0),
    FOREIGN KEY (store_id, organization_id) REFERENCES stores(id, organization_id) ON DELETE CASCADE
);

CREATE TYPE kot_type_enum AS ENUM ('table', 'parcel');

CREATE TABLE kots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    store_id UUID NOT NULL,
    sale_id UUID,
    kot_type kot_type_enum NOT NULL,
    kot_number VARCHAR(64) NOT NULL,
    kot_sequence_number BIGINT NOT NULL,
    kot_period_key VARCHAR(32) NOT NULL,
    created_by_device_id UUID,
    updated_by_device_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT kots_sequence_number_check CHECK (kot_sequence_number > 0),
    CONSTRAINT kots_period_key_check CHECK (length(trim(kot_period_key)) > 0),
    CONSTRAINT kots_number_check CHECK (length(trim(kot_number)) > 0),
    CONSTRAINT kots_parcel_sale_check CHECK (
        (kot_type = 'parcel' AND sale_id IS NOT NULL)
        OR (kot_type = 'table')
    ),
    UNIQUE (id, organization_id, store_id),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (store_id, organization_id) REFERENCES stores(id, organization_id) ON DELETE CASCADE,
    FOREIGN KEY (sale_id, organization_id, store_id) REFERENCES sales(id, organization_id, store_id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by_device_id) REFERENCES store_devices(id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by_device_id) REFERENCES store_devices(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX kots_store_period_sequence_key
    ON kots (store_id, kot_period_key, kot_sequence_number);

CREATE UNIQUE INDEX kots_sale_id_key
    ON kots (sale_id)
    WHERE sale_id IS NOT NULL;

CREATE TABLE kot_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    store_id UUID NOT NULL,
    kot_id UUID NOT NULL,
    product_id UUID NOT NULL,
    quantity INTEGER NOT NULL,
    configuration_signature TEXT NOT NULL DEFAULT '',
    product_name_snapshot VARCHAR(255) NOT NULL,
    unit_price_snapshot NUMERIC(10, 2) NOT NULL,
    discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    line_subtotal NUMERIC(12, 2) NOT NULL,
    line_total NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT kot_items_quantity_check CHECK (quantity > 0),
    CONSTRAINT kot_items_unit_price_snapshot_check CHECK (unit_price_snapshot >= 0),
    CONSTRAINT kot_items_discount_amount_check CHECK (discount_amount >= 0 AND discount_amount <= line_subtotal),
    CONSTRAINT kot_items_line_subtotal_check CHECK (line_subtotal >= 0),
    CONSTRAINT kot_items_line_total_check CHECK (line_total >= 0 AND line_total = line_subtotal - discount_amount),
    CONSTRAINT kot_items_id_scope_key UNIQUE (id, organization_id, store_id, kot_id),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (store_id, organization_id) REFERENCES stores(id, organization_id) ON DELETE CASCADE,
    FOREIGN KEY (kot_id, organization_id, store_id) REFERENCES kots(id, organization_id, store_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id, organization_id) REFERENCES products(id, organization_id) ON DELETE RESTRICT
);

CREATE INDEX idx_kot_items_kot_id ON kot_items(kot_id);

CREATE TABLE kot_item_add_ons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    store_id UUID NOT NULL,
    kot_id UUID NOT NULL,
    kot_item_id UUID NOT NULL,
    add_on_id UUID NOT NULL,
    quantity_per_parent INTEGER NOT NULL,
    total_quantity INTEGER NOT NULL,
    add_on_name_snapshot VARCHAR(255) NOT NULL,
    unit_price_snapshot NUMERIC(10, 2) NOT NULL,
    unit_discount_snapshot NUMERIC(10, 2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    line_subtotal NUMERIC(12, 2) NOT NULL,
    line_total NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT kot_item_add_ons_quantity_per_parent_check CHECK (quantity_per_parent >= 1),
    CONSTRAINT kot_item_add_ons_total_quantity_check CHECK (total_quantity >= 1),
    CONSTRAINT kot_item_add_ons_unit_price_snapshot_check CHECK (unit_price_snapshot >= 0),
    CONSTRAINT kot_item_add_ons_unit_discount_snapshot_check CHECK (unit_discount_snapshot >= 0),
    CONSTRAINT kot_item_add_ons_discount_amount_check CHECK (discount_amount >= 0 AND discount_amount <= line_subtotal),
    CONSTRAINT kot_item_add_ons_line_subtotal_check CHECK (line_subtotal >= 0),
    CONSTRAINT kot_item_add_ons_line_total_check CHECK (line_total >= 0 AND line_total = line_subtotal - discount_amount),
    UNIQUE (kot_item_id, add_on_id),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (store_id, organization_id) REFERENCES stores(id, organization_id) ON DELETE CASCADE,
    FOREIGN KEY (kot_id, organization_id, store_id) REFERENCES kots(id, organization_id, store_id) ON DELETE CASCADE,
    FOREIGN KEY (kot_item_id, organization_id, store_id, kot_id)
        REFERENCES kot_items(id, organization_id, store_id, kot_id) ON DELETE CASCADE,
    FOREIGN KEY (add_on_id, organization_id) REFERENCES add_ons(id, organization_id) ON DELETE RESTRICT
);

CREATE INDEX idx_kot_item_add_ons_kot_id ON kot_item_add_ons(kot_id);
CREATE INDEX idx_kot_item_add_ons_kot_item_id ON kot_item_add_ons(kot_item_id);

CREATE TABLE kot_item_bundle_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    store_id UUID NOT NULL,
    kot_id UUID NOT NULL,
    kot_item_id UUID NOT NULL,
    choice_group_id UUID,
    component_product_id UUID NOT NULL,
    quantity_per_bundle INTEGER NOT NULL,
    total_quantity INTEGER NOT NULL,
    product_name_snapshot VARCHAR(255) NOT NULL,
    unit_price_snapshot NUMERIC(10, 2) NOT NULL,
    unit_discount_snapshot NUMERIC(10, 2) NOT NULL DEFAULT 0,
    price_adjustment_snapshot NUMERIC(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT kot_item_bundle_components_quantity_per_bundle_check CHECK (quantity_per_bundle >= 1),
    CONSTRAINT kot_item_bundle_components_total_quantity_check CHECK (total_quantity >= 1),
    CONSTRAINT kot_item_bundle_components_unit_price_snapshot_check CHECK (unit_price_snapshot >= 0),
    CONSTRAINT kot_item_bundle_components_unit_discount_snapshot_check CHECK (unit_discount_snapshot >= 0),
    CONSTRAINT kot_item_bundle_components_id_scope_key
        UNIQUE (id, organization_id, store_id, kot_id, kot_item_id),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (store_id, organization_id) REFERENCES stores(id, organization_id) ON DELETE CASCADE,
    FOREIGN KEY (kot_id, organization_id, store_id) REFERENCES kots(id, organization_id, store_id) ON DELETE CASCADE,
    FOREIGN KEY (kot_item_id, organization_id, store_id, kot_id)
        REFERENCES kot_items(id, organization_id, store_id, kot_id) ON DELETE CASCADE,
    FOREIGN KEY (component_product_id, organization_id) REFERENCES products(id, organization_id) ON DELETE RESTRICT
);

CREATE INDEX idx_kot_item_bundle_components_kot_id ON kot_item_bundle_components(kot_id);
CREATE INDEX idx_kot_item_bundle_components_kot_item_id ON kot_item_bundle_components(kot_item_id);

CREATE TABLE kot_item_bundle_component_add_ons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    store_id UUID NOT NULL,
    kot_id UUID NOT NULL,
    kot_item_id UUID NOT NULL,
    kot_item_bundle_component_id UUID NOT NULL,
    add_on_id UUID NOT NULL,
    quantity_per_component INTEGER NOT NULL,
    total_quantity INTEGER NOT NULL,
    add_on_name_snapshot VARCHAR(255) NOT NULL,
    unit_price_snapshot NUMERIC(10, 2) NOT NULL,
    unit_discount_snapshot NUMERIC(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT kot_item_bundle_component_add_ons_quantity_per_component_check
        CHECK (quantity_per_component >= 1),
    CONSTRAINT kot_item_bundle_component_add_ons_total_quantity_check CHECK (total_quantity >= 1),
    CONSTRAINT kot_item_bundle_component_add_ons_unit_price_snapshot_check CHECK (unit_price_snapshot >= 0),
    CONSTRAINT kot_item_bundle_component_add_ons_unit_discount_snapshot_check
        CHECK (unit_discount_snapshot >= 0),
    UNIQUE (kot_item_bundle_component_id, add_on_id),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (store_id, organization_id) REFERENCES stores(id, organization_id) ON DELETE CASCADE,
    FOREIGN KEY (kot_id, organization_id, store_id) REFERENCES kots(id, organization_id, store_id) ON DELETE CASCADE,
    FOREIGN KEY (kot_item_id, organization_id, store_id, kot_id)
        REFERENCES kot_items(id, organization_id, store_id, kot_id) ON DELETE CASCADE,
    FOREIGN KEY (kot_item_bundle_component_id, organization_id, store_id, kot_id, kot_item_id)
        REFERENCES kot_item_bundle_components(id, organization_id, store_id, kot_id, kot_item_id)
        ON DELETE CASCADE,
    FOREIGN KEY (add_on_id, organization_id) REFERENCES add_ons(id, organization_id) ON DELETE RESTRICT
);

CREATE INDEX idx_kot_item_bundle_component_add_ons_kot_id ON kot_item_bundle_component_add_ons(kot_id);
CREATE INDEX idx_kot_item_bundle_component_add_ons_kot_item_id
    ON kot_item_bundle_component_add_ons(kot_item_id);

-- migrate:down

DROP TABLE IF EXISTS kot_item_bundle_component_add_ons;
DROP TABLE IF EXISTS kot_item_bundle_components;
DROP TABLE IF EXISTS kot_item_add_ons;
DROP TABLE IF EXISTS kot_items;
DROP INDEX IF EXISTS kots_sale_id_key;
DROP INDEX IF EXISTS kots_store_period_sequence_key;
DROP TABLE IF EXISTS kots;
DROP TYPE IF EXISTS kot_type_enum;
DROP TABLE IF EXISTS store_kot_sequences;
ALTER TABLE store_billing_settings
    DROP COLUMN IF EXISTS kot_number_reset_period;
