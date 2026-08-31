-- migrate:up

ALTER TYPE money_account_movement_source_kind_enum ADD VALUE IF NOT EXISTS 'outgoing_expense_payment_reversal';
ALTER TYPE money_account_movement_source_kind_enum ADD VALUE IF NOT EXISTS 'outgoing_expense_void_reversal';

ALTER TABLE expenses
    ADD COLUMN voided_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN void_reason VARCHAR(1000);

ALTER TABLE expenses
    DROP CONSTRAINT IF EXISTS expenses_draft_or_recorded_check;

ALTER TABLE expenses
    ADD CONSTRAINT expenses_lifecycle_shape_check CHECK (
        (
            lifecycle = 'draft'
            AND payable_status IS NULL
            AND paid_total = 0
            AND due_amount IS NULL
            AND recorded_at IS NULL
            AND voided_at IS NULL
            AND void_reason IS NULL
        )
        OR (
            lifecycle = 'recorded'
            AND payable_status IS NOT NULL
            AND due_amount IS NOT NULL
            AND recorded_at IS NOT NULL
            AND voided_at IS NULL
            AND void_reason IS NULL
        )
        OR (
            lifecycle = 'voided'
            AND payable_status IS NULL
            AND due_amount IS NULL
            AND recorded_at IS NOT NULL
            AND voided_at IS NOT NULL
            AND void_reason IS NOT NULL
        )
    );

-- migrate:down

ALTER TABLE expenses
    DROP CONSTRAINT IF EXISTS expenses_lifecycle_shape_check;

ALTER TABLE expenses
    ADD CONSTRAINT expenses_draft_or_recorded_check CHECK (
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
    );

ALTER TABLE expenses
    DROP COLUMN IF EXISTS void_reason,
    DROP COLUMN IF EXISTS voided_at;

-- PostgreSQL cannot drop an enum value safely once it has been added.
