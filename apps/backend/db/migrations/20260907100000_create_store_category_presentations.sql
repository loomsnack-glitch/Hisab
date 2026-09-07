-- migrate:up

CREATE TABLE store_category_presentations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    store_id UUID NOT NULL,
    category_id UUID NOT NULL,
    visible BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE (id, organization_id),
    UNIQUE (store_id, category_id),
    CONSTRAINT store_category_presentations_sort_order_check CHECK (sort_order >= 0),
    FOREIGN KEY (store_id, organization_id) REFERENCES stores (id, organization_id) ON DELETE CASCADE,
    FOREIGN KEY (category_id, organization_id) REFERENCES categories (id, organization_id) ON DELETE CASCADE
);

CREATE INDEX idx_store_category_presentations_organization_store
    ON store_category_presentations (organization_id, store_id);
CREATE INDEX idx_store_category_presentations_organization_category
    ON store_category_presentations (organization_id, category_id);
CREATE INDEX idx_store_category_presentations_store_visible_sort
    ON store_category_presentations (store_id, visible, sort_order, id);

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
    ON s.organization_id = c.organization_id;

-- migrate:down

DROP TABLE IF EXISTS store_category_presentations;
