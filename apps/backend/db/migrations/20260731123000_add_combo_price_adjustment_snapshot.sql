-- migrate:up
ALTER TABLE sale_item_bundle_components
    ADD COLUMN price_adjustment_snapshot NUMERIC(10, 2) NOT NULL DEFAULT 0;

ALTER TABLE sale_item_bundle_components
    ADD CONSTRAINT sale_item_bundle_components_price_adjustment_snapshot_check
    CHECK (price_adjustment_snapshot IS NOT NULL);

-- migrate:down
ALTER TABLE sale_item_bundle_components
    DROP CONSTRAINT IF EXISTS sale_item_bundle_components_price_adjustment_snapshot_check;

ALTER TABLE sale_item_bundle_components
    DROP COLUMN IF EXISTS price_adjustment_snapshot;
