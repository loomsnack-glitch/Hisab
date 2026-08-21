-- migrate:up

ALTER TABLE stores
    ADD COLUMN kot_system_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN table_management_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- migrate:down

ALTER TABLE stores
    DROP COLUMN IF EXISTS table_management_enabled,
    DROP COLUMN IF EXISTS kot_system_enabled;
