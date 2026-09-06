-- migrate:up

INSERT INTO store_add_on_offerings (
    organization_id,
    store_id,
    add_on_id,
    price_override,
    discount_override,
    price,
    discount,
    status,
    created_by,
    updated_by,
    created_at,
    updated_at
)
SELECT
    ao.organization_id,
    s.id,
    ao.id,
    NULL,
    NULL,
    ao.price,
    ao.discount,
    'inactive',
    ao.created_by,
    NULL,
    NOW(),
    NOW()
FROM add_ons ao
INNER JOIN stores s
    ON s.organization_id = ao.organization_id
WHERE NOT EXISTS (
    SELECT 1
    FROM store_add_on_offerings o
    WHERE o.store_id = s.id
      AND o.add_on_id = ao.id
);

-- migrate:down

SELECT 1;
