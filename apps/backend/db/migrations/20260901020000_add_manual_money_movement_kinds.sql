-- migrate:up

ALTER TYPE money_account_movement_source_kind_enum ADD VALUE IF NOT EXISTS 'manual_deposit';
ALTER TYPE money_account_movement_source_kind_enum ADD VALUE IF NOT EXISTS 'manual_withdrawal';

ALTER TABLE money_account_movements
    ADD COLUMN note VARCHAR(1000);

ALTER TABLE money_account_movements
    ALTER COLUMN store_id DROP NOT NULL;

-- migrate:down

ALTER TABLE money_account_movements
    ALTER COLUMN store_id SET NOT NULL;

ALTER TABLE money_account_movements
    DROP COLUMN IF EXISTS note;

-- PostgreSQL cannot drop an enum value safely once it has been added.
