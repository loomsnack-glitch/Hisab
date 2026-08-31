-- migrate:up

CREATE TYPE expense_lifecycle_enum AS ENUM ('draft', 'recorded', 'voided');

CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    store_id UUID NOT NULL,
    expense_category_id UUID NOT NULL,
    expense_category_name VARCHAR(255) NOT NULL,
    lifecycle expense_lifecycle_enum NOT NULL DEFAULT 'draft',
    payable_status payable_status_enum,
    effective_date DATE NOT NULL,
    invoice_reference VARCHAR(255),
    notes VARCHAR(1000),
    total NUMERIC(12, 2) NOT NULL,
    paid_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    due_amount NUMERIC(12, 2),
    recorded_at TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE (id, organization_id),
    CONSTRAINT expenses_total_positive CHECK (total > 0),
    CONSTRAINT expenses_paid_total_non_negative CHECK (paid_total >= 0),
    CONSTRAINT expenses_draft_or_recorded_check CHECK (
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
    FOREIGN KEY (expense_category_id, organization_id) REFERENCES expense_categories (id, organization_id)
);

CREATE INDEX idx_expenses_organization_id ON expenses (organization_id);
CREATE INDEX idx_expenses_organization_store ON expenses (organization_id, store_id);
CREATE INDEX idx_expenses_organization_category ON expenses (organization_id, expense_category_id);
CREATE INDEX idx_expenses_organization_lifecycle ON expenses (organization_id, lifecycle);
CREATE INDEX idx_expenses_organization_effective_date ON expenses (organization_id, effective_date DESC);

-- migrate:down

DROP TABLE IF EXISTS expenses;
DROP TYPE IF EXISTS expense_lifecycle_enum;
