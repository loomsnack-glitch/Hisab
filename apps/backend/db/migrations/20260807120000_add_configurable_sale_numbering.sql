-- migrate:up

CREATE TYPE sale_number_reset_period_enum AS ENUM (
    'never',
    'daily',
    'weekly',
    'monthly',
    'quarterly',
    'half_yearly',
    'yearly'
);

CREATE TABLE store_billing_settings (
    store_id UUID PRIMARY KEY,
    organization_id UUID NOT NULL,
    sale_number_reset_period sale_number_reset_period_enum NOT NULL DEFAULT 'never',
    sale_number_timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT store_billing_settings_timezone_check CHECK (length(trim(sale_number_timezone)) > 0),
    FOREIGN KEY (store_id, organization_id) REFERENCES stores(id, organization_id) ON DELETE CASCADE
);

CREATE TABLE store_sale_sequences (
    store_id UUID NOT NULL,
    organization_id UUID NOT NULL,
    period_key VARCHAR(32) NOT NULL,
    next_sequence_number BIGINT NOT NULL DEFAULT 1,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (store_id, period_key),
    CONSTRAINT store_sale_sequences_next_number_check CHECK (next_sequence_number > 0),
    CONSTRAINT store_sale_sequences_period_key_check CHECK (length(trim(period_key)) > 0),
    FOREIGN KEY (store_id, organization_id) REFERENCES stores(id, organization_id) ON DELETE CASCADE
);

INSERT INTO store_billing_settings (store_id, organization_id)
SELECT id, organization_id
FROM stores;

INSERT INTO store_sale_sequences (store_id, organization_id, period_key, next_sequence_number)
SELECT store_id, organization_id, 'continuous', next_sale_number
FROM store_sale_counters;

ALTER TABLE sales
    ALTER COLUMN sale_number TYPE VARCHAR(64) USING sale_number::text,
    ADD COLUMN sale_sequence_number BIGINT,
    ADD COLUMN sale_period_key VARCHAR(32);

UPDATE sales
SET sale_sequence_number = sale_number::bigint,
    sale_period_key = 'continuous'
WHERE sale_number IS NOT NULL;

ALTER TABLE sales
    ADD CONSTRAINT sales_sale_sequence_number_check CHECK (sale_sequence_number IS NULL OR sale_sequence_number > 0),
    ADD CONSTRAINT sales_sale_number_metadata_check CHECK (
        (status = 'draft' AND sale_number IS NULL AND sale_sequence_number IS NULL AND sale_period_key IS NULL)
        OR (
            status <> 'draft'
            AND sale_number IS NOT NULL
            AND sale_sequence_number IS NOT NULL
            AND sale_period_key IS NOT NULL
            AND length(trim(sale_period_key)) > 0
        )
    );

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

DROP TABLE store_sale_counters;

-- migrate:down

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM sales WHERE sale_period_key IS NOT NULL AND sale_period_key <> 'continuous') THEN
        RAISE EXCEPTION 'Cannot reverse sale numbering migration after reset-based numbers have been issued';
    END IF;
END $$;

DROP TRIGGER IF EXISTS trg_sales_sale_number_immutable ON sales;
DROP FUNCTION IF EXISTS prevent_sale_number_mutation();

ALTER TABLE sales
    DROP CONSTRAINT sales_sale_number_metadata_check,
    DROP CONSTRAINT sales_sale_sequence_number_check,
    DROP COLUMN sale_sequence_number,
    DROP COLUMN sale_period_key,
    ALTER COLUMN sale_number TYPE BIGINT USING sale_number::bigint;

CREATE TABLE store_sale_counters (
    store_id UUID PRIMARY KEY,
    organization_id UUID NOT NULL,
    next_sale_number BIGINT NOT NULL DEFAULT 1,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT store_sale_counters_next_sale_number_check CHECK (next_sale_number > 0),
    FOREIGN KEY (store_id, organization_id) REFERENCES stores(id, organization_id) ON DELETE CASCADE
);

INSERT INTO store_sale_counters (store_id, organization_id, next_sale_number)
SELECT store_id, organization_id, next_sequence_number
FROM store_sale_sequences
WHERE period_key = 'continuous';

DROP TABLE store_sale_sequences;
DROP TABLE store_billing_settings;
DROP TYPE sale_number_reset_period_enum;
