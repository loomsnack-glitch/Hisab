-- migrate:up

ALTER TABLE sales
    ADD COLUMN customer_name_snapshot VARCHAR(255),
    ADD COLUMN customer_phone_snapshot VARCHAR(20);

UPDATE sales s
SET customer_name_snapshot = c.name,
    customer_phone_snapshot = c.phone
FROM customers c
WHERE s.customer_id = c.id
  AND s.organization_id = c.organization_id
  AND s.customer_name_snapshot IS NULL;

-- migrate:down

ALTER TABLE sales
    DROP COLUMN IF EXISTS customer_name_snapshot,
    DROP COLUMN IF EXISTS customer_phone_snapshot;
