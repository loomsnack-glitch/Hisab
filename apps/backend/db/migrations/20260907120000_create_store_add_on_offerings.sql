-- migrate:up

CREATE TABLE store_add_on_offerings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    store_id UUID NOT NULL,
    add_on_id UUID NOT NULL,
    price_override NUMERIC(10, 2),
    discount_override NUMERIC(10, 2),
    price NUMERIC(10, 2) NOT NULL,
    discount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    status add_on_status_enum NOT NULL DEFAULT 'active',
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE (id, organization_id),
    UNIQUE (store_id, add_on_id),
    CONSTRAINT store_add_on_offerings_price_override_check
        CHECK (price_override IS NULL OR price_override >= 0),
    CONSTRAINT store_add_on_offerings_discount_override_check
        CHECK (discount_override IS NULL OR discount_override >= 0),
    CONSTRAINT store_add_on_offerings_price_check CHECK (price >= 0),
    CONSTRAINT store_add_on_offerings_discount_check CHECK (discount >= 0),
    FOREIGN KEY (store_id, organization_id) REFERENCES stores (id, organization_id) ON DELETE CASCADE,
    FOREIGN KEY (add_on_id, organization_id) REFERENCES add_ons (id, organization_id) ON DELETE CASCADE
);

CREATE INDEX idx_store_add_on_offerings_organization_store
    ON store_add_on_offerings (organization_id, store_id);
CREATE INDEX idx_store_add_on_offerings_organization_add_on
    ON store_add_on_offerings (organization_id, add_on_id);
CREATE INDEX idx_store_add_on_offerings_store_status
    ON store_add_on_offerings (store_id, status);

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
    'active',
    ao.created_by,
    ao.updated_by,
    NOW(),
    NOW()
FROM add_ons ao
INNER JOIN stores s
    ON s.organization_id = ao.organization_id;

-- migrate:down

DROP TABLE IF EXISTS store_add_on_offerings;
