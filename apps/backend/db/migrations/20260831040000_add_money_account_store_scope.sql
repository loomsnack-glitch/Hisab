-- migrate:up

ALTER TYPE money_account_scope_enum ADD VALUE IF NOT EXISTS 'store_scoped';

-- migrate:down

-- PostgreSQL cannot drop an enum value safely once it has been added.
