-- migrate:up

ALTER TABLE sales
    ADD COLUMN service_table_id UUID;

ALTER TABLE sales
    ADD CONSTRAINT sales_service_table_fkey
    FOREIGN KEY (service_table_id, organization_id, store_id)
    REFERENCES service_tables(id, organization_id, store_id)
    ON DELETE RESTRICT;

ALTER TABLE service_tables
    ADD CONSTRAINT service_tables_current_sale_fkey
    FOREIGN KEY (current_sale_id, organization_id, store_id)
    REFERENCES sales(id, organization_id, store_id)
    ON DELETE RESTRICT;

CREATE UNIQUE INDEX service_tables_current_sale_unique
    ON service_tables (current_sale_id)
    WHERE current_sale_id IS NOT NULL;

CREATE INDEX idx_sales_service_table_id
    ON sales (organization_id, store_id, service_table_id)
    WHERE service_table_id IS NOT NULL;

-- migrate:down

DROP INDEX IF EXISTS idx_sales_service_table_id;
DROP INDEX IF EXISTS service_tables_current_sale_unique;
ALTER TABLE service_tables DROP CONSTRAINT IF EXISTS service_tables_current_sale_fkey;
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_service_table_fkey;
ALTER TABLE sales DROP COLUMN IF EXISTS service_table_id;
