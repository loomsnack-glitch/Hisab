-- migrate:up

CREATE TYPE sale_status_enum AS ENUM ('draft', 'completed', 'voided');

CREATE TYPE payment_status_enum AS ENUM ('pending', 'partial', 'paid');

CREATE TYPE payment_method_enum AS ENUM ('cash', 'upi', 'card', 'bank_transfer', 'other');

CREATE TYPE customer_ledger_entry_type_enum AS ENUM ('sale', 'payment', 'void', 'adjustment');

ALTER TABLE products
    ADD CONSTRAINT products_id_organization_id_key UNIQUE (id, organization_id);

CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT customers_balance_check CHECK (balance >= 0),
    UNIQUE (organization_id, phone),
    UNIQUE (id, organization_id)
);

CREATE TABLE store_sale_counters (
    store_id UUID PRIMARY KEY,
    organization_id UUID NOT NULL,
    next_sale_number BIGINT NOT NULL DEFAULT 1,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT store_sale_counters_next_sale_number_check CHECK (next_sale_number > 0),
    FOREIGN KEY (store_id, organization_id) REFERENCES stores(id, organization_id) ON DELETE CASCADE
);

CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    store_id UUID NOT NULL,
    sale_number BIGINT,
    customer_id UUID,
    user_id UUID NOT NULL REFERENCES users(id),
    status sale_status_enum NOT NULL DEFAULT 'draft',
    payment_status payment_status_enum NOT NULL DEFAULT 'pending',
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
    discount_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    grand_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    committed_at TIMESTAMP WITH TIME ZONE,
    voided_at TIMESTAMP WITH TIME ZONE,
    void_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (store_id, sale_number),
    UNIQUE (id, organization_id, store_id),
    CONSTRAINT sales_subtotal_check CHECK (subtotal >= 0),
    CONSTRAINT sales_discount_total_check CHECK (discount_total >= 0 AND discount_total <= subtotal),
    CONSTRAINT sales_grand_total_check CHECK (grand_total >= 0 AND grand_total = subtotal - discount_total),
    CONSTRAINT sales_draft_sale_number_check CHECK (
        (status = 'draft' AND sale_number IS NULL)
        OR (status <> 'draft' AND sale_number IS NOT NULL)
    ),
    CONSTRAINT sales_draft_commit_check CHECK (
        (status = 'draft' AND committed_at IS NULL AND payment_status = 'pending')
        OR (status <> 'draft' AND committed_at IS NOT NULL)
    ),
    CONSTRAINT sales_receivable_customer_check CHECK (
        status = 'draft'
        OR payment_status = 'paid'
        OR customer_id IS NOT NULL
    ),
    CONSTRAINT sales_walk_in_payment_check CHECK (
        status = 'draft'
        OR customer_id IS NOT NULL
        OR payment_status = 'paid'
    ),
    CONSTRAINT sales_void_metadata_check CHECK (
        status <> 'voided'
        OR (
            payment_status = 'pending'
            AND voided_at IS NOT NULL
            AND void_reason IS NOT NULL
        )
    ),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (store_id, organization_id) REFERENCES stores(id, organization_id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id, organization_id) REFERENCES customers(id, organization_id) ON DELETE RESTRICT
);

CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    store_id UUID NOT NULL,
    sale_id UUID NOT NULL,
    product_id UUID NOT NULL,
    quantity NUMERIC(10, 3) NOT NULL,
    product_name_snapshot VARCHAR(255) NOT NULL,
    unit_price_snapshot NUMERIC(10, 2) NOT NULL,
    discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    line_subtotal NUMERIC(12, 2) NOT NULL,
    line_total NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT sale_items_quantity_check CHECK (quantity > 0),
    CONSTRAINT sale_items_unit_price_snapshot_check CHECK (unit_price_snapshot >= 0),
    CONSTRAINT sale_items_discount_amount_check CHECK (discount_amount >= 0 AND discount_amount <= line_subtotal),
    CONSTRAINT sale_items_line_subtotal_check CHECK (line_subtotal >= 0),
    CONSTRAINT sale_items_line_total_check CHECK (line_total >= 0 AND line_total = line_subtotal - discount_amount),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (store_id, organization_id) REFERENCES stores(id, organization_id) ON DELETE CASCADE,
    FOREIGN KEY (sale_id, organization_id, store_id) REFERENCES sales(id, organization_id, store_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id, organization_id) REFERENCES products(id, organization_id) ON DELETE RESTRICT
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    store_id UUID NOT NULL,
    sale_id UUID NOT NULL,
    collected_by UUID NOT NULL REFERENCES users(id),
    amount NUMERIC(12, 2) NOT NULL,
    method payment_method_enum NOT NULL,
    reference_number VARCHAR(255),
    notes TEXT,
    collected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT payments_amount_check CHECK (amount > 0),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (store_id, organization_id) REFERENCES stores(id, organization_id) ON DELETE CASCADE,
    FOREIGN KEY (sale_id, organization_id, store_id) REFERENCES sales(id, organization_id, store_id) ON DELETE RESTRICT
);

