-- migrate:up

ALTER TYPE money_account_movement_source_kind_enum ADD VALUE IF NOT EXISTS 'balance_adjustment';

ALTER TABLE money_account_movements
    ADD COLUMN actual_balance NUMERIC(12, 2);

-- migrate:down

ALTER TABLE money_account_movements
    DROP COLUMN IF EXISTS actual_balance;

-- PostgreSQL cannot drop an enum value safely once it has been added.
