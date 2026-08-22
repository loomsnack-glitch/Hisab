-- Manual, operator-run normalization for one Store whose current-financial-year
-- Sales still use legacy daily-prefixed Sale Numbers.
--
-- Required psql variables:
--   target_organization_id  Organization UUID that owns the target Sale.
--   target_sale_id          One known Sale UUID in the Store being normalized.
--   apply_repair            false for a rollback rehearsal; true to commit.
\set ON_ERROR_STOP on

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

LOCK TABLE sales IN ACCESS EXCLUSIVE MODE;
LOCK TABLE store_billing_settings, store_sale_sequences
    IN SHARE ROW EXCLUSIVE MODE;

DO $validation$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM schema_migrations
        WHERE version = '20260821170000'
    ) THEN
        RAISE EXCEPTION 'Required Sale Number period migration is not applied';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgrelid = 'sales'::regclass
          AND tgname = 'trg_sales_sale_number_immutable'
          AND tgenabled = 'O'
          AND NOT tgisinternal
    ) THEN
        RAISE EXCEPTION 'The committed Sale Number immutability trigger is not enabled';
    END IF;
END
$validation$;

CREATE TEMP TABLE bill_number_normalization_target ON COMMIT DROP AS
SELECT
    organization.id AS organization_id,
    organization.name AS organization_name,
    store.id AS store_id,
    store.name AS store_name,
    sample.id AS sample_sale_id,
    COALESCE(NULLIF(TRIM(settings.sale_number_timezone), ''), 'Asia/Kolkata') AS timezone,
    FORMAT(
        'FY%s-%s',
        TO_CHAR(
            (transaction_timestamp() AT TIME ZONE COALESCE(NULLIF(TRIM(settings.sale_number_timezone), ''), 'Asia/Kolkata'))
                - INTERVAL '3 months',
            'YY'
        ),
        TO_CHAR(
            (transaction_timestamp() AT TIME ZONE COALESCE(NULLIF(TRIM(settings.sale_number_timezone), ''), 'Asia/Kolkata'))
                + INTERVAL '9 months',
            'YY'
        )
    ) AS current_financial_year
FROM sales sample
INNER JOIN stores store
    ON store.id = sample.store_id
   AND store.organization_id = sample.organization_id
INNER JOIN organizations organization
    ON organization.id = sample.organization_id
LEFT JOIN store_billing_settings settings
    ON settings.store_id = sample.store_id
   AND settings.organization_id = sample.organization_id
WHERE sample.id = :'target_sale_id'::uuid
  AND sample.organization_id = :'target_organization_id'::uuid;

DO $validation$
BEGIN
    IF (SELECT COUNT(*) FROM bill_number_normalization_target) <> 1 THEN
        RAISE EXCEPTION 'The supplied Organization/Sale pair did not identify exactly one target Store';
    END IF;
END
$validation$;

CREATE TEMP TABLE bill_number_normalization_current_sales ON COMMIT DROP AS
SELECT
    sale.id AS sale_id,
    target.organization_id,
    target.organization_name,
    target.store_id,
    target.store_name,
    target.sample_sale_id,
    target.current_financial_year,
    sale.sale_number,
    sale.sale_sequence_number,
    sale.sale_period_key,
    sale.committed_at
FROM bill_number_normalization_target target
INNER JOIN sales sale
    ON sale.organization_id = target.organization_id
   AND sale.store_id = target.store_id
WHERE sale.status <> 'draft'
  AND FORMAT(
      'FY%s-%s',
      TO_CHAR((sale.committed_at AT TIME ZONE target.timezone) - INTERVAL '3 months', 'YY'),
      TO_CHAR((sale.committed_at AT TIME ZONE target.timezone) + INTERVAL '9 months', 'YY')
  ) = target.current_financial_year;

DO $validation$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM bill_number_normalization_current_sales sample
        WHERE sample.sale_id = sample.sample_sale_id
          AND (
              (
                  sample.sale_period_key ~ '^[0-9]{8}$'
                  AND sample.sale_number = sample.sale_period_key || '-'
                      || LPAD(sample.sale_sequence_number::text, 4, '0')
              )
              OR (
                  sample.sale_period_key = sample.current_financial_year
                  AND sample.sale_number = sample.sale_sequence_number::text
              )
          )
    ) THEN
        RAISE EXCEPTION 'The supplied sample Sale is not a current-FY daily-prefixed or normalized Sale';
    END IF;
