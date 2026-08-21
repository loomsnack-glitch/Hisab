-- migrate:up
DROP INDEX IF EXISTS idx_service_tables_store_position;

ALTER TABLE service_tables
    DROP CONSTRAINT IF EXISTS service_tables_position_x_check,
    DROP CONSTRAINT IF EXISTS service_tables_position_y_check,
    DROP COLUMN IF EXISTS position_x,
    DROP COLUMN IF EXISTS position_y;

-- migrate:down
ALTER TABLE service_tables
    ADD COLUMN position_x NUMERIC(8,7) NOT NULL DEFAULT 0.05,
    ADD COLUMN position_y NUMERIC(8,7) NOT NULL DEFAULT 0.05;

ALTER TABLE service_tables
    ADD CONSTRAINT service_tables_position_x_check CHECK (position_x >= 0 AND position_x <= 1),
    ADD CONSTRAINT service_tables_position_y_check CHECK (position_y >= 0 AND position_y <= 1);

CREATE INDEX idx_service_tables_store_position
    ON service_tables (organization_id, store_id, position_y, position_x, id);
