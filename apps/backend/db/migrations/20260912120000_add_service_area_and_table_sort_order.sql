-- migrate:up

ALTER TABLE service_areas
    ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

ALTER TABLE service_tables
    ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

UPDATE service_areas
SET sort_order = ranked.sort_order
FROM (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY store_id
            ORDER BY lower(btrim(title)) ASC, created_at ASC, id ASC
        ) - 1 AS sort_order
    FROM service_areas
) AS ranked
WHERE service_areas.id = ranked.id;

UPDATE service_tables
SET sort_order = ranked.sort_order
FROM (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY store_id, service_area_id
            ORDER BY lower(btrim(table_label)) ASC, created_at ASC, id ASC
        ) - 1 AS sort_order
    FROM service_tables
) AS ranked
WHERE service_tables.id = ranked.id;

CREATE INDEX idx_service_areas_store_sort
    ON service_areas (organization_id, store_id, sort_order, id);

CREATE INDEX idx_service_tables_store_area_sort
    ON service_tables (organization_id, store_id, service_area_id, sort_order, id);

ALTER TABLE service_areas
    ALTER COLUMN sort_order DROP DEFAULT;

ALTER TABLE service_tables
    ALTER COLUMN sort_order DROP DEFAULT;

-- migrate:down

DROP INDEX IF EXISTS idx_service_tables_store_area_sort;
DROP INDEX IF EXISTS idx_service_areas_store_sort;

ALTER TABLE service_tables
    DROP COLUMN IF EXISTS sort_order;

ALTER TABLE service_areas
    DROP COLUMN IF EXISTS sort_order;
