-- migrate:up

CREATE OR REPLACE FUNCTION create_default_whatsapp_store_policy()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO whatsapp_store_policies (
        organization_id,
        store_id,
        mode,
        revision,
        created_by
    ) VALUES (
        NEW.organization_id,
        NEW.id,
        'disabled',
        1,
        NEW.created_by
    )
    ON CONFLICT (organization_id, store_id, revision) DO NOTHING;

    RETURN NEW;
END;
$$;

CREATE TRIGGER stores_create_default_whatsapp_store_policy
    AFTER INSERT ON stores
    FOR EACH ROW
    EXECUTE FUNCTION create_default_whatsapp_store_policy();

COMMENT ON FUNCTION create_default_whatsapp_store_policy() IS
    'Creates the safe disabled WhatsApp policy for every Store created after policy migration.';

-- migrate:down

DROP TRIGGER IF EXISTS stores_create_default_whatsapp_store_policy ON stores;
DROP FUNCTION IF EXISTS create_default_whatsapp_store_policy();
