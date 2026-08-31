-- migrate:up

ALTER TABLE money_accounts
    ADD CONSTRAINT money_accounts_cash_store_scoped_check CHECK (
        type <> 'cash'
        OR (scope = 'store_scoped' AND store_id IS NOT NULL)
    );

CREATE UNIQUE INDEX money_accounts_one_active_cash_per_store
    ON money_accounts (organization_id, store_id)
    WHERE type = 'cash' AND status = 'active';

-- migrate:down

DROP INDEX IF EXISTS money_accounts_one_active_cash_per_store;

ALTER TABLE money_accounts
    DROP CONSTRAINT IF EXISTS money_accounts_cash_store_scoped_check;
