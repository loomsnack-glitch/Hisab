-- migrate:up

CREATE TYPE table_order_status_enum AS ENUM ('active', 'checked_out', 'discarded');

CREATE TABLE table_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    store_id UUID NOT NULL,
    service_table_id UUID NOT NULL,
    customer_id UUID,
    sale_id UUID,
    status table_order_status_enum NOT NULL DEFAULT 'active',
    notes TEXT,
    created_by_device_id UUID,
    updated_by_device_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT table_orders_active_sale_check CHECK (
        (status = 'active' AND sale_id IS NULL)
        OR (status = 'checked_out' AND sale_id IS NOT NULL)
        OR (status = 'discarded' AND sale_id IS NULL)
    ),
    UNIQUE (id, organization_id, store_id),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (store_id, organization_id) REFERENCES stores(id, organization_id) ON DELETE CASCADE,
    FOREIGN KEY (service_table_id, organization_id, store_id)
        REFERENCES service_tables(id, organization_id, store_id) ON DELETE RESTRICT,
    FOREIGN KEY (customer_id, organization_id) REFERENCES customers(id, organization_id) ON DELETE RESTRICT,
    FOREIGN KEY (sale_id, organization_id, store_id) REFERENCES sales(id, organization_id, store_id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by_device_id) REFERENCES store_devices(id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by_device_id) REFERENCES store_devices(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX table_orders_one_active_per_table
    ON table_orders (service_table_id)
    WHERE status = 'active';

CREATE INDEX idx_table_orders_store_id ON table_orders (organization_id, store_id);
CREATE INDEX idx_table_orders_service_table_id ON table_orders (service_table_id);

ALTER TABLE service_tables
    ADD COLUMN current_table_order_id UUID;

ALTER TABLE service_tables
    ADD CONSTRAINT service_tables_current_table_order_fkey
        FOREIGN KEY (current_table_order_id, organization_id, store_id)
        REFERENCES table_orders(id, organization_id, store_id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX service_tables_current_table_order_unique
    ON service_tables (current_table_order_id)
    WHERE current_table_order_id IS NOT NULL;

ALTER TABLE kots
    ADD COLUMN table_order_id UUID;

ALTER TABLE kots
    DROP CONSTRAINT kots_parcel_sale_check;

ALTER TABLE kots
    ADD CONSTRAINT kots_type_association_check CHECK (
        (kot_type = 'parcel' AND sale_id IS NOT NULL AND table_order_id IS NULL)
        OR (kot_type = 'table' AND table_order_id IS NOT NULL)
    );

ALTER TABLE kots
    ADD CONSTRAINT kots_table_order_fkey
        FOREIGN KEY (table_order_id, organization_id, store_id)
        REFERENCES table_orders(id, organization_id, store_id) ON DELETE RESTRICT;

DROP INDEX IF EXISTS kots_sale_id_key;

CREATE UNIQUE INDEX kots_parcel_sale_id_key
    ON kots (sale_id)
    WHERE sale_id IS NOT NULL AND kot_type = 'parcel';

CREATE INDEX idx_kots_table_order_id ON kots (table_order_id);

-- migrate:down

DROP INDEX IF EXISTS idx_kots_table_order_id;
DROP INDEX IF EXISTS kots_parcel_sale_id_key;

ALTER TABLE kots
    DROP CONSTRAINT IF EXISTS kots_table_order_fkey;

ALTER TABLE kots
    DROP CONSTRAINT IF EXISTS kots_type_association_check;

ALTER TABLE kots
    ADD CONSTRAINT kots_parcel_sale_check CHECK (
        (kot_type = 'parcel' AND sale_id IS NOT NULL)
        OR (kot_type = 'table')
    );

CREATE UNIQUE INDEX kots_sale_id_key
    ON kots (sale_id)
    WHERE sale_id IS NOT NULL;

ALTER TABLE kots
    DROP COLUMN IF EXISTS table_order_id;

DROP INDEX IF EXISTS service_tables_current_table_order_unique;

ALTER TABLE service_tables
    DROP CONSTRAINT IF EXISTS service_tables_current_table_order_fkey;

ALTER TABLE service_tables
    DROP COLUMN IF EXISTS current_table_order_id;

DROP INDEX IF EXISTS idx_table_orders_service_table_id;
DROP INDEX IF EXISTS idx_table_orders_store_id;
DROP INDEX IF EXISTS table_orders_one_active_per_table;
DROP TABLE IF EXISTS table_orders;
DROP TYPE IF EXISTS table_order_status_enum;
