-- migrate:up

ALTER TABLE sales ADD COLUMN draft_request_id UUID;

CREATE UNIQUE INDEX sales_store_draft_request_id_key
    ON sales (organization_id, store_id, draft_request_id)
    WHERE draft_request_id IS NOT NULL;

-- migrate:down

DROP INDEX IF EXISTS sales_store_draft_request_id_key;
ALTER TABLE sales DROP COLUMN IF EXISTS draft_request_id;
