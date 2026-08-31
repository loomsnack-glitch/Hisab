-- migrate:up

ALTER TABLE outgoing_payments
    ALTER COLUMN purchase_id DROP NOT NULL;

ALTER TABLE outgoing_payments
    ADD COLUMN expense_id UUID;

ALTER TABLE outgoing_payments
    ADD CONSTRAINT outgoing_payments_purchase_or_expense_xor CHECK (
        (purchase_id IS NOT NULL AND expense_id IS NULL)
        OR (purchase_id IS NULL AND expense_id IS NOT NULL)
    );

ALTER TABLE outgoing_payments
    ADD CONSTRAINT outgoing_payments_expense_fk
        FOREIGN KEY (expense_id, organization_id)
        REFERENCES expenses (id, organization_id)
        ON DELETE RESTRICT;

CREATE INDEX idx_outgoing_payments_organization_expense
    ON outgoing_payments (organization_id, expense_id);

ALTER TYPE money_account_movement_source_kind_enum ADD VALUE IF NOT EXISTS 'outgoing_expense_payment';

-- migrate:down

DROP INDEX IF EXISTS idx_outgoing_payments_organization_expense;

ALTER TABLE outgoing_payments
    DROP CONSTRAINT IF EXISTS outgoing_payments_expense_fk;

ALTER TABLE outgoing_payments
    DROP CONSTRAINT IF EXISTS outgoing_payments_purchase_or_expense_xor;

ALTER TABLE outgoing_payments
    DROP COLUMN IF EXISTS expense_id;

ALTER TABLE outgoing_payments
    ALTER COLUMN purchase_id SET NOT NULL;

-- PostgreSQL cannot drop an enum value safely once it has been added.
