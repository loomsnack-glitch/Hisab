-- migrate:up

ALTER TYPE money_account_movement_source_kind_enum ADD VALUE IF NOT EXISTS 'outgoing_purchase_payment_reversal';
ALTER TYPE money_account_movement_source_kind_enum ADD VALUE IF NOT EXISTS 'outgoing_purchase_void_reversal';

CREATE TYPE outgoing_payment_reversal_kind_enum AS ENUM ('payment_reversal', 'payable_void');

ALTER TABLE outgoing_payments
    ADD COLUMN reversal_reason VARCHAR(1000),
    ADD COLUMN reversal_kind outgoing_payment_reversal_kind_enum;

ALTER TABLE outgoing_payments
    ADD CONSTRAINT outgoing_payments_reversal_shape_check CHECK (
        (
            reversed_at IS NULL
            AND reversal_reason IS NULL
            AND reversal_kind IS NULL
        )
        OR (
            reversed_at IS NOT NULL
            AND reversal_reason IS NOT NULL
            AND reversal_kind IS NOT NULL
        )
    );

ALTER TABLE purchases
    ADD COLUMN voided_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN void_reason VARCHAR(1000);

ALTER TABLE purchases
    DROP CONSTRAINT IF EXISTS purchases_draft_or_recorded_check;

ALTER TABLE purchases
    ADD CONSTRAINT purchases_lifecycle_shape_check CHECK (
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

ALTER TABLE purchases
    DROP CONSTRAINT IF EXISTS purchases_lifecycle_shape_check;

ALTER TABLE purchases
    ADD CONSTRAINT purchases_draft_or_recorded_check CHECK (
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

ALTER TABLE purchases
    DROP COLUMN IF EXISTS void_reason,
    DROP COLUMN IF EXISTS voided_at;

ALTER TABLE outgoing_payments
    DROP CONSTRAINT IF EXISTS outgoing_payments_reversal_shape_check;

ALTER TABLE outgoing_payments
    DROP COLUMN IF EXISTS reversal_kind,
    DROP COLUMN IF EXISTS reversal_reason;

DROP TYPE IF EXISTS outgoing_payment_reversal_kind_enum;

-- PostgreSQL cannot drop an enum value safely once it has been added.
