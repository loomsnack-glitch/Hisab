-- migrate:up

CREATE TABLE product_label_profiles (
    product_id UUID PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL,
    ingredients TEXT,
    nutrition JSONB,
    net_weight VARCHAR(128),
    unit_selling_price_text VARCHAR(255),
    mrp NUMERIC(10, 2),
    shelf_life_days INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT product_label_profiles_mrp_check CHECK (mrp IS NULL OR mrp >= 0),
    CONSTRAINT product_label_profiles_shelf_life_days_check CHECK (
        shelf_life_days IS NULL OR shelf_life_days >= 1
    ),
    FOREIGN KEY (product_id, organization_id) REFERENCES products(id, organization_id) ON DELETE CASCADE
);

CREATE INDEX idx_product_label_profiles_organization_id
    ON product_label_profiles(organization_id);

-- migrate:down

DROP TABLE IF EXISTS product_label_profiles;
