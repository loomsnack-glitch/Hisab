-- migrate:up

CREATE TYPE product_code_kind_enum AS ENUM ('manufacturer', 'internal_rcn');

ALTER TABLE products
    ADD COLUMN product_code character varying(128),
    ADD COLUMN product_code_kind product_code_kind_enum;

ALTER TABLE products
    ADD CONSTRAINT products_product_code_kind_consistency_check CHECK (
        (product_code IS NULL AND product_code_kind IS NULL)
        OR (product_code IS NOT NULL AND product_code_kind IS NOT NULL)
    );

CREATE UNIQUE INDEX products_organization_id_product_code_key
    ON products (organization_id, product_code)
    WHERE product_code IS NOT NULL;

-- migrate:down

DROP INDEX IF EXISTS products_organization_id_product_code_key;

ALTER TABLE products
    DROP CONSTRAINT IF EXISTS products_product_code_kind_consistency_check;

ALTER TABLE products
    DROP COLUMN IF EXISTS product_code_kind,
    DROP COLUMN IF EXISTS product_code;

DROP TYPE IF EXISTS product_code_kind_enum;
