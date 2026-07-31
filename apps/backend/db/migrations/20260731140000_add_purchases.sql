-- migrate:up
CREATE TYPE purchase_status_enum AS ENUM ('recorded', 'voided');

CREATE TABLE purchases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL,
    store_id uuid NOT NULL,
    purchase_date date NOT NULL,
    supplier_name varchar(255) NOT NULL,
    invoice_number varchar(255),
    notes text,
    total_amount numeric(12, 2) NOT NULL DEFAULT 0,
    status purchase_status_enum NOT NULL DEFAULT 'recorded',
    created_by_user_id uuid,
    created_by_device_id uuid,
    updated_by_user_id uuid,
    updated_by_device_id uuid,
    voided_at timestamptz,
    void_reason text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT purchases_total_amount_check CHECK (total_amount >= 0),
    CONSTRAINT purchases_void_metadata_check CHECK (
        (status = 'recorded' AND voided_at IS NULL AND void_reason IS NULL)
        OR (status = 'voided' AND voided_at IS NOT NULL AND void_reason IS NOT NULL)
    )
);

CREATE TABLE purchase_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id uuid NOT NULL,
    item_name varchar(255) NOT NULL,
    description text,
    quantity numeric(14, 3) NOT NULL,
    rate numeric(12, 2) NOT NULL,
    line_total numeric(12, 2) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT purchase_items_quantity_check CHECK (quantity > 0),
    CONSTRAINT purchase_items_rate_check CHECK (rate >= 0),
    CONSTRAINT purchase_items_line_total_check CHECK (line_total >= 0)
);

ALTER TABLE purchases
    ADD CONSTRAINT purchases_organization_id_fkey FOREIGN KEY (organization_id)
        REFERENCES organizations(id) ON DELETE CASCADE,
    ADD CONSTRAINT purchases_store_id_organization_id_fkey FOREIGN KEY (store_id, organization_id)
        REFERENCES stores(id, organization_id) ON DELETE CASCADE,
    ADD CONSTRAINT purchases_created_by_user_id_fkey FOREIGN KEY (created_by_user_id)
        REFERENCES users(id) ON DELETE SET NULL,
    ADD CONSTRAINT purchases_created_by_device_id_organization_id_store_id_fkey FOREIGN KEY (created_by_device_id, organization_id, store_id)
        REFERENCES store_devices(id, organization_id, store_id) ON DELETE RESTRICT,
    ADD CONSTRAINT purchases_updated_by_user_id_fkey FOREIGN KEY (updated_by_user_id)
        REFERENCES users(id) ON DELETE SET NULL,
    ADD CONSTRAINT purchases_updated_by_device_id_organization_id_store_id_fkey FOREIGN KEY (updated_by_device_id, organization_id, store_id)
        REFERENCES store_devices(id, organization_id, store_id) ON DELETE RESTRICT;

ALTER TABLE purchase_items
    ADD CONSTRAINT purchase_items_purchase_id_fkey FOREIGN KEY (purchase_id)
        REFERENCES purchases(id) ON DELETE CASCADE;

CREATE INDEX idx_purchases_store_purchase_date ON purchases (store_id, purchase_date DESC);
CREATE INDEX idx_purchases_store_status ON purchases (store_id, status);
CREATE INDEX idx_purchases_supplier_name ON purchases (organization_id, supplier_name);
CREATE INDEX idx_purchase_items_purchase_id ON purchase_items (purchase_id);

-- migrate:down
DROP TABLE purchase_items;
DROP TABLE purchases;
DROP TYPE purchase_status_enum;
