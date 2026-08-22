-- Manual, operator-run historical remediation for the August 2026
-- continuous-bucket Sale Number incident.
--
-- Run with psql -v apply_repair=false for a rollback rehearsal, then true to
-- commit. The operation is intentionally scoped to the known incident shape:
-- one legacy and one FY-bucket Sale for each duplicated printed number.
\set ON_ERROR_STOP on

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

-- The immutable-number trigger must be bypassed for the selected historical
-- Sales, so take an exclusive lock before building the remap. Reads and writes
-- resume after this short transaction.
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

    IF EXISTS (
        SELECT 1
        FROM sales
        WHERE status <> 'draft'
          AND (
              sale_number IS NULL
              OR sale_sequence_number IS NULL
              OR sale_period_key IS NULL
          )
    ) THEN
        RAISE EXCEPTION 'Committed Sale Number metadata is incomplete';
    END IF;
END
$validation$;

CREATE TEMP TABLE bill_number_repair_store_periods ON COMMIT DROP AS
SELECT
    st.organization_id,
    o.name AS organization_name,
    st.id AS store_id,
    st.name AS store_name,
    COALESCE(NULLIF(TRIM(sbs.sale_number_timezone), ''), 'Asia/Kolkata') AS timezone,
    FORMAT(
        'FY%s-%s',
        TO_CHAR(
            (transaction_timestamp() AT TIME ZONE COALESCE(NULLIF(TRIM(sbs.sale_number_timezone), ''), 'Asia/Kolkata'))
                - INTERVAL '3 months',
            'YY'
        ),
        TO_CHAR(
            (transaction_timestamp() AT TIME ZONE COALESCE(NULLIF(TRIM(sbs.sale_number_timezone), ''), 'Asia/Kolkata'))
                + INTERVAL '9 months',
            'YY'
        )
    ) AS current_financial_year
FROM stores st
INNER JOIN organizations o ON o.id = st.organization_id
LEFT JOIN store_billing_settings sbs
    ON sbs.store_id = st.id
   AND sbs.organization_id = st.organization_id;

CREATE TEMP TABLE bill_number_repair_current_fy_sales ON COMMIT DROP AS
SELECT
    s.id AS sale_id,
    periods.organization_id,
    periods.organization_name,
    periods.store_id,
    periods.store_name,
    periods.current_financial_year,
    s.sale_number,
    s.sale_sequence_number,
    s.sale_period_key,
    s.committed_at
FROM bill_number_repair_store_periods periods
INNER JOIN sales s
    ON s.organization_id = periods.organization_id
   AND s.store_id = periods.store_id
WHERE s.status <> 'draft'
  AND FORMAT(
      'FY%s-%s',
      TO_CHAR((s.committed_at AT TIME ZONE periods.timezone) - INTERVAL '3 months', 'YY'),
      TO_CHAR((s.committed_at AT TIME ZONE periods.timezone) + INTERVAL '9 months', 'YY')
  ) = periods.current_financial_year;

CREATE TEMP TABLE bill_number_repair_collision_groups ON COMMIT DROP AS
SELECT
    organization_id,
    store_id,
    current_financial_year,
    sale_number,
    COUNT(*)::bigint AS sale_count,
    COUNT(*) FILTER (
        WHERE sale_period_key = current_financial_year
    )::bigint AS fy_bucket_sale_count,
    COUNT(*) FILTER (
        WHERE sale_period_key = 'continuous'
    )::bigint AS continuous_bucket_sale_count,
    COUNT(*) FILTER (
        WHERE sale_period_key <> current_financial_year
          AND sale_period_key <> 'continuous'
    )::bigint AS unexpected_bucket_sale_count
FROM bill_number_repair_current_fy_sales
GROUP BY organization_id, store_id, current_financial_year, sale_number
HAVING COUNT(*) > 1;

CREATE TEMP TABLE bill_number_repair_affected_stores ON COMMIT DROP AS
SELECT
    collisions.organization_id,
    periods.organization_name,
    collisions.store_id,
    periods.store_name,
    collisions.current_financial_year,
    COUNT(*)::bigint AS printed_collision_groups,
    legacy.legacy_max_sequence
FROM bill_number_repair_collision_groups collisions
INNER JOIN bill_number_repair_store_periods periods
    ON periods.organization_id = collisions.organization_id
   AND periods.store_id = collisions.store_id
INNER JOIN LATERAL (
    SELECT MAX(current_sales.sale_sequence_number)::bigint AS legacy_max_sequence
    FROM bill_number_repair_current_fy_sales current_sales
    WHERE current_sales.organization_id = collisions.organization_id
      AND current_sales.store_id = collisions.store_id
      AND current_sales.sale_period_key = 'continuous'
) legacy ON TRUE
GROUP BY
    collisions.organization_id,
    periods.organization_name,
    collisions.store_id,
    periods.store_name,
    collisions.current_financial_year,
    legacy.legacy_max_sequence;

