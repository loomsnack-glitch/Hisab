-- migrate:up

ALTER TYPE money_account_movement_source_kind_enum ADD VALUE IF NOT EXISTS 'sale_replacement_reversal';

ALTER TABLE money_account_movements
    ALTER COLUMN payment_id DROP NOT NULL,
    ADD COLUMN reversed_movement_id UUID NULL;

ALTER TABLE money_account_movements
    ADD CONSTRAINT money_account_movements_reversed_movement_fk
        FOREIGN KEY (reversed_movement_id, organization_id)
        REFERENCES money_account_movements (id, organization_id)
        ON DELETE RESTRICT;

ALTER TABLE money_account_movements
    DROP CONSTRAINT money_account_movements_amount_positive_check;

ALTER TABLE money_account_movements
    ADD CONSTRAINT money_account_movements_amount_nonzero_check CHECK (amount <> 0);

ALTER TABLE money_account_movements
    ADD CONSTRAINT money_account_movements_payment_shape_check CHECK (
        payment_id IS NULL OR (amount > 0 AND reversed_movement_id IS NULL)
    );

ALTER TABLE money_account_movements
    ADD CONSTRAINT money_account_movements_reversal_shape_check CHECK (
        reversed_movement_id IS NULL OR (amount < 0 AND payment_id IS NULL)
    );

ALTER TABLE money_account_movements
    ADD CONSTRAINT money_account_movements_reversed_movement_id_key UNIQUE (reversed_movement_id);

-- migrate:down

ALTER TABLE money_account_movements
    DROP CONSTRAINT IF EXISTS money_account_movements_reversed_movement_id_key;

ALTER TABLE money_account_movements
    DROP CONSTRAINT IF EXISTS money_account_movements_reversal_shape_check;

ALTER TABLE money_account_movements
    DROP CONSTRAINT IF EXISTS money_account_movements_payment_shape_check;

ALTER TABLE money_account_movements
    DROP CONSTRAINT IF EXISTS money_account_movements_amount_nonzero_check;

ALTER TABLE money_account_movements
    ADD CONSTRAINT money_account_movements_amount_positive_check CHECK (amount > 0);

ALTER TABLE money_account_movements
    DROP CONSTRAINT IF EXISTS money_account_movements_reversed_movement_fk;

ALTER TABLE money_account_movements
    DROP COLUMN IF EXISTS reversed_movement_id;

ALTER TABLE money_account_movements
    ALTER COLUMN payment_id SET NOT NULL;

-- PostgreSQL cannot drop an enum value safely once it has been added.
