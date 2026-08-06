-- migrate:up

ALTER TABLE organizations
    ADD COLUMN tagline VARCHAR(255);

-- migrate:down

ALTER TABLE organizations
    DROP COLUMN tagline;