CREATE TEMP TABLE bill_number_repair_sale_map ON COMMIT DROP AS
SELECT
    current_sales.sale_id,
    current_sales.organization_id,
    current_sales.store_id,
    current_sales.sale_number AS old_sale_number,
    current_sales.sale_sequence_number AS old_sequence_number,
    current_sales.sale_period_key,
    affected.legacy_max_sequence + current_sales.sale_sequence_number AS new_sequence_number,
    (affected.legacy_max_sequence + current_sales.sale_sequence_number)::text AS new_sale_number
FROM bill_number_repair_current_fy_sales current_sales
INNER JOIN bill_number_repair_affected_stores affected
    ON affected.organization_id = current_sales.organization_id
   AND affected.store_id = current_sales.store_id
WHERE current_sales.sale_period_key = affected.current_financial_year;

DO $validation$
DECLARE
    affected_store_count bigint;
    collision_group_count bigint;
BEGIN
    SELECT COUNT(*), COALESCE(SUM(printed_collision_groups), 0)
    INTO affected_store_count, collision_group_count
    FROM bill_number_repair_affected_stores;

    IF affected_store_count = 0 AND collision_group_count = 0 THEN
        RETURN;
    END IF;

    IF affected_store_count <> 3 OR collision_group_count <> 46 THEN
        RAISE EXCEPTION
            'Collision scope changed: expected 3 Stores and 46 groups, found % Stores and % groups',
            affected_store_count,
            collision_group_count;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM bill_number_repair_collision_groups
        WHERE sale_count <> 2
           OR fy_bucket_sale_count <> 1
           OR continuous_bucket_sale_count <> 1
           OR unexpected_bucket_sale_count <> 0
    ) THEN
        RAISE EXCEPTION 'A duplicate does not match the expected one-continuous/one-FY incident shape';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM bill_number_repair_affected_stores affected
        LEFT JOIN LATERAL (
            SELECT
                COUNT(*)::bigint AS mapped_sale_count,
                COUNT(DISTINCT old_sequence_number)::bigint AS distinct_sequence_count,
                MIN(old_sequence_number)::bigint AS minimum_sequence,
                MAX(old_sequence_number)::bigint AS maximum_sequence
            FROM bill_number_repair_sale_map mapping
            WHERE mapping.organization_id = affected.organization_id
              AND mapping.store_id = affected.store_id
        ) mapped ON TRUE
        WHERE mapped.mapped_sale_count <> affected.printed_collision_groups
           OR mapped.distinct_sequence_count <> mapped.mapped_sale_count
           OR mapped.minimum_sequence <> 1
           OR mapped.maximum_sequence <> mapped.mapped_sale_count
    ) THEN
        RAISE EXCEPTION 'FY-bucket Sales are not a complete contiguous 1..N duplicate sequence';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM bill_number_repair_sale_map mapping
        WHERE mapping.old_sale_number <> mapping.old_sequence_number::text
    ) THEN
        RAISE EXCEPTION 'A remapped FY-bucket Sale does not have a plain numeric printed number';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM bill_number_repair_sale_map mapping
        INNER JOIN bill_number_repair_current_fy_sales current_sales
            ON current_sales.organization_id = mapping.organization_id
           AND current_sales.store_id = mapping.store_id
           AND current_sales.sale_id <> mapping.sale_id
           AND (
               current_sales.sale_number = mapping.new_sale_number
               OR (
                   current_sales.sale_period_key = mapping.sale_period_key
                   AND current_sales.sale_sequence_number = mapping.new_sequence_number
               )
           )
        WHERE NOT EXISTS (
            SELECT 1
            FROM bill_number_repair_sale_map other_mapping
            WHERE other_mapping.sale_id = current_sales.sale_id
        )
    ) THEN
        RAISE EXCEPTION 'A proposed remapped Sale Number collides with an unmodified Sale';
    END IF;
END
$validation$;

CREATE TEMP TABLE bill_number_repair_untouched_fingerprint ON COMMIT DROP AS
SELECT
    COUNT(*)::bigint AS sale_count,
    MD5(STRING_AGG(
        s.id::text || ':' || COALESCE(s.sale_number, '-') || ':'
            || COALESCE(s.sale_sequence_number::text, '-') || ':'
            || COALESCE(s.sale_period_key, '-'),
        '|' ORDER BY s.id
    )) AS numbering_hash
FROM sales s
WHERE NOT EXISTS (
    SELECT 1
    FROM bill_number_repair_sale_map mapping
    WHERE mapping.sale_id = s.id
);

SELECT
    affected.organization_name,
    affected.store_name,
    affected.current_financial_year,
    affected.printed_collision_groups AS sales_to_renumber,
    MIN(mapping.old_sequence_number) AS old_first_number,
    MAX(mapping.old_sequence_number) AS old_last_number,
    MIN(mapping.new_sequence_number) AS new_first_number,
    MAX(mapping.new_sequence_number) AS new_last_number,
    MAX(mapping.new_sequence_number) + 1 AS new_counter_next
