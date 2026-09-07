-- migrate:up

-- This follows the commercial-operation audit migration and therefore uses
-- its own later migration version.

ALTER TABLE store_product_offerings
    DROP CONSTRAINT IF EXISTS store_product_offerings_price_check,
    DROP CONSTRAINT IF EXISTS store_product_offerings_discount_check,
    DROP COLUMN IF EXISTS price,
    DROP COLUMN IF EXISTS discount;

ALTER TABLE store_add_on_offerings
    DROP CONSTRAINT IF EXISTS store_add_on_offerings_price_check,
    DROP CONSTRAINT IF EXISTS store_add_on_offerings_discount_check,
    DROP COLUMN IF EXISTS price,
    DROP COLUMN IF EXISTS discount;

-- migrate:down

ALTER TABLE store_product_offerings
    ADD COLUMN price NUMERIC(10, 2),
    ADD COLUMN discount NUMERIC(10, 2);

UPDATE store_product_offerings AS offering
SET price = COALESCE(offering.price_override, product.price),
    discount = COALESCE(offering.discount_override, product.discount)
FROM products AS product
WHERE product.id = offering.product_id
  AND product.organization_id = offering.organization_id;

ALTER TABLE store_product_offerings
    ALTER COLUMN price SET NOT NULL,
    ALTER COLUMN discount SET NOT NULL,
    ADD CONSTRAINT store_product_offerings_price_check CHECK (price >= 0),
    ADD CONSTRAINT store_product_offerings_discount_check CHECK (discount >= 0 AND discount <= price);

ALTER TABLE store_add_on_offerings
    ADD COLUMN price NUMERIC(10, 2),
    ADD COLUMN discount NUMERIC(10, 2);

UPDATE store_add_on_offerings AS offering
SET price = COALESCE(offering.price_override, add_on.price),
    discount = COALESCE(offering.discount_override, add_on.discount)
FROM add_ons AS add_on
WHERE add_on.id = offering.add_on_id
  AND add_on.organization_id = offering.organization_id;

ALTER TABLE store_add_on_offerings
    ALTER COLUMN price SET NOT NULL,
    ALTER COLUMN discount SET NOT NULL,
    ADD CONSTRAINT store_add_on_offerings_price_check CHECK (price >= 0),
    ADD CONSTRAINT store_add_on_offerings_discount_check CHECK (discount >= 0 AND discount <= price);
