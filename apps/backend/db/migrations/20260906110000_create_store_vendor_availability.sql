-- migrate:up

CREATE TABLE store_vendor_availabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    store_id UUID NOT NULL,
    vendor_id UUID NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE (id, organization_id),
    UNIQUE (store_id, vendor_id),
    FOREIGN KEY (store_id, organization_id) REFERENCES stores (id, organization_id) ON DELETE CASCADE,
    FOREIGN KEY (vendor_id, organization_id) REFERENCES vendors (id, organization_id) ON DELETE CASCADE
);

CREATE INDEX idx_store_vendor_availabilities_organization_store
    ON store_vendor_availabilities (organization_id, store_id);
CREATE INDEX idx_store_vendor_availabilities_organization_vendor
    ON store_vendor_availabilities (organization_id, vendor_id);

CREATE TABLE store_vendor_item_offerings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    store_id UUID NOT NULL,
    vendor_id UUID NOT NULL,
    vendor_item_id UUID NOT NULL,
    default_purchase_price NUMERIC(10, 2) NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE (id, organization_id),
    UNIQUE (store_id, vendor_item_id),
    CONSTRAINT store_vendor_item_offerings_price_non_negative CHECK (default_purchase_price >= 0),
    FOREIGN KEY (store_id, organization_id) REFERENCES stores (id, organization_id) ON DELETE CASCADE,
    FOREIGN KEY (vendor_id, organization_id) REFERENCES vendors (id, organization_id) ON DELETE CASCADE,
    FOREIGN KEY (vendor_item_id, organization_id) REFERENCES vendor_items (id, organization_id) ON DELETE CASCADE,
    FOREIGN KEY (store_id, vendor_id) REFERENCES store_vendor_availabilities (store_id, vendor_id) ON DELETE CASCADE
);

CREATE INDEX idx_store_vendor_item_offerings_organization_store
    ON store_vendor_item_offerings (organization_id, store_id);
CREATE INDEX idx_store_vendor_item_offerings_organization_vendor_item
    ON store_vendor_item_offerings (organization_id, vendor_item_id);

INSERT INTO store_vendor_availabilities (
    organization_id,
    store_id,
    vendor_id,
    created_by,
    updated_by,
    created_at,
    updated_at
)
SELECT
    v.organization_id,
    s.id,
    v.id,
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
WHERE NOT EXISTS (
    SELECT 1
    FROM store_vendor_item_offerings existing
    WHERE existing.store_id = s.id
      AND existing.vendor_item_id = vi.id
);

-- migrate:down

DROP TABLE IF EXISTS store_vendor_item_offerings;
DROP TABLE IF EXISTS store_vendor_availabilities;
