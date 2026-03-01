-- migrate:up

-- 1. Organizations (Multi-tenant root)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Stores (Branches under an organization)
CREATE TABLE stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (id, organization_id) -- Needed for composite foreign keys to guarantee tenant integrity
);

-- 2.1 Store Counters (Safe Invoice Number Generation)
CREATE TABLE store_counters (
    store_id UUID PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
    sale_counter BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Users (Staff / Admins)
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'cashier');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    store_id UUID, 
    role user_role NOT NULL DEFAULT 'cashier',
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    pin_hash VARCHAR(255), -- For fast POS login
    password_hash VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (store_id, organization_id) REFERENCES stores(id, organization_id) ON DELETE SET NULL, -- Nullable for HQ staff, strict tenant enforcement
    UNIQUE (organization_id, email),
    UNIQUE (organization_id, phone)
);

-- 3.1 User Stores (For Admins/Managers Managing Multiple Stores)
CREATE TABLE user_stores (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, store_id),
    FOREIGN KEY (store_id, organization_id) REFERENCES stores(id, organization_id)
);

-- 4. Customers (CRM & Loyalty)
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    phone VARCHAR(20) NOT NULL,
    name VARCHAR(255),
    loyalty_points INTEGER DEFAULT 0,
    balance DECIMAL(12, 2) NOT NULL DEFAULT 0.00, -- Current Udhaar/Credit balance
    is_active BOOLEAN NOT NULL DEFAULT true, -- For deactivating customers without deleting history
    sync_id UUID DEFAULT gen_random_uuid(), -- For offline sync
    sync_version INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (organization_id, phone),
    UNIQUE (organization_id, sync_id)
);

-- Indexes for Customer search and sync
CREATE INDEX idx_customers_org_phone ON customers(organization_id, phone);
CREATE INDEX idx_customers_updated_at ON customers(updated_at);

-- 4.1 Customer Ledger (Udhaar/Credit Management)
CREATE TYPE ledger_entry_type AS ENUM ('sale', 'payment', 'adjustment', 'refund');

CREATE TABLE customer_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    type ledger_entry_type NOT NULL,
    amount DECIMAL(12, 2) NOT NULL, -- Positive for debt, negative for payment
    balance_after DECIMAL(12, 2) NOT NULL,
    reference_type VARCHAR(50), -- 'sale', 'payment'
    reference_id UUID,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ledger_customer_created ON customer_ledger(customer_id, created_at DESC);

-- 5. Categories
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Products (Fast POS Catalog with current_stock)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    store_id UUID,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    barcode VARCHAR(255) NOT NULL,
    sku VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0), -- Selling price
    cost_price DECIMAL(10, 2) CHECK (cost_price >= 0), -- Purchasing cost
    tax_rate DECIMAL(5, 2) NOT NULL DEFAULT 0.00 CHECK (tax_rate >= 0 AND tax_rate <= 100), -- Percentage (e.g., 18.00 for 18% GST)
    current_stock DECIMAL(10, 3) NOT NULL DEFAULT 0.000, -- Fast read (Option A)
    low_stock_threshold DECIMAL(10, 3) NOT NULL DEFAULT 0.000,
    is_active BOOLEAN NOT NULL DEFAULT true, -- For deactivating items without deleting
    sync_id UUID DEFAULT gen_random_uuid(), -- For offline sync
    sync_version INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (store_id, organization_id) REFERENCES stores(id, organization_id) ON DELETE CASCADE, -- Optional for branch-specific variants
    UNIQUE (organization_id, barcode),
    UNIQUE (organization_id, sku),
    UNIQUE (organization_id, sync_id)
);

-- Indexes for fast Barcode/SKU scanning and sync
CREATE INDEX idx_products_org_barcode ON products(organization_id, barcode);
CREATE INDEX idx_products_store_active ON products(store_id, is_active);
CREATE INDEX idx_products_store_created ON products(store_id, created_at);
CREATE INDEX idx_products_updated_at ON products(updated_at);

-- 7. Inventory Transactions (Immutable Ledger)
CREATE TYPE inventory_transaction_type AS ENUM ('in', 'out', 'adjustment');
CREATE TYPE inventory_reference_type AS ENUM ('purchase', 'sale', 'manual', 'return');

CREATE TABLE inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    store_id UUID NOT NULL,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    type inventory_transaction_type NOT NULL,
    quantity DECIMAL(10, 3) NOT NULL CHECK (quantity <> 0), -- Positive or negative, but useless if 0
    reference_type inventory_reference_type NOT NULL,
    reference_id UUID, -- Can link to a sale_id or purchase_order_id
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (store_id, organization_id) REFERENCES stores(id, organization_id) ON DELETE CASCADE
);

CREATE INDEX idx_inventory_txn_product ON inventory_transactions(product_id);
CREATE INDEX idx_inventory_txn_product_store ON inventory_transactions(product_id, store_id);
CREATE INDEX idx_inventory_txn_org_store_created ON inventory_transactions(organization_id, store_id, created_at);

-- 8. Cash Register Sessions (Shift Tracking)
CREATE TYPE session_status AS ENUM ('open', 'closed', 'discrepancy');

