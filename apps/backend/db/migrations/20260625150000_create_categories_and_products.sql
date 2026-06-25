-- migrate:up

CREATE TYPE category_status_enum AS ENUM ('active', 'inactive');

CREATE TYPE product_status_enum AS ENUM ('active', 'inactive');

-- Product categories scoped to an organization
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    status category_status_enum NOT NULL DEFAULT 'active',
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE (organization_id, name),
    UNIQUE (id, organization_id) -- Composite FK anchor for tenant-scoped child tables
);

-- Products belong to a category within an organization
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    category_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    discount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    image_path VARCHAR(512), -- S3/MinIO object key or path for the product image
    status product_status_enum NOT NULL DEFAULT 'active',
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE (organization_id, category_id, name),
    CONSTRAINT products_price_check CHECK (price >= 0),
    CONSTRAINT products_discount_check CHECK (discount >= 0),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id, organization_id) REFERENCES categories(id, organization_id) ON DELETE RESTRICT
);

CREATE INDEX idx_categories_organization_id ON categories(organization_id);
CREATE INDEX idx_categories_organization_status ON categories(organization_id, status);
CREATE INDEX idx_products_organization_id ON products(organization_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_organization_status ON products(organization_id, status);


-- migrate:down

DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;

DROP TYPE IF EXISTS product_status_enum;
DROP TYPE IF EXISTS category_status_enum;
