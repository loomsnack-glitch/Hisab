-- migrate:up

ALTER TYPE money_account_type_enum ADD VALUE IF NOT EXISTS 'cash';

-- migrate:down

-- PostgreSQL cannot drop an enum value safely once it has been added.
