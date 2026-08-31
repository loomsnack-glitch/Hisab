-- migrate:up

UPDATE purchase_lines AS pl
SET
    quantity = grouped.merged_quantity,
    line_total = ROUND(grouped.merged_quantity * pl.agreed_unit_price, 2),
    updated_at = NOW()
FROM (
    SELECT
        purchase_id,
        vendor_item_id,
        agreed_unit_price,
        MIN(position) AS keep_position,
        SUM(quantity) AS merged_quantity
    FROM purchase_lines
    GROUP BY purchase_id, vendor_item_id, agreed_unit_price
    HAVING COUNT(*) > 1
) AS grouped
WHERE pl.purchase_id = grouped.purchase_id
  AND pl.vendor_item_id = grouped.vendor_item_id
  AND pl.agreed_unit_price = grouped.agreed_unit_price
  AND pl.position = grouped.keep_position;

DELETE FROM purchase_lines AS pl
USING (
    SELECT
        purchase_id,
        vendor_item_id,
        agreed_unit_price,
        MIN(position) AS keep_position
    FROM purchase_lines
    GROUP BY purchase_id, vendor_item_id, agreed_unit_price
    HAVING COUNT(*) > 1
) AS grouped
WHERE pl.purchase_id = grouped.purchase_id
  AND pl.vendor_item_id = grouped.vendor_item_id
  AND pl.agreed_unit_price = grouped.agreed_unit_price
  AND pl.position <> grouped.keep_position;

ALTER TABLE purchase_lines
    ADD CONSTRAINT purchase_lines_unique_item_price_per_purchase
    UNIQUE (purchase_id, vendor_item_id, agreed_unit_price);

-- migrate:down

ALTER TABLE purchase_lines
    DROP CONSTRAINT IF EXISTS purchase_lines_unique_item_price_per_purchase;