CREATE TABLE cash_register_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    store_id UUID NOT NULL,
    opened_by UUID NOT NULL REFERENCES users(id),
    closed_by UUID REFERENCES users(id),
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    closed_at TIMESTAMP WITH TIME ZONE,
    opening_balance DECIMAL(12, 2) NOT NULL DEFAULT 0.00 CHECK (opening_balance >= 0),
    closing_balance DECIMAL(12, 2) CHECK (closing_balance >= 0), -- Actual cash counted
    expected_balance DECIMAL(12, 2) CHECK (expected_balance >= 0), -- Computed by system
    status session_status NOT NULL DEFAULT 'open',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (store_id, organization_id) REFERENCES stores(id, organization_id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_store_opened ON cash_register_sessions(store_id, opened_at);

-- 9. Sales (Invoices with Pre-aggregated Totals)
CREATE TYPE sale_status AS ENUM ('draft', 'completed', 'voided', 'refunded');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'partial');

CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_number BIGINT NOT NULL, -- Human readable invoice number per store
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    store_id UUID NOT NULL,
    session_id UUID REFERENCES cash_register_sessions(id), -- Nullable if not using shifts yet
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES users(id), -- Cashier who made the sale
    status sale_status NOT NULL DEFAULT 'draft',
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
    tax_total DECIMAL(12, 2) NOT NULL DEFAULT 0.00 CHECK (tax_total >= 0),
    discount_total DECIMAL(12, 2) NOT NULL DEFAULT 0.00 CHECK (discount_total >= 0),
    grand_total DECIMAL(12, 2) NOT NULL DEFAULT 0.00 CHECK (grand_total >= 0),
    payment_status payment_status NOT NULL DEFAULT 'pending',
    
    -- Soft Delete / Void Compliance
    voided_at TIMESTAMP WITH TIME ZONE,
    void_reason TEXT,
    cancelled_by UUID REFERENCES users(id),
    
    -- Offline Sync
    sync_id UUID DEFAULT gen_random_uuid(),
    sync_version INT DEFAULT 1,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (store_id, organization_id) REFERENCES stores(id, organization_id) ON DELETE CASCADE,
    UNIQUE (store_id, sale_number),
    UNIQUE (organization_id, sync_id)
);

CREATE INDEX idx_sales_org_created ON sales(organization_id, created_at);
CREATE INDEX idx_sales_store_session ON sales(store_id, session_id);
CREATE INDEX idx_sales_customer ON sales(customer_id);
CREATE INDEX idx_sales_number ON sales(store_id, sale_number);
CREATE INDEX idx_sales_updated_at ON sales(updated_at);

-- 10. Sale Items (Snapshots)
CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    store_id UUID NOT NULL,
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL, -- SET NULL to keep history if product is deleted
    quantity DECIMAL(10, 3) NOT NULL CHECK (quantity > 0),
    -- Snapshots (Crucial for historical accuracy & profit reporting)
    product_name_snapshot VARCHAR(255) NOT NULL,
    price_snapshot DECIMAL(10, 2) NOT NULL CHECK (price_snapshot >= 0),
    cost_price_snapshot DECIMAL(10, 2) NOT NULL CHECK (cost_price_snapshot >= 0),
    tax_rate_snapshot DECIMAL(5, 2) NOT NULL DEFAULT 0.00 CHECK (tax_rate_snapshot >= 0 AND tax_rate_snapshot <= 100),
    discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
    line_total DECIMAL(12, 2) NOT NULL, -- (quantity * price) + tax - discount
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (store_id, organization_id) REFERENCES stores(id, organization_id) ON DELETE CASCADE
);

CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX idx_sale_items_org_store ON sale_items(organization_id, store_id);

-- 11. Payments (Ledger supporting negative values for refunds)
CREATE TYPE payment_method AS ENUM ('cash', 'upi', 'card', 'credit', 'other');
CREATE TYPE txn_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE payment_direction AS ENUM ('in', 'out');

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    store_id UUID NOT NULL,
    sale_id UUID REFERENCES sales(id) ON DELETE RESTRICT, -- Prevent deleting a sale if it has payments
    session_id UUID REFERENCES cash_register_sessions(id),
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0), -- Magnitude must be positive since direction is explicit
    direction payment_direction NOT NULL DEFAULT 'in', -- Clarifies logic for refunds
    method payment_method NOT NULL,
    status txn_status NOT NULL DEFAULT 'completed',
    reference_number VARCHAR(255), -- UPI/Card Transaction ID
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (store_id, organization_id) REFERENCES stores(id, organization_id) ON DELETE CASCADE
);

-- Protect internal ledgers with a rule to prevent hard-deleting sales
CREATE RULE prevent_sales_delete AS ON DELETE TO sales DO INSTEAD NOTHING;

CREATE INDEX idx_payments_sale_id ON payments(sale_id);
CREATE INDEX idx_payments_org_store_created ON payments(organization_id, store_id, created_at);
CREATE INDEX idx_payments_updated_at ON payments(updated_at);

-- 12. Audit Logs (JSONB for flexibility)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL, -- e.g., 'VOID_SALE', 'UPDATE_PRICE', 'STOCK_ADJUSTMENT'
    entity_type VARCHAR(50) NOT NULL, -- e.g., 'sales', 'products'
    entity_id UUID NOT NULL,
    previous_state JSONB,
    new_state JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_org_entity ON audit_logs(organization_id, entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(organization_id, created_at);


-- migrate:down

