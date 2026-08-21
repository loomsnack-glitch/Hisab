-- migrate:up

-- Plain bill numbers (1, 2, 3…) reset each financial year, so uniqueness must be
-- scoped by sale_period_key rather than sale_number alone.
ALTER TABLE sales
    DROP CONSTRAINT IF EXISTS sales_store_id_sale_number_key;

CREATE UNIQUE INDEX sales_store_sale_period_sequence_key
    ON sales (store_id, sale_period_key, sale_sequence_number)
    WHERE sale_period_key IS NOT NULL AND sale_sequence_number IS NOT NULL;

-- Keep each Store period sequence at or above the highest committed Sale for that period.
INSERT INTO store_sale_sequences (store_id, organization_id, period_key, next_sequence_number)
SELECT
    store_id,
    organization_id,
    sale_period_key,
    MAX(sale_sequence_number) + 1
FROM sales
WHERE sale_period_key IS NOT NULL
  AND sale_sequence_number IS NOT NULL
GROUP BY store_id, organization_id, sale_period_key
ON CONFLICT (store_id, period_key)
DO UPDATE SET
    next_sequence_number = GREATEST(
        store_sale_sequences.next_sequence_number,
        EXCLUDED.next_sequence_number
    ),
    updated_at = NOW();

-- migrate:down

DROP INDEX IF EXISTS sales_store_sale_period_sequence_key;

ALTER TABLE sales
    ADD CONSTRAINT sales_store_id_sale_number_key UNIQUE (store_id, sale_number);
