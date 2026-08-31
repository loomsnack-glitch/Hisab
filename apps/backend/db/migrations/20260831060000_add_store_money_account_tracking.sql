-- migrate:up

ALTER TABLE stores
    ADD COLUMN money_account_tracking_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- migrate:down

ALTER TABLE stores
    DROP COLUMN IF EXISTS money_account_tracking_enabled;
