-- migrate:up

ALTER TYPE money_account_movement_source_kind_enum ADD VALUE IF NOT EXISTS 'transfer_out';
ALTER TYPE money_account_movement_source_kind_enum ADD VALUE IF NOT EXISTS 'transfer_in';

ALTER TABLE money_account_movements
    ADD COLUMN transfer_id UUID;

CREATE INDEX idx_money_account_movements_transfer_id
    ON money_account_movements (organization_id, transfer_id)
    WHERE transfer_id IS NOT NULL;

-- migrate:down

DROP INDEX IF EXISTS idx_money_account_movements_transfer_id;

ALTER TABLE money_account_movements
    DROP COLUMN IF EXISTS transfer_id;

-- PostgreSQL cannot drop an enum value safely once it has been added.
