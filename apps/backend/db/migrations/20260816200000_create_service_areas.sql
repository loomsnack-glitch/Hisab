-- migrate:up

CREATE TABLE service_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    store_id UUID NOT NULL,
    title VARCHAR(128) NOT NULL,
    description VARCHAR(1000),
    created_by UUID NOT NULL,
    updated_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT service_areas_id_scope_key UNIQUE (id, organization_id, store_id),
    CONSTRAINT service_areas_title_check CHECK (length(btrim(title)) > 0),
    CONSTRAINT service_areas_store_fkey FOREIGN KEY (store_id, organization_id)
        REFERENCES stores(id, organization_id)
        ON DELETE CASCADE
);

CREATE UNIQUE INDEX service_areas_store_title_lower_unique
    ON service_areas (store_id, lower(btrim(title)));

CREATE INDEX idx_service_areas_store
    ON service_areas (organization_id, store_id, created_at, id);

-- migrate:down

DROP INDEX IF EXISTS idx_service_areas_store;
DROP INDEX IF EXISTS service_areas_store_title_lower_unique;
DROP TABLE IF EXISTS service_areas;
