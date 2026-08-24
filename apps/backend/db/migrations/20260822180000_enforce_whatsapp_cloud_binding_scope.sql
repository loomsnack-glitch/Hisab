-- migrate:up

-- A binding carries a WABA identity as well as a template identity. Keep that
-- relationship enforceable by PostgreSQL instead of relying only on callers.
ALTER TABLE whatsapp_cloud_templates
    ADD CONSTRAINT whatsapp_cloud_templates_id_waba_organization_key
        UNIQUE (id, whatsapp_business_account_id, organization_id);

ALTER TABLE whatsapp_cloud_template_bindings
    ADD CONSTRAINT whatsapp_cloud_template_bindings_asset_waba_fkey
        FOREIGN KEY (cloud_template_id, whatsapp_business_account_id, organization_id)
        REFERENCES whatsapp_cloud_templates (id, whatsapp_business_account_id, organization_id)
        ON DELETE CASCADE;

-- migrate:down

ALTER TABLE whatsapp_cloud_template_bindings
    DROP CONSTRAINT IF EXISTS whatsapp_cloud_template_bindings_asset_waba_fkey;

ALTER TABLE whatsapp_cloud_templates
    DROP CONSTRAINT IF EXISTS whatsapp_cloud_templates_id_waba_organization_key;
