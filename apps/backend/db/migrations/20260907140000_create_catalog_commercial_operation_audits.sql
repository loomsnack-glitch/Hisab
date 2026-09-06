-- migrate:up

CREATE TYPE catalog_commercial_item_type_enum AS ENUM ('product', 'add_on');

CREATE TYPE catalog_commercial_operation_type_enum AS ENUM (
    'set_price_override',
    'set_discount_override',
    'clear_price_override',
    'clear_discount_override',
    'set_local_status'
);

CREATE TABLE catalog_commercial_operation_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    item_type catalog_commercial_item_type_enum NOT NULL,
    operation catalog_commercial_operation_type_enum NOT NULL,
    store_ids UUID[] NOT NULL,
    item_ids UUID[] NOT NULL,
    actor_id UUID NOT NULL REFERENCES users(id),
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT catalog_commercial_operation_audits_store_ids_check
        CHECK (cardinality(store_ids) > 0),
    CONSTRAINT catalog_commercial_operation_audits_item_ids_check
        CHECK (cardinality(item_ids) > 0),
    CONSTRAINT catalog_commercial_operation_audits_details_check
        CHECK (jsonb_typeof(details) = 'object')
);

CREATE INDEX idx_catalog_commercial_operation_audits_organization_created
    ON catalog_commercial_operation_audits (organization_id, created_at DESC);

-- migrate:down

DROP INDEX IF EXISTS idx_catalog_commercial_operation_audits_organization_created;
DROP TABLE IF EXISTS catalog_commercial_operation_audits;
DROP TYPE IF EXISTS catalog_commercial_operation_type_enum;
DROP TYPE IF EXISTS catalog_commercial_item_type_enum;
