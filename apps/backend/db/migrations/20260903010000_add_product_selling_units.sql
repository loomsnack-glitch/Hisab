-- migrate:up

INSERT INTO units (
    id,
    organization_id,
    name,
    label,
    kind,
    predefined_key,
    status,
    created_by
)
SELECT
    gen_random_uuid(),
    organizations.id,
    'piece',
    'pc',
    'predefined',
    'piece',
    'active',
    organizations.created_by
FROM organizations
WHERE NOT EXISTS (
    SELECT 1
    FROM units existing
    WHERE existing.organization_id = organizations.id
      AND existing.predefined_key = 'piece'
);

ALTER TABLE products
    ADD COLUMN unit_id UUID REFERENCES units(id) ON DELETE RESTRICT,
    ADD COLUMN default_selling_quantity NUMERIC(10, 2),
    ADD COLUMN allow_custom_selling_quantity BOOLEAN NOT NULL DEFAULT false;

UPDATE products
SET
    unit_id = piece_units.id,
    default_selling_quantity = 1,
    allow_custom_selling_quantity = false
FROM (
    SELECT id, organization_id
    FROM units
    WHERE predefined_key = 'piece'
) AS piece_units
WHERE products.organization_id = piece_units.organization_id
  AND products.unit_id IS NULL;

ALTER TABLE products
    ALTER COLUMN unit_id SET NOT NULL,
    ALTER COLUMN default_selling_quantity SET NOT NULL;

ALTER TABLE products
    ADD CONSTRAINT products_default_selling_quantity_positive
        CHECK (default_selling_quantity > 0);

ALTER TABLE products
    ADD CONSTRAINT products_unit_organization_fk
        FOREIGN KEY (unit_id, organization_id)
        REFERENCES units(id, organization_id);

CREATE INDEX idx_products_organization_unit_id
    ON products (organization_id, unit_id);

ALTER TABLE sale_items
    ALTER COLUMN product_name_snapshot TYPE VARCHAR(320),
    ADD COLUMN sold_quantity NUMERIC(10, 2),
    ADD COLUMN unit_id UUID REFERENCES units(id) ON DELETE RESTRICT,
    ADD COLUMN unit_label_snapshot VARCHAR(32);

UPDATE sale_items
SET
    sold_quantity = 1,
    unit_id = products.unit_id,
    unit_label_snapshot = units.label
FROM products
INNER JOIN units
    ON units.id = products.unit_id
   AND units.organization_id = products.organization_id
WHERE sale_items.product_id = products.id
  AND sale_items.organization_id = products.organization_id
  AND sale_items.sold_quantity IS NULL;

ALTER TABLE sale_items
    ALTER COLUMN sold_quantity SET NOT NULL,
    ALTER COLUMN unit_id SET NOT NULL,
    ALTER COLUMN unit_label_snapshot SET NOT NULL;

ALTER TABLE sale_items
    ADD CONSTRAINT sale_items_sold_quantity_positive
        CHECK (sold_quantity > 0);

ALTER TABLE sale_items
    ADD CONSTRAINT sale_items_unit_organization_fk
        FOREIGN KEY (unit_id, organization_id)
        REFERENCES units(id, organization_id);

ALTER TABLE kot_items
    ALTER COLUMN product_name_snapshot TYPE VARCHAR(320),
    ADD COLUMN sold_quantity NUMERIC(10, 2),
    ADD COLUMN unit_id UUID REFERENCES units(id) ON DELETE RESTRICT,
    ADD COLUMN unit_label_snapshot VARCHAR(32);

UPDATE kot_items
SET
    sold_quantity = 1,
    unit_id = products.unit_id,
    unit_label_snapshot = units.label
FROM products
INNER JOIN units
    ON units.id = products.unit_id
   AND units.organization_id = products.organization_id
WHERE kot_items.product_id = products.id
  AND kot_items.organization_id = products.organization_id
  AND kot_items.sold_quantity IS NULL;

ALTER TABLE kot_items
    ALTER COLUMN sold_quantity SET NOT NULL,
    ALTER COLUMN unit_id SET NOT NULL,
    ALTER COLUMN unit_label_snapshot SET NOT NULL;

ALTER TABLE kot_items
    ADD CONSTRAINT kot_items_sold_quantity_positive
        CHECK (sold_quantity > 0);

ALTER TABLE kot_items
    ADD CONSTRAINT kot_items_unit_organization_fk
        FOREIGN KEY (unit_id, organization_id)
        REFERENCES units(id, organization_id);

-- migrate:down

ALTER TABLE kot_items
    DROP CONSTRAINT IF EXISTS kot_items_unit_organization_fk,
    DROP CONSTRAINT IF EXISTS kot_items_sold_quantity_positive,
    DROP COLUMN IF EXISTS unit_label_snapshot,
    DROP COLUMN IF EXISTS unit_id,
    DROP COLUMN IF EXISTS sold_quantity,
    ALTER COLUMN product_name_snapshot TYPE VARCHAR(255);

ALTER TABLE sale_items
    DROP CONSTRAINT IF EXISTS sale_items_unit_organization_fk,
    DROP CONSTRAINT IF EXISTS sale_items_sold_quantity_positive,
    DROP COLUMN IF EXISTS unit_label_snapshot,
    DROP COLUMN IF EXISTS unit_id,
    DROP COLUMN IF EXISTS sold_quantity,
    ALTER COLUMN product_name_snapshot TYPE VARCHAR(255);

ALTER TABLE products
    DROP CONSTRAINT IF EXISTS products_unit_organization_fk,
    DROP CONSTRAINT IF EXISTS products_default_selling_quantity_positive,
    DROP COLUMN IF EXISTS allow_custom_selling_quantity,
    DROP COLUMN IF EXISTS default_selling_quantity,
    DROP COLUMN IF EXISTS unit_id;
