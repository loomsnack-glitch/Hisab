-- migrate:up

ALTER TABLE service_tables
    ADD COLUMN service_area_id UUID,
    ADD CONSTRAINT service_tables_service_area_fkey
        FOREIGN KEY (service_area_id, organization_id, store_id)
        REFERENCES service_areas(id, organization_id, store_id)
        ON DELETE SET NULL (service_area_id);

CREATE INDEX idx_service_tables_service_area
    ON service_tables (organization_id, store_id, service_area_id);

-- migrate:down

DROP INDEX IF EXISTS idx_service_tables_service_area;

ALTER TABLE service_tables
    DROP CONSTRAINT IF EXISTS service_tables_service_area_fkey,
    DROP COLUMN IF EXISTS service_area_id;
