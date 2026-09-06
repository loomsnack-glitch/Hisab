-- migrate:up

ALTER TABLE store_product_offerings
    ADD COLUMN price_override NUMERIC(10, 2),
    ADD COLUMN discount_override NUMERIC(10, 2);

ALTER TABLE store_product_offerings
    ADD CONSTRAINT store_product_offerings_price_override_check
        CHECK (price_override IS NULL OR price_override >= 0),
    ADD CONSTRAINT store_product_offerings_discount_override_check
        CHECK (discount_override IS NULL OR discount_override >= 0);

UPDATE store_product_offerings o
SET
    price_override = CASE
        WHEN o.price IS DISTINCT FROM p.price THEN o.price
        ELSE NULL
    END,
    discount_override = CASE
        WHEN o.discount IS DISTINCT FROM p.discount THEN o.discount
        ELSE NULL
    END
FROM products p
WHERE p.id = o.product_id
  AND p.organization_id = o.organization_id;

-- migrate:down

ALTER TABLE store_product_offerings
    DROP CONSTRAINT IF EXISTS store_product_offerings_discount_override_check,
    DROP CONSTRAINT IF EXISTS store_product_offerings_price_override_check;

ALTER TABLE store_product_offerings
    DROP COLUMN IF EXISTS discount_override,
    DROP COLUMN IF EXISTS price_override;
