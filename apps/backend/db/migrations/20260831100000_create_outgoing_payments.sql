-- migrate:up

CREATE TABLE outgoing_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    purchase_id UUID NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    payment_method payment_method_enum NOT NULL,
    money_account_id UUID,
    reference VARCHAR(255),
    notes VARCHAR(1000),
    paid_at TIMESTAMP WITH TIME ZONE NOT NULL,
    reversed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE (id, organization_id),
    CONSTRAINT outgoing_payments_amount_positive CHECK (amount > 0),
    CONSTRAINT outgoing_payments_untracked_methods_without_account CHECK (
        money_account_id IS NOT NULL
        OR payment_method IN ('cash', 'upi', 'card')
    ),
    FOREIGN KEY (purchase_id, organization_id) REFERENCES purchases (id, organization_id) ON DELETE RESTRICT,
    FOREIGN KEY (money_account_id, organization_id) REFERENCES money_accounts (id, organization_id) ON DELETE RESTRICT
);

CREATE INDEX idx_outgoing_payments_organization_purchase
    ON outgoing_payments (organization_id, purchase_id);

ALTER TYPE money_account_movement_source_kind_enum ADD VALUE IF NOT EXISTS 'outgoing_purchase_payment';

ALTER TABLE money_account_movements
    ADD COLUMN outgoing_payment_id UUID NULL;

ALTER TABLE money_account_movements
    ADD CONSTRAINT money_account_movements_outgoing_payment_fk
        FOREIGN KEY (outgoing_payment_id, organization_id)
        REFERENCES outgoing_payments (id, organization_id)
        ON DELETE RESTRICT;

ALTER TABLE money_account_movements
    ADD CONSTRAINT money_account_movements_outgoing_payment_id_key UNIQUE (outgoing_payment_id);

-- migrate:down

ALTER TABLE money_account_movements
    DROP CONSTRAINT IF EXISTS money_account_movements_outgoing_payment_id_key;

ALTER TABLE money_account_movements
    DROP CONSTRAINT IF EXISTS money_account_movements_outgoing_payment_fk;

ALTER TABLE money_account_movements
    DROP COLUMN IF EXISTS outgoing_payment_id;

DROP TABLE IF EXISTS outgoing_payments;

-- PostgreSQL cannot drop an enum value safely once it has been added.
