-- migrate:up

ALTER TABLE whatsapp_cloud_template_bindings
    ADD COLUMN local_template_body TEXT,
    ADD COLUMN variable_mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD CONSTRAINT whatsapp_cloud_template_bindings_variable_mapping_check
        CHECK (jsonb_typeof(variable_mapping) = 'object');

-- Existing bindings were created before Cloud placeholder mappings were stored.
-- Keep their history, but require an explicit rebind before a future send can use
-- them. Already queued messages carry their immutable outbound snapshot.
UPDATE whatsapp_cloud_template_bindings
SET is_active = FALSE,
    updated_at = NOW()
WHERE is_active = TRUE;

-- migrate:down

ALTER TABLE whatsapp_cloud_template_bindings
    DROP CONSTRAINT IF EXISTS whatsapp_cloud_template_bindings_variable_mapping_check,
    DROP COLUMN IF EXISTS variable_mapping,
    DROP COLUMN IF EXISTS local_template_body;