FROM bill_number_repair_affected_stores affected
INNER JOIN bill_number_repair_sale_map mapping
    ON mapping.organization_id = affected.organization_id
   AND mapping.store_id = affected.store_id
GROUP BY
    affected.organization_id,
    affected.organization_name,
    affected.store_id,
    affected.store_name,
    affected.current_financial_year,
    affected.printed_collision_groups
ORDER BY new_counter_next, affected.organization_name, affected.store_name;

ALTER TABLE sales DISABLE TRIGGER trg_sales_sale_number_immutable;

CREATE TEMP TABLE bill_number_repair_update_result ON COMMIT DROP AS
WITH updated AS (
    UPDATE sales sale
    SET
        sale_number = mapping.new_sale_number,
        sale_sequence_number = mapping.new_sequence_number
    FROM bill_number_repair_sale_map mapping
    WHERE sale.id = mapping.sale_id
      AND sale.organization_id = mapping.organization_id
      AND sale.store_id = mapping.store_id
      AND sale.sale_number = mapping.old_sale_number
      AND sale.sale_sequence_number = mapping.old_sequence_number
      AND sale.sale_period_key = mapping.sale_period_key
    RETURNING sale.id
)
SELECT COUNT(*)::bigint AS updated_sale_count
FROM updated;

ALTER TABLE sales ENABLE TRIGGER trg_sales_sale_number_immutable;

CREATE TEMP TABLE bill_number_repair_counter_result ON COMMIT DROP AS
WITH desired_counters AS (
    SELECT
        mapping.organization_id,
        mapping.store_id,
        mapping.sale_period_key,
        MAX(mapping.new_sequence_number) + 1 AS next_sequence_number
    FROM bill_number_repair_sale_map mapping
    GROUP BY mapping.organization_id, mapping.store_id, mapping.sale_period_key
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
        sale_period_key,
        next_sequence_number
    FROM desired_counters
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
    FROM bill_number_repair_sale_map;

    SELECT updated_sale_count INTO actual_sale_count
    FROM bill_number_repair_update_result;

    IF actual_sale_count <> expected_sale_count THEN
        RAISE EXCEPTION 'Expected to update % Sales, updated %', expected_sale_count, actual_sale_count;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM bill_number_repair_sale_map mapping
        INNER JOIN sales sale ON sale.id = mapping.sale_id
        WHERE sale.sale_number <> mapping.new_sale_number
           OR sale.sale_sequence_number <> mapping.new_sequence_number
           OR sale.sale_period_key <> mapping.sale_period_key
    ) THEN
        RAISE EXCEPTION 'A remapped Sale does not contain its expected new number';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM bill_number_repair_store_periods periods
        INNER JOIN sales sale
            ON sale.organization_id = periods.organization_id
           AND sale.store_id = periods.store_id
           AND sale.status <> 'draft'
        WHERE FORMAT(
            'FY%s-%s',
            TO_CHAR((sale.committed_at AT TIME ZONE periods.timezone) - INTERVAL '3 months', 'YY'),
            TO_CHAR((sale.committed_at AT TIME ZONE periods.timezone) + INTERVAL '9 months', 'YY')
        ) = periods.current_financial_year
        GROUP BY sale.organization_id, sale.store_id, periods.current_financial_year, sale.sale_number
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'A duplicate printed Sale Number remains in the current actual financial year';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM (
            SELECT
                mapping.organization_id,
                mapping.store_id,
                mapping.sale_period_key,
                MAX(mapping.new_sequence_number) + 1 AS expected_next_sequence
            FROM bill_number_repair_sale_map mapping
            GROUP BY mapping.organization_id, mapping.store_id, mapping.sale_period_key
        ) expected
        LEFT JOIN store_sale_sequences sequences
            ON sequences.organization_id = expected.organization_id
           AND sequences.store_id = expected.store_id
           AND sequences.period_key = expected.sale_period_key
        WHERE sequences.next_sequence_number IS DISTINCT FROM expected.expected_next_sequence
    ) THEN
        RAISE EXCEPTION 'A remediated Store counter does not equal its expected next number';
    END IF;

    SELECT sale_count, numbering_hash
    INTO expected_untouched_count, expected_untouched_hash
    FROM bill_number_repair_untouched_fingerprint;

    SELECT
        COUNT(*)::bigint,
        MD5(STRING_AGG(
            s.id::text || ':' || COALESCE(s.sale_number, '-') || ':'
                || COALESCE(s.sale_sequence_number::text, '-') || ':'
                || COALESCE(s.sale_period_key, '-'),
            '|' ORDER BY s.id
        ))
    INTO actual_untouched_count, actual_untouched_hash
    FROM sales s
    WHERE NOT EXISTS (
        SELECT 1
        FROM bill_number_repair_sale_map mapping
        WHERE mapping.sale_id = s.id
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

SELECT updated_sale_count AS sales_renumbered
FROM bill_number_repair_update_result;

SELECT updated_counter_count AS counters_updated
FROM bill_number_repair_counter_result;

\if :apply_repair
COMMIT;
\else
ROLLBACK;
\endif
