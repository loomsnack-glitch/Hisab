-- migrate:up
UPDATE add_ons
SET discount = price
WHERE discount > price;

ALTER TABLE add_ons
    ADD CONSTRAINT add_ons_discount_not_above_price_check CHECK (discount <= price);

-- migrate:down
ALTER TABLE add_ons
    DROP CONSTRAINT IF EXISTS add_ons_discount_not_above_price_check;