END
$validation$;

CREATE TEMP TABLE bill_number_normalization_state ON COMMIT DROP AS
SELECT
    target.organization_id,
    target.organization_name,
    target.store_id,
    target.store_name,
    target.sample_sale_id,
    target.current_financial_year,
    COUNT(current_sales.sale_id)::bigint AS current_fy_sale_count,
    COUNT(current_sales.sale_id) FILTER (
        WHERE current_sales.sale_period_key ~ '^[0-9]{8}$'
          AND current_sales.sale_number ~ '^[0-9]{8}-[0-9]{4,}$'
    )::bigint AS daily_prefixed_sale_count,
    COUNT(current_sales.sale_id) FILTER (
        WHERE current_sales.sale_period_key = target.current_financial_year
          AND current_sales.sale_number = current_sales.sale_sequence_number::text
    )::bigint AS normalized_sale_count
FROM bill_number_normalization_target target
LEFT JOIN bill_number_normalization_current_sales current_sales
    ON current_sales.organization_id = target.organization_id
   AND current_sales.store_id = target.store_id
GROUP BY
    target.organization_id,
    target.organization_name,
    target.store_id,
    target.store_name,
    target.sample_sale_id,
    target.current_financial_year;

DO $validation$
DECLARE
    current_fy_sale_count bigint;
    daily_prefixed_sale_count bigint;
    normalized_sale_count bigint;
BEGIN
    SELECT
        state.current_fy_sale_count,
        state.daily_prefixed_sale_count,
        state.normalized_sale_count
    INTO
        current_fy_sale_count,
        daily_prefixed_sale_count,
        normalized_sale_count
    FROM bill_number_normalization_state state;

    IF current_fy_sale_count <> 44 THEN
        RAISE EXCEPTION 'Target Store scope changed: expected 44 current-FY Sales, found %', current_fy_sale_count;
    END IF;

    IF daily_prefixed_sale_count = 44 AND normalized_sale_count = 0 THEN
        IF EXISTS (
            SELECT 1
            FROM bill_number_normalization_current_sales
            WHERE sale_number <> sale_period_key || '-' || LPAD(sale_sequence_number::text, 4, '0')
        ) THEN
            RAISE EXCEPTION 'A legacy daily-prefixed Sale does not match its stored period/sequence metadata';
        END IF;
        RETURN;
    END IF;

    IF daily_prefixed_sale_count = 0 AND normalized_sale_count = 44 THEN
        IF EXISTS (
            SELECT 1
            FROM (
                SELECT
                    COUNT(*)::bigint AS sale_count,
                    COUNT(DISTINCT sale_sequence_number)::bigint AS distinct_sequence_count,
                    MIN(sale_sequence_number)::bigint AS minimum_sequence,
                    MAX(sale_sequence_number)::bigint AS maximum_sequence
                FROM bill_number_normalization_current_sales
            ) normalized
            WHERE distinct_sequence_count <> sale_count
               OR minimum_sequence <> 1
               OR maximum_sequence <> sale_count
        ) THEN
            RAISE EXCEPTION 'Already-normalized Sales are not a contiguous 1..N sequence';
        END IF;
        RETURN;
    END IF;

    RAISE EXCEPTION
        'Target Store is in an unexpected mixed numbering state: % daily-prefixed, % normalized',
        daily_prefixed_sale_count,
        normalized_sale_count;
END
$validation$;

CREATE TEMP TABLE bill_number_normalization_map ON COMMIT DROP AS
SELECT
    current_sales.sale_id,
    current_sales.organization_id,
    current_sales.store_id,
    current_sales.sample_sale_id,
    current_sales.sale_number AS old_sale_number,
    current_sales.sale_sequence_number AS old_sequence_number,
    current_sales.sale_period_key AS old_period_key,
    ROW_NUMBER() OVER (
        ORDER BY current_sales.committed_at, current_sales.sale_id
    )::bigint AS new_sequence_number,
    ROW_NUMBER() OVER (
        ORDER BY current_sales.committed_at, current_sales.sale_id
    )::text AS new_sale_number,
    current_sales.current_financial_year AS new_period_key
