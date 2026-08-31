-- migrate:up

ALTER TABLE money_accounts
    ADD COLUMN opening_balance NUMERIC(12, 2) NOT NULL DEFAULT 0
        CONSTRAINT money_accounts_opening_balance_non_negative_check CHECK (opening_balance >= 0);

-- migrate:down

ALTER TABLE money_accounts
    DROP CONSTRAINT IF EXISTS money_accounts_opening_balance_non_negative_check,
    DROP COLUMN IF EXISTS opening_balance;
