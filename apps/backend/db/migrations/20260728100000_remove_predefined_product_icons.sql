-- migrate:up

-- Null out existing icon: paths
UPDATE products SET image_path = NULL WHERE image_path LIKE 'icon:%';

-- Prevent new icon: values from being inserted
ALTER TABLE products ADD CONSTRAINT products_image_path_no_icons CHECK (image_path IS NULL OR image_path NOT LIKE 'icon:%');

-- migrate:down

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_image_path_no_icons;
