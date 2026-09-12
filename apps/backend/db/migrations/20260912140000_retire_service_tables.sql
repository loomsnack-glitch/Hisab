-- migrate:up

ALTER TABLE service_tables
    ADD COLUMN retired_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN retired_by UUID REFERENCES users(id);

DROP INDEX IF EXISTS service_tables_store_table_label_lower_unique;

CREATE UNIQUE INDEX service_tables_store_live_table_label_lower_unique
    ON service_tables (store_id, lower(btrim(table_label)))
    WHERE retired_at IS NULL;

-- migrate:down

DROP INDEX IF EXISTS service_tables_store_live_table_label_lower_unique;

CREATE UNIQUE INDEX service_tables_store_table_label_lower_unique
    ON service_tables (store_id, lower(btrim(table_label)));

ALTER TABLE service_tables
    DROP COLUMN IF EXISTS retired_by,
    DROP COLUMN IF EXISTS retired_at;
