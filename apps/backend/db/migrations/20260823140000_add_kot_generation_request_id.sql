-- migrate:up

ALTER TABLE kots
    ADD COLUMN generation_request_id UUID;

CREATE UNIQUE INDEX kots_generation_request_key
    ON kots (organization_id, store_id, generation_request_id)
    WHERE generation_request_id IS NOT NULL;

-- migrate:down

DROP INDEX IF EXISTS kots_generation_request_key;

ALTER TABLE kots
    DROP COLUMN IF EXISTS generation_request_id;
