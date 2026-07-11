-- migrate:up

-- Postgres truncates identifiers to 63 chars, so the earlier drop used the wrong name
-- and left this uniqueness constraint in place. Bundle composition allows the same
-- product multiple times when Add-On shapes differ.
ALTER TABLE bundle_product_components
    DROP CONSTRAINT IF EXISTS bundle_product_components_bundle_product_id_component_produ_key;

ALTER TABLE bundle_product_components
    DROP CONSTRAINT IF EXISTS bundle_product_components_bundle_product_id_component_product_id_key;

-- migrate:down

ALTER TABLE bundle_product_components
    ADD CONSTRAINT bundle_product_components_bundle_product_id_component_produ_key
    UNIQUE (bundle_product_id, component_product_id);