FROM bill_number_normalization_current_sales current_sales
WHERE current_sales.sale_period_key <> current_sales.current_financial_year;

DO $validation$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM bill_number_normalization_map mapping
        INNER JOIN sales existing_sale
            ON existing_sale.organization_id = mapping.organization_id
           AND existing_sale.store_id = mapping.store_id
           AND existing_sale.id <> mapping.sale_id
           AND existing_sale.sale_period_key = mapping.new_period_key
           AND existing_sale.sale_sequence_number = mapping.new_sequence_number
        WHERE NOT EXISTS (
            SELECT 1
            FROM bill_number_normalization_map other_mapping
            WHERE other_mapping.sale_id = existing_sale.id
        )
    ) THEN
        RAISE EXCEPTION 'A proposed normalized sequence collides with an unmodified FY Sale';
    END IF;
END
$validation$;

CREATE TEMP TABLE bill_number_normalization_untouched_fingerprint ON COMMIT DROP AS
SELECT
    COUNT(*)::bigint AS sale_count,
    MD5(STRING_AGG(
        sale.id::text || ':' || COALESCE(sale.sale_number, '-') || ':'
            || COALESCE(sale.sale_sequence_number::text, '-') || ':'
            || COALESCE(sale.sale_period_key, '-'),
        '|' ORDER BY sale.id
    )) AS numbering_hash
FROM sales sale
WHERE NOT EXISTS (
    SELECT 1
    FROM bill_number_normalization_map mapping
    WHERE mapping.sale_id = sale.id
);

SELECT
    state.organization_name,
    state.store_name,
    state.current_financial_year,
    state.current_fy_sale_count AS sales_to_normalize,
    COALESCE(MIN(mapping.new_sequence_number), 1) AS new_first_number,
    COALESCE(MAX(mapping.new_sequence_number), state.current_fy_sale_count) AS new_last_number,
    state.current_fy_sale_count + 1 AS new_counter_next
FROM bill_number_normalization_state state
LEFT JOIN bill_number_normalization_map mapping
    ON mapping.organization_id = state.organization_id
   AND mapping.store_id = state.store_id
GROUP BY
    state.organization_id,
    state.organization_name,
    state.store_id,
    state.store_name,
    state.current_financial_year,
    state.current_fy_sale_count;

SELECT
    sample.sale_number AS current_sample_bill_number,
    COALESCE(mapping.new_sale_number, sample.sale_number) AS normalized_sample_bill_number
FROM bill_number_normalization_current_sales sample
LEFT JOIN bill_number_normalization_map mapping
    ON mapping.sale_id = sample.sale_id
WHERE sample.sale_id = sample.sample_sale_id;

ALTER TABLE sales DISABLE TRIGGER trg_sales_sale_number_immutable;

CREATE TEMP TABLE bill_number_normalization_update_result ON COMMIT DROP AS
WITH updated AS (
    UPDATE sales sale
    SET
        sale_number = mapping.new_sale_number,
        sale_sequence_number = mapping.new_sequence_number,
        sale_period_key = mapping.new_period_key
    FROM bill_number_normalization_map mapping
    WHERE sale.id = mapping.sale_id
      AND sale.organization_id = mapping.organization_id
      AND sale.store_id = mapping.store_id
      AND sale.sale_number = mapping.old_sale_number
      AND sale.sale_sequence_number = mapping.old_sequence_number
      AND sale.sale_period_key = mapping.old_period_key
    RETURNING sale.id
)
SELECT COUNT(*)::bigint AS updated_sale_count
FROM updated;

ALTER TABLE sales ENABLE TRIGGER trg_sales_sale_number_immutable;

CREATE TEMP TABLE bill_number_normalization_counter_result ON COMMIT DROP AS
WITH desired_counter AS (
    SELECT
        state.organization_id,
        state.store_id,
        state.current_financial_year AS period_key,
        state.current_fy_sale_count + 1 AS next_sequence_number
    FROM bill_number_normalization_state state
),
updated AS (
    INSERT INTO store_sale_sequences AS sequences (
        store_id,
        organization_id,
        period_key,
        next_sequence_number
    )
    SELECT
        store_id,
        organization_id,
        period_key,
        next_sequence_number
    FROM desired_counter
    ON CONFLICT (store_id, period_key)
    DO UPDATE SET
        next_sequence_number = EXCLUDED.next_sequence_number,
        updated_at = NOW()
    WHERE sequences.next_sequence_number < EXCLUDED.next_sequence_number
    RETURNING store_id
)
SELECT COUNT(*)::bigint AS updated_counter_count
FROM updated;

