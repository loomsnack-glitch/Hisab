-- migrate:up

ALTER TABLE money_account_movements
    DROP CONSTRAINT IF EXISTS money_account_movements_source_shape_check;

ALTER TABLE money_account_movements
    ADD CONSTRAINT money_account_movements_source_shape_check CHECK (
        (
            source_kind = 'pos_payment'
            AND amount > 0
            AND payment_id IS NOT NULL
            AND outgoing_payment_id IS NULL
            AND reversed_movement_id IS NULL
        )
        OR (
            source_kind = 'sale_replacement_reversal'
            AND amount < 0
            AND reversed_movement_id IS NOT NULL
            AND payment_id IS NULL
            AND outgoing_payment_id IS NULL
        )
        OR (
            source_kind = 'outgoing_purchase_payment'
            AND amount < 0
            AND outgoing_payment_id IS NOT NULL
            AND payment_id IS NULL
            AND reversed_movement_id IS NULL
        )
        OR (
            source_kind = 'outgoing_expense_payment'
            AND amount < 0
            AND outgoing_payment_id IS NOT NULL
            AND payment_id IS NULL
            AND reversed_movement_id IS NULL
        )
        OR (
            source_kind IN (
                'outgoing_purchase_payment_reversal',
                'outgoing_purchase_void_reversal',
                'outgoing_expense_payment_reversal',
                'outgoing_expense_void_reversal'
            )
            AND amount > 0
            AND reversed_movement_id IS NOT NULL
            AND payment_id IS NULL
            AND outgoing_payment_id IS NULL
        )
    );

-- migrate:down

ALTER TABLE money_account_movements
    DROP CONSTRAINT IF EXISTS money_account_movements_source_shape_check;

ALTER TABLE money_account_movements
    ADD CONSTRAINT money_account_movements_source_shape_check CHECK (
        (
            source_kind = 'pos_payment'
            AND amount > 0
            AND payment_id IS NOT NULL
            AND outgoing_payment_id IS NULL
            AND reversed_movement_id IS NULL
        )
        OR (
            source_kind = 'sale_replacement_reversal'
            AND amount < 0
            AND reversed_movement_id IS NOT NULL
            AND payment_id IS NULL
            AND outgoing_payment_id IS NULL
        )
        OR (
            source_kind = 'outgoing_purchase_payment'
            AND amount < 0
            AND outgoing_payment_id IS NOT NULL
            AND payment_id IS NULL
            AND reversed_movement_id IS NULL
        )
        OR (
            source_kind = 'outgoing_expense_payment'
            AND amount < 0
            AND outgoing_payment_id IS NOT NULL
            AND payment_id IS NULL
            AND reversed_movement_id IS NULL
        )
        OR (
            source_kind IN (
                'outgoing_purchase_payment_reversal',
                'outgoing_purchase_void_reversal'
            )
            AND amount > 0
            AND reversed_movement_id IS NOT NULL
            AND payment_id IS NULL
            AND outgoing_payment_id IS NULL
        )
    );
