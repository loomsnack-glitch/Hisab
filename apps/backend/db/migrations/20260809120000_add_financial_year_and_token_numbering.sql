-- migrate:up

ALTER TYPE sale_number_reset_period_enum ADD VALUE IF NOT EXISTS 'financial_yearly';

CREATE TYPE token_number_reset_period_enum AS ENUM (
    'daily',
    'weekly',
    'monthly',
    'quarterly',
    'half_yearly',
    'yearly',
    'financial_yearly',
    'never'
);

ALTER TABLE store_billing_settings
    ADD COLUMN token_number_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN token_number_reset_period token_number_reset_period_enum NOT NULL DEFAULT 'daily';

CREATE TABLE store_token_sequences (
    store_id UUID NOT NULL,
    organization_id UUID NOT NULL,
    period_key VARCHAR(32) NOT NULL,
    next_sequence_number BIGINT NOT NULL DEFAULT 1,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (store_id, period_key),
    CONSTRAINT store_token_sequences_next_number_check CHECK (next_sequence_number > 0),
    CONSTRAINT store_token_sequences_period_key_check CHECK (length(trim(period_key)) > 0),
    FOREIGN KEY (store_id, organization_id) REFERENCES stores(id, organization_id) ON DELETE CASCADE
);

ALTER TABLE sales
    ADD COLUMN token_number VARCHAR(64),
    ADD COLUMN token_sequence_number BIGINT,
    ADD COLUMN token_period_key VARCHAR(32);

ALTER TABLE sales
    ADD CONSTRAINT sales_token_number_metadata_check CHECK (
        (status = 'draft' AND token_number IS NULL AND token_sequence_number IS NULL AND token_period_key IS NULL)
        OR (
            status <> 'draft'
            AND (
                (token_number IS NULL AND token_sequence_number IS NULL AND token_period_key IS NULL)
                OR (
                    token_number IS NOT NULL
                    AND token_sequence_number IS NOT NULL
                    AND token_sequence_number > 0
                    AND token_period_key IS NOT NULL
                    AND length(trim(token_period_key)) > 0
                )
            )
        )
    ),
    ADD CONSTRAINT sales_token_sequence_number_check CHECK (
        token_sequence_number IS NULL OR token_sequence_number > 0
    );

CREATE UNIQUE INDEX sales_store_token_period_sequence_key
    ON sales (store_id, token_period_key, token_sequence_number)
    WHERE token_period_key IS NOT NULL AND token_sequence_number IS NOT NULL;

CREATE OR REPLACE FUNCTION prevent_sale_number_mutation()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status <> 'draft'
       AND (
           NEW.sale_number IS DISTINCT FROM OLD.sale_number
           OR NEW.sale_sequence_number IS DISTINCT FROM OLD.sale_sequence_number
           OR NEW.sale_period_key IS DISTINCT FROM OLD.sale_period_key
           OR NEW.token_number IS DISTINCT FROM OLD.token_number
           OR NEW.token_sequence_number IS DISTINCT FROM OLD.token_sequence_number
           OR NEW.token_period_key IS DISTINCT FROM OLD.token_period_key
       ) THEN
        RAISE EXCEPTION 'committed Sale Numbers and Token Numbers are immutable';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sales_sale_number_immutable ON sales;

CREATE TRIGGER trg_sales_sale_number_immutable
    BEFORE UPDATE OF sale_number, sale_sequence_number, sale_period_key,
        token_number, token_sequence_number, token_period_key ON sales
    FOR EACH ROW
    EXECUTE FUNCTION prevent_sale_number_mutation();

-- migrate:down

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM sales
        WHERE token_number IS NOT NULL
           OR token_sequence_number IS NOT NULL
           OR token_period_key IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'Cannot reverse token numbering migration after token numbers have been issued';
    END IF;
END $$;

DROP TRIGGER IF EXISTS trg_sales_sale_number_immutable ON sales;
DROP FUNCTION IF EXISTS prevent_sale_number_mutation();

ALTER TABLE sales
    DROP CONSTRAINT sales_token_number_metadata_check,
    DROP CONSTRAINT sales_token_sequence_number_check,
    DROP COLUMN token_number,
    DROP COLUMN token_sequence_number,
    DROP COLUMN token_period_key;

DROP INDEX IF EXISTS sales_store_token_period_sequence_key;
DROP TABLE store_token_sequences;
ALTER TABLE store_billing_settings
    DROP COLUMN token_number_enabled,
    DROP COLUMN token_number_reset_period;
DROP TYPE token_number_reset_period_enum;

CREATE OR REPLACE FUNCTION prevent_sale_number_mutation()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status <> 'draft'
       AND (
           NEW.sale_number IS DISTINCT FROM OLD.sale_number
           OR NEW.sale_sequence_number IS DISTINCT FROM OLD.sale_sequence_number
           OR NEW.sale_period_key IS DISTINCT FROM OLD.sale_period_key
       ) THEN
        RAISE EXCEPTION 'committed Sale Numbers are immutable';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sales_sale_number_immutable
    BEFORE UPDATE OF sale_number, sale_sequence_number, sale_period_key ON sales
    FOR EACH ROW
    EXECUTE FUNCTION prevent_sale_number_mutation();