DO $postflight$
DECLARE
    expected_sale_count bigint;
    actual_sale_count bigint;
    expected_untouched_count bigint;
    actual_untouched_count bigint;
    expected_untouched_hash text;
    actual_untouched_hash text;
BEGIN
    SELECT COUNT(*) INTO expected_sale_count
    FROM bill_number_normalization_map;

    SELECT updated_sale_count INTO actual_sale_count
    FROM bill_number_normalization_update_result;

    IF actual_sale_count <> expected_sale_count THEN
        RAISE EXCEPTION 'Expected to normalize % Sales, updated %', expected_sale_count, actual_sale_count;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM bill_number_normalization_current_sales current_sales
        INNER JOIN sales sale ON sale.id = current_sales.sale_id
        WHERE sale.sale_period_key <> current_sales.current_financial_year
           OR sale.sale_number <> sale.sale_sequence_number::text
    ) THEN
        RAISE EXCEPTION 'A current-FY target Sale still has legacy numbering metadata';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM (
            SELECT
                COUNT(*)::bigint AS sale_count,
                COUNT(DISTINCT sale.sale_sequence_number)::bigint AS distinct_sequence_count,
                MIN(sale.sale_sequence_number)::bigint AS minimum_sequence,
                MAX(sale.sale_sequence_number)::bigint AS maximum_sequence
            FROM bill_number_normalization_target target
            INNER JOIN sales sale
                ON sale.organization_id = target.organization_id
               AND sale.store_id = target.store_id
               AND sale.status <> 'draft'
               AND sale.sale_period_key = target.current_financial_year
        ) normalized
        WHERE sale_count <> 44
           OR distinct_sequence_count <> sale_count
           OR minimum_sequence <> 1
           OR maximum_sequence <> sale_count
    ) THEN
        RAISE EXCEPTION 'Normalized Sale Numbers are not a complete contiguous 1..44 sequence';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM bill_number_normalization_state state
        LEFT JOIN store_sale_sequences sequences
            ON sequences.organization_id = state.organization_id
           AND sequences.store_id = state.store_id
           AND sequences.period_key = state.current_financial_year
        WHERE sequences.next_sequence_number IS DISTINCT FROM state.current_fy_sale_count + 1
    ) THEN
        RAISE EXCEPTION 'The normalized Store counter is not the next number after its FY Sales';
    END IF;

    SELECT sale_count, numbering_hash
    INTO expected_untouched_count, expected_untouched_hash
    FROM bill_number_normalization_untouched_fingerprint;

    SELECT
        COUNT(*)::bigint,
        MD5(STRING_AGG(
            sale.id::text || ':' || COALESCE(sale.sale_number, '-') || ':'
                || COALESCE(sale.sale_sequence_number::text, '-') || ':'
                || COALESCE(sale.sale_period_key, '-'),
            '|' ORDER BY sale.id
        ))
    INTO actual_untouched_count, actual_untouched_hash
    FROM sales sale
    WHERE NOT EXISTS (
        SELECT 1
        FROM bill_number_normalization_map mapping
        WHERE mapping.sale_id = sale.id
    );

    IF actual_untouched_count <> expected_untouched_count
       OR actual_untouched_hash IS DISTINCT FROM expected_untouched_hash THEN
        RAISE EXCEPTION 'An untargeted Sale Number record changed';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgrelid = 'sales'::regclass
          AND tgname = 'trg_sales_sale_number_immutable'
          AND tgenabled = 'O'
          AND NOT tgisinternal
    ) THEN
        RAISE EXCEPTION 'The committed Sale Number immutability trigger was not re-enabled';
    END IF;
END
$postflight$;

SELECT updated_sale_count AS sales_normalized
FROM bill_number_normalization_update_result;

SELECT updated_counter_count AS counters_updated
FROM bill_number_normalization_counter_result;

\if :apply_repair
COMMIT;
\else
ROLLBACK;
\endif
