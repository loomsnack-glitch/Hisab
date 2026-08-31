-- migrate:up

ALTER TABLE money_account_movements
    DROP CONSTRAINT IF EXISTS money_account_movements_payment_shape_check;

ALTER TABLE money_account_movements
    DROP CONSTRAINT IF EXISTS money_account_movements_reversal_shape_check;

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
    );

-- migrate:down

ALTER TABLE money_account_movements
    DROP CONSTRAINT IF EXISTS money_account_movements_source_shape_check;

ALTER TABLE money_account_movements
    ADD CONSTRAINT money_account_movements_payment_shape_check CHECK (
        payment_id IS NULL OR (amount > 0 AND reversed_movement_id IS NULL)
    );

ALTER TABLE money_account_movements
    ADD CONSTRAINT money_account_movements_reversal_shape_check CHECK (
        reversed_movement_id IS NULL OR (amount < 0 AND payment_id IS NULL)
    );
