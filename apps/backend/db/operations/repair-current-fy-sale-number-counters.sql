-- Manual, operator-run recovery for the August 2026 continuous-bucket incident.
-- Run with psql -v apply_repair=false for a rollback rehearsal, then true to commit.
\set ON_ERROR_STOP on

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

-- Block Sale, Store billing settings, and Sale Number counter writes while
-- the current-FY state is recalculated. Reads remain available.
LOCK TABLE sales, store_billing_settings, store_sale_sequences
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

CREATE TEMP TABLE bill_number_repair_state ON COMMIT DROP AS
WITH store_periods AS (
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
       AND sbs.organization_id = st.organization_id
),
current_fy_sales AS (
    SELECT
        sp.organization_id,
        sp.organization_name,
        sp.store_id,
        sp.store_name,
        sp.current_financial_year,
        s.sale_number,
        s.sale_sequence_number,
        s.sale_period_key
    FROM store_periods sp
    INNER JOIN sales s
        ON s.organization_id = sp.organization_id
       AND s.store_id = sp.store_id
    WHERE s.status <> 'draft'
      AND FORMAT(
          'FY%s-%s',
          TO_CHAR((s.committed_at AT TIME ZONE sp.timezone) - INTERVAL '3 months', 'YY'),
          TO_CHAR((s.committed_at AT TIME ZONE sp.timezone) + INTERVAL '9 months', 'YY')
      ) = sp.current_financial_year
),
totals AS (
    SELECT
        sp.organization_id,
        sp.organization_name,
        sp.store_id,
        sp.store_name,
        sp.current_financial_year,
        COUNT(cfys.sale_sequence_number)::bigint AS current_fy_bill_count,
        COUNT(cfys.sale_sequence_number) FILTER (
            WHERE cfys.sale_period_key <> sp.current_financial_year
        )::bigint AS legacy_current_fy_bill_count,
        COALESCE(MAX(cfys.sale_sequence_number), 0)::bigint AS max_actual_fy_sequence,
        COALESCE(MAX(cfys.sale_sequence_number) FILTER (
            WHERE cfys.sale_period_key = sp.current_financial_year
        ), 0)::bigint AS max_fy_bucket_sequence
    FROM store_periods sp
    LEFT JOIN current_fy_sales cfys
        ON cfys.organization_id = sp.organization_id
       AND cfys.store_id = sp.store_id
    GROUP BY
        sp.organization_id,
        sp.organization_name,
        sp.store_id,
        sp.store_name,
        sp.current_financial_year
),
printed_collisions AS (
    SELECT
        organization_id,
        store_id,
        COUNT(*)::bigint AS printed_collision_groups
    FROM (
        SELECT organization_id, store_id, current_financial_year, sale_number
        FROM current_fy_sales
        GROUP BY organization_id, store_id, current_financial_year, sale_number
        HAVING COUNT(*) > 1
    ) collision_groups
    GROUP BY organization_id, store_id
)
SELECT
    totals.organization_id,
    totals.organization_name,
    totals.store_id,
    totals.store_name,
    totals.current_financial_year,
    totals.current_fy_bill_count,
    totals.legacy_current_fy_bill_count,
    totals.max_actual_fy_sequence,
    totals.max_fy_bucket_sequence,
    sequences.next_sequence_number AS stored_fy_next_sequence,
    GREATEST(
        COALESCE(sequences.next_sequence_number, 1),
        totals.max_fy_bucket_sequence + 1
    )::bigint AS allocator_next_without_repair,
    (totals.max_actual_fy_sequence + 1)::bigint AS safe_next_sequence,
    COALESCE(printed_collisions.printed_collision_groups, 0)::bigint AS printed_collision_groups,
    (
        totals.legacy_current_fy_bill_count > 0
        AND totals.max_actual_fy_sequence + 1 > GREATEST(
            COALESCE(sequences.next_sequence_number, 1),
            totals.max_fy_bucket_sequence + 1
        )
    ) AS needs_counter_repair
FROM totals
LEFT JOIN store_sale_sequences sequences
    ON sequences.organization_id = totals.organization_id
   AND sequences.store_id = totals.store_id
   AND sequences.period_key = totals.current_financial_year
LEFT JOIN printed_collisions
    ON printed_collisions.organization_id = totals.organization_id
   AND printed_collisions.store_id = totals.store_id;

DO $validation$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM bill_number_repair_state repair
        INNER JOIN sales s
            ON s.organization_id = repair.organization_id
           AND s.store_id = repair.store_id
           AND s.status <> 'draft'
           AND s.sale_number = repair.safe_next_sequence::text
        LEFT JOIN store_billing_settings sbs
            ON sbs.organization_id = repair.organization_id
           AND sbs.store_id = repair.store_id
        WHERE repair.needs_counter_repair
          AND FORMAT(
              'FY%s-%s',
              TO_CHAR(
                  (s.committed_at AT TIME ZONE COALESCE(NULLIF(TRIM(sbs.sale_number_timezone), ''), 'Asia/Kolkata'))
                      - INTERVAL '3 months',
                  'YY'
              ),
              TO_CHAR(
                  (s.committed_at AT TIME ZONE COALESCE(NULLIF(TRIM(sbs.sale_number_timezone), ''), 'Asia/Kolkata'))
                      + INTERVAL '9 months',
                  'YY'
              )
          ) = repair.current_financial_year
    ) THEN
        RAISE EXCEPTION 'A proposed next printed Sale Number already exists in its actual financial year';
    END IF;
END
$validation$;

SELECT
    organization_name,
    store_name,
    current_financial_year,
    current_fy_bill_count,
    legacy_current_fy_bill_count,
    allocator_next_without_repair,
    safe_next_sequence,
    printed_collision_groups
FROM bill_number_repair_state
WHERE needs_counter_repair
ORDER BY safe_next_sequence, organization_name, store_name;

WITH updated AS (
    INSERT INTO store_sale_sequences AS sequences (
        store_id,
        organization_id,
        period_key,
        next_sequence_number
    )
    SELECT
        store_id,
        organization_id,
        current_financial_year,
        safe_next_sequence
    FROM bill_number_repair_state
    WHERE needs_counter_repair
    ON CONFLICT (store_id, period_key)
    DO UPDATE SET
        next_sequence_number = EXCLUDED.next_sequence_number,
        updated_at = NOW()
    WHERE sequences.next_sequence_number < EXCLUDED.next_sequence_number
    RETURNING store_id
)
SELECT COUNT(*) AS counters_updated
FROM updated;

DO $postflight$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM bill_number_repair_state repair
        LEFT JOIN store_sale_sequences sequences
            ON sequences.organization_id = repair.organization_id
           AND sequences.store_id = repair.store_id
           AND sequences.period_key = repair.current_financial_year
        WHERE repair.needs_counter_repair
          AND COALESCE(sequences.next_sequence_number, 0) < repair.safe_next_sequence
    ) THEN
        RAISE EXCEPTION 'A Sale Number counter remains below its safe target';
    END IF;
END
$postflight$;

\if :apply_repair
COMMIT;
\else
ROLLBACK;
\endif
