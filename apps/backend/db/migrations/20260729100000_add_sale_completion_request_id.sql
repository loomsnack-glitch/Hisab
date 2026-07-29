-- migrate:up

ALTER TABLE sales ADD COLUMN completion_request_id uuid;

CREATE UNIQUE INDEX sales_store_completion_request_id_key
    ON sales (store_id, completion_request_id)
    WHERE completion_request_id IS NOT NULL;

-- migrate:down

DROP INDEX IF EXISTS sales_store_completion_request_id_key;
ALTER TABLE sales DROP COLUMN IF EXISTS completion_request_id;
