-- migrate:up

ALTER TABLE bundle_product_components
    DROP CONSTRAINT IF EXISTS bundle_product_components_bundle_product_id_component_product_id_key;

-- migrate:down

ALTER TABLE bundle_product_components
    ADD CONSTRAINT bundle_product_components_bundle_product_id_component_product_id_key
    UNIQUE (bundle_product_id, component_product_id);
