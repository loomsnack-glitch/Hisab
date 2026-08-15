-- migrate:up

CREATE INDEX idx_customers_organization_created_at_id
    ON customers (organization_id, created_at DESC, id DESC);

-- migrate:down

DROP INDEX IF EXISTS idx_customers_organization_created_at_id;
