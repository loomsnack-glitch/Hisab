-- migrate:up

CREATE TYPE service_table_state_enum AS ENUM (
    'free',
    'allocated',
    'engaged',
    'ready_to_bill',
    'payment_due',
    'paid'
);

CREATE TABLE service_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    store_id UUID NOT NULL,
    table_label VARCHAR(64) NOT NULL,
    capacity INTEGER,
    position_x NUMERIC(8,7) NOT NULL DEFAULT 0.05,
    position_y NUMERIC(8,7) NOT NULL DEFAULT 0.05,
    state service_table_state_enum NOT NULL DEFAULT 'free',
    current_sale_id UUID,
    created_by UUID NOT NULL,
    updated_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT service_tables_id_scope_key UNIQUE (id, organization_id, store_id),
    CONSTRAINT service_tables_table_label_check CHECK (length(btrim(table_label)) > 0),
    CONSTRAINT service_tables_capacity_check CHECK (capacity IS NULL OR capacity > 0),
    CONSTRAINT service_tables_position_x_check CHECK (position_x >= 0 AND position_x <= 1),
    CONSTRAINT service_tables_position_y_check CHECK (position_y >= 0 AND position_y <= 1),
    CONSTRAINT service_tables_store_fkey FOREIGN KEY (store_id, organization_id)
        REFERENCES stores(id, organization_id)
        ON DELETE CASCADE
);

CREATE UNIQUE INDEX service_tables_store_table_label_lower_unique
    ON service_tables (store_id, lower(btrim(table_label)));

CREATE INDEX idx_service_tables_store_position
    ON service_tables (organization_id, store_id, position_y, position_x, id);

-- migrate:down

DROP INDEX IF EXISTS idx_service_tables_store_position;
DROP INDEX IF EXISTS service_tables_store_table_label_lower_unique;
DROP TABLE IF EXISTS service_tables;
DROP TYPE IF EXISTS service_table_state_enum;
