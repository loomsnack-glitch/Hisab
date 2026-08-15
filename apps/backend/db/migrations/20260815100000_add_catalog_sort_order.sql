-- migrate:up

ALTER TABLE categories
    ADD COLUMN sort_order integer NOT NULL DEFAULT 0,
    ADD CONSTRAINT categories_sort_order_check CHECK (sort_order >= 0);

ALTER TABLE products
    ADD COLUMN sort_order integer NOT NULL DEFAULT 0,
    ADD CONSTRAINT products_sort_order_check CHECK (sort_order >= 0);

WITH ranked_categories AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY organization_id
            ORDER BY created_at ASC, id ASC
        ) - 1 AS next_sort_order
    FROM categories
)
UPDATE categories AS category
SET sort_order = ranked.next_sort_order
FROM ranked_categories AS ranked
WHERE category.id = ranked.id;

WITH ranked_products AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY organization_id, category_id
            ORDER BY created_at ASC, id ASC
        ) - 1 AS next_sort_order
    FROM products
)
UPDATE products AS product
SET sort_order = ranked.next_sort_order
FROM ranked_products AS ranked
WHERE product.id = ranked.id;

CREATE INDEX idx_categories_organization_sort_order
    ON categories (organization_id, sort_order, id);

CREATE INDEX idx_products_organization_category_sort_order
    ON products (organization_id, category_id, sort_order, id);

-- migrate:down

DROP INDEX IF EXISTS idx_products_organization_category_sort_order;
DROP INDEX IF EXISTS idx_categories_organization_sort_order;

ALTER TABLE products
    DROP CONSTRAINT IF EXISTS products_sort_order_check,
    DROP COLUMN IF EXISTS sort_order;

ALTER TABLE categories
    DROP CONSTRAINT IF EXISTS categories_sort_order_check,
    DROP COLUMN IF EXISTS sort_order;
