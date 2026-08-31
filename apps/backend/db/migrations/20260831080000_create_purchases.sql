-- migrate:up

CREATE TYPE purchase_lifecycle_enum AS ENUM ('draft', 'recorded', 'voided');
CREATE TYPE payable_status_enum AS ENUM ('due', 'partial', 'paid');

CREATE TABLE purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    store_id UUID NOT NULL,
    vendor_id UUID NOT NULL,
    vendor_name VARCHAR(255) NOT NULL,
    lifecycle purchase_lifecycle_enum NOT NULL DEFAULT 'draft',
    payable_status payable_status_enum,
    effective_date DATE NOT NULL,
    invoice_reference VARCHAR(255),
    notes VARCHAR(1000),
    adjustment NUMERIC(12, 2) NOT NULL DEFAULT 0,
    lines_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    paid_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    due_amount NUMERIC(12, 2),
    recorded_at TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE (id, organization_id),
    CONSTRAINT purchases_paid_total_non_negative CHECK (paid_total >= 0),
    CONSTRAINT purchases_draft_or_recorded_check CHECK (
        (
            lifecycle = 'draft'
            AND payable_status IS NULL
            AND paid_total = 0
            AND due_amount IS NULL
            AND recorded_at IS NULL
        )
        OR (
            lifecycle = 'recorded'
            AND payable_status IS NOT NULL
            AND due_amount IS NOT NULL
            AND recorded_at IS NOT NULL
        )
        OR (lifecycle = 'voided')
    ),
    FOREIGN KEY (store_id, organization_id) REFERENCES stores (id, organization_id),
    FOREIGN KEY (vendor_id, organization_id) REFERENCES vendors (id, organization_id)
);

CREATE TABLE purchase_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    purchase_id UUID NOT NULL,
    position INTEGER NOT NULL,
    vendor_item_id UUID NOT NULL,
    vendor_item_name VARCHAR(255) NOT NULL,
    unit_id UUID NOT NULL,
    unit_label VARCHAR(32) NOT NULL,
    quantity NUMERIC(14, 3) NOT NULL,
    agreed_unit_price NUMERIC(12, 2) NOT NULL,
    line_total NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE (id, organization_id),
    UNIQUE (purchase_id, position),
    CONSTRAINT purchase_lines_quantity_positive CHECK (quantity > 0),
    CONSTRAINT purchase_lines_agreed_unit_price_non_negative CHECK (agreed_unit_price >= 0),
    CONSTRAINT purchase_lines_line_total_non_negative CHECK (line_total >= 0),
    FOREIGN KEY (purchase_id, organization_id) REFERENCES purchases (id, organization_id) ON DELETE CASCADE,
    FOREIGN KEY (vendor_item_id, organization_id) REFERENCES vendor_items (id, organization_id),
    FOREIGN KEY (unit_id, organization_id) REFERENCES units (id, organization_id)
);

CREATE INDEX idx_purchases_organization_id ON purchases (organization_id);
CREATE INDEX idx_purchases_organization_store ON purchases (organization_id, store_id);
CREATE INDEX idx_purchases_organization_vendor ON purchases (organization_id, vendor_id);
CREATE INDEX idx_purchases_organization_lifecycle ON purchases (organization_id, lifecycle);
CREATE INDEX idx_purchases_organization_effective_date ON purchases (organization_id, effective_date DESC);
CREATE INDEX idx_purchase_lines_purchase_id ON purchase_lines (purchase_id);

-- migrate:down

DROP TABLE IF EXISTS purchase_lines;
DROP TABLE IF EXISTS purchases;
DROP TYPE IF EXISTS payable_status_enum;
DROP TYPE IF EXISTS purchase_lifecycle_enum;
