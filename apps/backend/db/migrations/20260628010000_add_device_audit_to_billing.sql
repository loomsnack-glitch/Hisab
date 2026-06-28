-- migrate:up

ALTER TABLE store_devices
    ADD CONSTRAINT store_devices_id_organization_id_store_id_key UNIQUE (id, organization_id, store_id);

ALTER TABLE sales
    ALTER COLUMN user_id DROP NOT NULL,
    ADD COLUMN created_by_device_id UUID,
    ADD COLUMN updated_by_device_id UUID;

ALTER TABLE sales
    ADD CONSTRAINT sales_created_by_device_id_organization_id_store_id_fkey
        FOREIGN KEY (created_by_device_id, organization_id, store_id)
        REFERENCES store_devices(id, organization_id, store_id)
        ON DELETE RESTRICT,
    ADD CONSTRAINT sales_updated_by_device_id_organization_id_store_id_fkey
        FOREIGN KEY (updated_by_device_id, organization_id, store_id)
        REFERENCES store_devices(id, organization_id, store_id)
        ON DELETE RESTRICT;

ALTER TABLE payments
    ALTER COLUMN collected_by DROP NOT NULL;

CREATE INDEX idx_sales_created_by_device_id ON sales(created_by_device_id);
CREATE INDEX idx_sales_updated_by_device_id ON sales(updated_by_device_id);


-- migrate:down

DROP INDEX IF EXISTS idx_sales_updated_by_device_id;
DROP INDEX IF EXISTS idx_sales_created_by_device_id;

ALTER TABLE payments
    ALTER COLUMN collected_by SET NOT NULL;

ALTER TABLE sales
    DROP CONSTRAINT IF EXISTS sales_updated_by_device_id_organization_id_store_id_fkey,
    DROP CONSTRAINT IF EXISTS sales_created_by_device_id_organization_id_store_id_fkey;

ALTER TABLE sales
    DROP COLUMN IF EXISTS updated_by_device_id,
    DROP COLUMN IF EXISTS created_by_device_id,
    ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE store_devices
    DROP CONSTRAINT IF EXISTS store_devices_id_organization_id_store_id_key;
