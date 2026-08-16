-- migrate:up

ALTER TABLE sales
    DROP CONSTRAINT IF EXISTS sales_receivable_customer_check,
    DROP CONSTRAINT IF EXISTS sales_walk_in_payment_check;

-- migrate:down

ALTER TABLE sales
    ADD CONSTRAINT sales_receivable_customer_check CHECK (
        status = 'draft'
        OR payment_status = 'paid'
        OR customer_id IS NOT NULL
    ),
    ADD CONSTRAINT sales_walk_in_payment_check CHECK (
        status = 'draft'
        OR customer_id IS NOT NULL
        OR payment_status = 'paid'
    );
