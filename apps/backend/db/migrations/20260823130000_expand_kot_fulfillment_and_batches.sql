-- migrate:up

CREATE TYPE kot_fulfillment_type_enum AS ENUM ('dine_in', 'pick_up');

ALTER TABLE kots
    ADD COLUMN fulfillment_type kot_fulfillment_type_enum,
    ADD COLUMN sale_batch_sequence INTEGER;

UPDATE kots
SET fulfillment_type = 'pick_up'
WHERE kot_type = 'parcel';

UPDATE kots
SET fulfillment_type = 'dine_in'
WHERE kot_type = 'table';

UPDATE kots
SET sale_batch_sequence = 1
WHERE kot_type = 'parcel'
  AND sale_id IS NOT NULL;

ALTER TABLE kots
    ALTER COLUMN fulfillment_type SET NOT NULL;

ALTER TABLE kots
    ADD CONSTRAINT kots_sale_batch_sequence_check CHECK (
        sale_batch_sequence IS NULL OR sale_batch_sequence > 0
    );

ALTER TABLE kots
    ADD CONSTRAINT kots_standalone_batch_check CHECK (
        (kot_type = 'parcel' AND sale_id IS NOT NULL AND sale_batch_sequence IS NOT NULL)
        OR (kot_type = 'parcel' AND sale_id IS NULL AND sale_batch_sequence IS NULL)
        OR (kot_type = 'table' AND sale_batch_sequence IS NULL)
    );

DROP INDEX IF EXISTS kots_parcel_sale_id_key;

CREATE UNIQUE INDEX kots_parcel_sale_batch_key
    ON kots (sale_id, sale_batch_sequence)
    WHERE sale_id IS NOT NULL
      AND kot_type = 'parcel'
      AND sale_batch_sequence IS NOT NULL;

-- migrate:down

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM kots
        WHERE sale_id IS NOT NULL
          AND kot_type = 'parcel'
        GROUP BY sale_id
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Cannot roll back KOT batch expansion after a Sale has multiple standalone KOT batches';
    END IF;
END $$;

DROP INDEX IF EXISTS kots_parcel_sale_batch_key;

CREATE UNIQUE INDEX kots_parcel_sale_id_key
    ON kots (sale_id)
    WHERE sale_id IS NOT NULL AND kot_type = 'parcel';

ALTER TABLE kots
    DROP CONSTRAINT IF EXISTS kots_standalone_batch_check;

ALTER TABLE kots
    DROP CONSTRAINT IF EXISTS kots_sale_batch_sequence_check;

ALTER TABLE kots
    DROP COLUMN IF EXISTS sale_batch_sequence,
    DROP COLUMN IF EXISTS fulfillment_type;

DROP TYPE IF EXISTS kot_fulfillment_type_enum;
