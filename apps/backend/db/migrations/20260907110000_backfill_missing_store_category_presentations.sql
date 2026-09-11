-- migrate:up

INSERT INTO store_category_presentations (
    organization_id,
    store_id,
    category_id,
    visible,
    sort_order,
    created_by,
    updated_by,
    created_at,
    updated_at
)
SELECT
    c.organization_id,
    s.id,
    c.id,
    TRUE,
    c.sort_order,
    c.created_by,
    NULL,
    NOW(),
    NOW()
FROM categories c
INNER JOIN stores s
    ON s.organization_id = c.organization_id
WHERE NOT EXISTS (
    SELECT 1
    FROM store_category_presentations p
    WHERE p.store_id = s.id
      AND p.category_id = c.id
);

-- migrate:down

SELECT 1;
