-- migrate:up

CREATE TABLE store_product_offerings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    store_id UUID NOT NULL,
    product_id UUID NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    discount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    status product_status_enum NOT NULL DEFAULT 'active',
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE (id, organization_id),
    UNIQUE (store_id, product_id),
    CONSTRAINT store_product_offerings_price_check CHECK (price >= 0),
    CONSTRAINT store_product_offerings_discount_check CHECK (discount >= 0),
    FOREIGN KEY (store_id, organization_id) REFERENCES stores (id, organization_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id, organization_id) REFERENCES products (id, organization_id) ON DELETE CASCADE
);

CREATE INDEX idx_store_product_offerings_organization_store
    ON store_product_offerings (organization_id, store_id);
CREATE INDEX idx_store_product_offerings_organization_product
    ON store_product_offerings (organization_id, product_id);
CREATE INDEX idx_store_product_offerings_store_status
    ON store_product_offerings (store_id, status);

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
    p.status,
    p.created_by,
    p.updated_by,
    NOW(),
    NOW()
FROM products p
INNER JOIN stores s
    ON s.organization_id = p.organization_id;

-- migrate:down

DROP TABLE IF EXISTS store_product_offerings;
