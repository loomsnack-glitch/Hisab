-- migrate:up

ALTER TABLE store_vendor_availabilities
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

ALTER TABLE store_vendor_availabilities
    DROP CONSTRAINT IF EXISTS store_vendor_availabilities_status_check;

ALTER TABLE store_vendor_availabilities
    ADD CONSTRAINT store_vendor_availabilities_status_check
    CHECK (status IN ('active', 'inactive'));

INSERT INTO store_vendor_availabilities (
    organization_id,
    store_id,
    vendor_id,
    status,
    created_by,
    updated_by,
    created_at,
    updated_at
)
SELECT
    v.organization_id,
    s.id,
    v.id,
    'inactive',
    v.created_by,
    v.updated_by,
    NOW(),
    NOW()
FROM vendors v
INNER JOIN stores s
    ON s.organization_id = v.organization_id
WHERE NOT EXISTS (
    SELECT 1
    FROM store_vendor_availabilities existing
    WHERE existing.store_id = s.id
      AND existing.vendor_id = v.id
);

INSERT INTO store_vendor_item_offerings (
    organization_id,
    store_id,
    vendor_id,
    vendor_item_id,
    default_purchase_price,
    created_by,
    updated_by,
    created_at,
    updated_at
)
SELECT
    vi.organization_id,
    s.id,
    vi.vendor_id,
    vi.id,
    vi.default_purchase_price,
    vi.created_by,
    vi.updated_by,
    NOW(),
    NOW()
FROM vendor_items vi
INNER JOIN stores s
    ON s.organization_id = vi.organization_id
INNER JOIN store_vendor_availabilities a
    ON a.store_id = s.id
   AND a.vendor_id = vi.vendor_id
WHERE NOT EXISTS (
    SELECT 1
    FROM store_vendor_item_offerings existing
    WHERE existing.store_id = s.id
      AND existing.vendor_item_id = vi.id
);

-- migrate:down

ALTER TABLE store_vendor_availabilities
    DROP CONSTRAINT IF EXISTS store_vendor_availabilities_status_check;

ALTER TABLE store_vendor_availabilities
    DROP COLUMN IF EXISTS status;
