-- migrate:up

ALTER TABLE sales
    ADD COLUMN replacement_of_sale_id UUID;

ALTER TABLE sales
    ADD CONSTRAINT sales_replacement_of_sale_id_fkey
    FOREIGN KEY (replacement_of_sale_id, organization_id, store_id)
    REFERENCES sales(id, organization_id, store_id)
    ON DELETE RESTRICT;

ALTER TABLE sales
    ADD CONSTRAINT sales_replacement_not_self_check
    CHECK (replacement_of_sale_id IS NULL OR replacement_of_sale_id <> id);

CREATE UNIQUE INDEX idx_sales_replacement_of_sale_id
    ON sales (replacement_of_sale_id)
    WHERE replacement_of_sale_id IS NOT NULL;

ALTER TABLE sales DROP CONSTRAINT sales_void_metadata_check;

ALTER TABLE sales
    ADD CONSTRAINT sales_void_metadata_check CHECK (
        status <> 'voided'
        OR (voided_at IS NOT NULL AND void_reason IS NOT NULL)
    );

CREATE OR REPLACE FUNCTION prevent_voided_sale_with_payments()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'voided'
       AND OLD.status <> 'voided'
       AND EXISTS (
           SELECT 1
           FROM payments
           WHERE sale_id = NEW.id
       )
       AND NOT EXISTS (
           SELECT 1
           FROM sales replacement
           WHERE replacement.replacement_of_sale_id = NEW.id
             AND replacement.organization_id = NEW.organization_id
             AND replacement.store_id = NEW.store_id
       ) THEN
        RAISE EXCEPTION 'sales with collected payments can only be voided as a replacement';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- migrate:down

CREATE OR REPLACE FUNCTION prevent_voided_sale_with_payments()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'voided'
       AND OLD.status <> 'voided'
       AND EXISTS (
           SELECT 1
           FROM payments
           WHERE sale_id = NEW.id
       ) THEN
        RAISE EXCEPTION 'sales with collected payments cannot be voided';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE sales DROP CONSTRAINT sales_void_metadata_check;

ALTER TABLE sales
    ADD CONSTRAINT sales_void_metadata_check CHECK (
        status <> 'voided'
        OR (voided_at IS NOT NULL AND void_reason IS NOT NULL)
    );

-- Keep historical paid replacement voids valid after rollback. The restored
-- trigger still prevents creating new paid voids without a replacement.

DROP INDEX IF EXISTS idx_sales_replacement_of_sale_id;
ALTER TABLE sales DROP CONSTRAINT sales_replacement_not_self_check;
ALTER TABLE sales DROP CONSTRAINT sales_replacement_of_sale_id_fkey;
ALTER TABLE sales DROP COLUMN replacement_of_sale_id;
