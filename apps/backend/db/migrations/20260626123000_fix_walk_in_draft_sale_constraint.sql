-- migrate:up

ALTER TABLE sales
    DROP CONSTRAINT IF EXISTS sales_walk_in_payment_check;

ALTER TABLE sales
    ADD CONSTRAINT sales_walk_in_payment_check CHECK (
        status = 'draft'
        OR customer_id IS NOT NULL
        OR payment_status = 'paid'
    );


-- migrate:down

ALTER TABLE sales
    DROP CONSTRAINT IF EXISTS sales_walk_in_payment_check;

ALTER TABLE sales
    ADD CONSTRAINT sales_walk_in_payment_check CHECK (
        customer_id IS NOT NULL
        OR payment_status = 'paid'
    );
