-- migrate:up
ALTER TABLE sale_item_bundle_components
    ADD COLUMN choice_group_id UUID;

-- migrate:down
ALTER TABLE sale_item_bundle_components
    DROP COLUMN IF EXISTS choice_group_id;