CREATE TABLE customer_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    sale_id UUID,
    payment_id UUID,
    entry_type customer_ledger_entry_type_enum NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    balance_after NUMERIC(12, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT customer_ledger_amount_check CHECK (amount <> 0),
    CONSTRAINT customer_ledger_balance_after_check CHECK (balance_after >= 0),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id, organization_id) REFERENCES customers(id, organization_id) ON DELETE CASCADE,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE RESTRICT,
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE RESTRICT
);

CREATE INDEX idx_customers_organization_phone ON customers(organization_id, phone);
CREATE INDEX idx_customers_organization_active ON customers(organization_id, is_active);

CREATE INDEX idx_sales_organization_created_at ON sales(organization_id, created_at);
CREATE INDEX idx_sales_store_sale_number ON sales(store_id, sale_number);
CREATE INDEX idx_sales_customer_id ON sales(customer_id);
CREATE INDEX idx_sales_status ON sales(organization_id, status, payment_status);

CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product_id ON sale_items(product_id);

CREATE INDEX idx_payments_sale_id ON payments(sale_id);
CREATE INDEX idx_payments_organization_created_at ON payments(organization_id, created_at);

CREATE INDEX idx_customer_ledger_customer_created_at ON customer_ledger(customer_id, created_at DESC);

CREATE OR REPLACE FUNCTION ensure_payment_sale_is_completed()
RETURNS TRIGGER AS $$
DECLARE
    sale_row RECORD;
BEGIN
    SELECT id, status
    INTO sale_row
    FROM sales
    WHERE id = NEW.sale_id
      AND organization_id = NEW.organization_id
      AND store_id = NEW.store_id;

    IF sale_row.id IS NULL THEN
        RAISE EXCEPTION 'payment sale does not exist in the same organization/store';
    END IF;

    IF sale_row.status <> 'completed' THEN
        RAISE EXCEPTION 'payments can only be collected against completed sales';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_payments_require_completed_sale
    BEFORE INSERT OR UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION ensure_payment_sale_is_completed();

CREATE OR REPLACE FUNCTION prevent_voided_sale_with_payments()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'voided'
       AND OLD.status <> 'voided'
       AND EXISTS (
           SELECT 1
           FROM payments
           WHERE sale_id = NEW.id
       ) THEN
        RAISE EXCEPTION 'sales with collected payments cannot be voided';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sales_prevent_void_with_payments
    BEFORE UPDATE ON sales
    FOR EACH ROW
    EXECUTE FUNCTION prevent_voided_sale_with_payments();


-- migrate:down

DROP TRIGGER IF EXISTS trg_sales_prevent_void_with_payments ON sales;
DROP FUNCTION IF EXISTS prevent_voided_sale_with_payments();

DROP TRIGGER IF EXISTS trg_payments_require_completed_sale ON payments;
DROP FUNCTION IF EXISTS ensure_payment_sale_is_completed();

DROP TABLE IF EXISTS customer_ledger;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS sale_items;
DROP TABLE IF EXISTS sales;
DROP TABLE IF EXISTS store_sale_counters;
DROP TABLE IF EXISTS customers;

ALTER TABLE products
    DROP CONSTRAINT IF EXISTS products_id_organization_id_key;

DROP TYPE IF EXISTS customer_ledger_entry_type_enum;
DROP TYPE IF EXISTS payment_method_enum;
DROP TYPE IF EXISTS payment_status_enum;
DROP TYPE IF EXISTS sale_status_enum;
