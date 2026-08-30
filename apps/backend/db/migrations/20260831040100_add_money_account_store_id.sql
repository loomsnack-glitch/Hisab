-- migrate:up

ALTER TABLE money_accounts
    ADD COLUMN store_id UUID,
    ADD CONSTRAINT money_accounts_store_organization_fk
        FOREIGN KEY (store_id, organization_id) REFERENCES stores (id, organization_id),
    DROP CONSTRAINT money_accounts_organization_wide_scope_check,
    ADD CONSTRAINT money_accounts_scope_store_check CHECK (
        (scope = 'organization_wide' AND store_id IS NULL)
        OR (scope = 'store_scoped' AND store_id IS NOT NULL)
    );

CREATE INDEX idx_money_accounts_organization_store
    ON money_accounts (organization_id, store_id);

-- migrate:down

DROP INDEX IF EXISTS idx_money_accounts_organization_store;

ALTER TABLE money_accounts
    DROP CONSTRAINT IF EXISTS money_accounts_scope_store_check,
    DROP CONSTRAINT IF EXISTS money_accounts_store_organization_fk,
    DROP COLUMN IF EXISTS store_id,
    ADD CONSTRAINT money_accounts_organization_wide_scope_check CHECK (scope = 'organization_wide');
