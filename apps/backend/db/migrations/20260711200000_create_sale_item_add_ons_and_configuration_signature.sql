-- migrate:up

-- Sales are count-based: reject legacy fractional rows rather than silently rounding them.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM sale_items
        WHERE quantity <> trunc(quantity)
    ) THEN
        RAISE EXCEPTION 'sale_items.quantity contains fractional values and cannot be converted to whole counts';
    END IF;
END;
$$;

ALTER TABLE sale_items
    ALTER COLUMN quantity TYPE INTEGER USING quantity::INTEGER,
    ADD CONSTRAINT sale_items_id_organization_store_sale_key
        UNIQUE (id, organization_id, store_id, sale_id);

-- Persisted Configured Sale Item Signature on parent product rows
ALTER TABLE sale_items
    ADD COLUMN configuration_signature TEXT NOT NULL DEFAULT '';

CREATE INDEX idx_sale_items_sale_configuration_signature
    ON sale_items (sale_id, product_id, configuration_signature);

-- Child Add-On billing rows under parent sale_items
CREATE TABLE sale_item_add_ons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    store_id UUID NOT NULL,
    sale_id UUID NOT NULL,
    sale_item_id UUID NOT NULL,
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
    CONSTRAINT sale_item_add_ons_quantity_per_parent_check CHECK (quantity_per_parent >= 1),
    CONSTRAINT sale_item_add_ons_total_quantity_check CHECK (total_quantity >= 1),
    CONSTRAINT sale_item_add_ons_unit_price_snapshot_check CHECK (unit_price_snapshot >= 0),
    CONSTRAINT sale_item_add_ons_unit_discount_snapshot_check CHECK (unit_discount_snapshot >= 0),
    CONSTRAINT sale_item_add_ons_discount_amount_check CHECK (discount_amount >= 0 AND discount_amount <= line_subtotal),
    CONSTRAINT sale_item_add_ons_line_subtotal_check CHECK (line_subtotal >= 0),
    CONSTRAINT sale_item_add_ons_line_total_check CHECK (line_total >= 0 AND line_total = line_subtotal - discount_amount),
    UNIQUE (sale_item_id, add_on_id),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (store_id, organization_id) REFERENCES stores(id, organization_id) ON DELETE CASCADE,
    FOREIGN KEY (sale_id, organization_id, store_id) REFERENCES sales(id, organization_id, store_id) ON DELETE CASCADE,
    FOREIGN KEY (sale_item_id, organization_id, store_id, sale_id)
        REFERENCES sale_items(id, organization_id, store_id, sale_id) ON DELETE CASCADE,
    FOREIGN KEY (add_on_id, organization_id) REFERENCES add_ons(id, organization_id) ON DELETE RESTRICT
);

CREATE INDEX idx_sale_item_add_ons_sale_id ON sale_item_add_ons(sale_id);
CREATE INDEX idx_sale_item_add_ons_sale_item_id ON sale_item_add_ons(sale_item_id);
CREATE INDEX idx_sale_item_add_ons_add_on_id ON sale_item_add_ons(add_on_id);

-- migrate:down

DROP TABLE IF EXISTS sale_item_add_ons;

DROP INDEX IF EXISTS idx_sale_items_sale_configuration_signature;

ALTER TABLE sale_items
    DROP COLUMN IF EXISTS configuration_signature;

ALTER TABLE sale_items
    DROP CONSTRAINT IF EXISTS sale_items_id_organization_store_sale_key,
    ALTER COLUMN quantity TYPE NUMERIC(10, 3) USING quantity::NUMERIC(10, 3);
