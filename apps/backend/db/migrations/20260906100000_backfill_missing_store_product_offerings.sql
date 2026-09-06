-- migrate:up

INSERT INTO store_product_offerings (
    organization_id,
    store_id,
    product_id,
    price,
    discount,
    status,
    created_by,
    updated_by,
    created_at,
    updated_at
)
SELECT
    p.organization_id,
    s.id,
    p.id,
    p.price,
    p.discount,
    'inactive',
    p.created_by,
    NULL,
    NOW(),
    NOW()
FROM products p
INNER JOIN stores s
    ON s.organization_id = p.organization_id
WHERE NOT EXISTS (
    SELECT 1
    FROM store_product_offerings o
    WHERE o.store_id = s.id
      AND o.product_id = p.id
);

-- migrate:down

SELECT 1;
