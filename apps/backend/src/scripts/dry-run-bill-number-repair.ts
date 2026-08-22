#!/usr/bin/env bun
/**
 * Read-only production report for the forced financial-year Sale Number rollout.
 *
 * It identifies the legacy period buckets that can make the current allocator
 * restart at 1, detects bill-number collisions, and previews the next safe
 * financial-year sequence number for every affected Store. It never mutates
 * production data: every query runs inside a PostgreSQL READ ONLY transaction.
 *
 * Usage:
 *   DATABASE_URL='...' bun run src/scripts/dry-run-bill-number-repair.ts
 *   DATABASE_URL='...' bun run src/scripts/dry-run-bill-number-repair.ts --store-id <uuid>
 *   DATABASE_URL='...' bun run src/scripts/dry-run-bill-number-repair.ts --organization-id <uuid> --limit 0
 *
 * `--limit 0` prints all collision and bucket-detail rows. The default is 200.
 */

import { SQL } from "bun";

type Arguments = {
  organizationId: string | null;
  storeId: string | null;
  limit: number;
};

type ReportRow = Record<string, unknown>;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_LIMIT = 200;

const usage = () => {
  console.log(`
Usage:
  DATABASE_URL='...' bun run src/scripts/dry-run-bill-number-repair.ts
  DATABASE_URL='...' bun run src/scripts/dry-run-bill-number-repair.ts --store-id <uuid>
  DATABASE_URL='...' bun run src/scripts/dry-run-bill-number-repair.ts --organization-id <uuid> --limit 0

Options:
  --organization-id <uuid>  Restrict the report to one Organization.
  --store-id <uuid>         Restrict the report to one Store.
  --limit <count>           Detail rows per section (default: ${DEFAULT_LIMIT}; 0: unlimited).
`);
};

const parseArguments = (args: string[]): Arguments => {
  const parsed: Arguments = {
    organizationId: null,
    storeId: null,
    limit: DEFAULT_LIMIT,
  };

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    const value = args[index + 1];

    if (argument === "--help" || argument === "-h") {
      usage();
      process.exit(0);
    }

    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${argument ?? "argument"}`);
    }

    switch (argument) {
      case "--organization-id":
        if (!UUID_PATTERN.test(value)) {
          throw new Error("--organization-id must be a UUID");
        }
        parsed.organizationId = value;
        break;
      case "--store-id":
        if (!UUID_PATTERN.test(value)) {
          throw new Error("--store-id must be a UUID");
        }
        parsed.storeId = value;
        break;
      case "--limit": {
        const parsedLimit = Number(value);
        if (!Number.isSafeInteger(parsedLimit) || parsedLimit < 0) {
          throw new Error(
            "--limit must be a whole number greater than or equal to 0",
          );
        }
        parsed.limit = parsedLimit;
        break;
      }
      default:
        throw new Error(`Unknown argument: ${argument ?? ""}`);
    }

    index += 1;
  }

  return parsed;
};

const printSection = (title: string, rows: ReportRow[]) => {
  console.log(`\n=== ${title} (${rows.length}) ===`);
  if (rows.length === 0) {
    console.log("None.");
    return;
  }
  console.table(rows);
};

const formatError = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const main = async () => {
  const { organizationId, storeId, limit } = parseArguments(
    process.argv.slice(2),
  );
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required; the script did not open a database connection.",
    );
  }

  const sqlLimit = limit === 0 ? 2_147_483_647 : limit;
  const pg = new SQL({ url: databaseUrl, max: 1 });

  try {
    const report = await pg.begin(
      "read only, isolation level repeatable read",
      async (tx) => {
        await tx`SET LOCAL statement_timeout = '60s'`;
        await tx`SET LOCAL idle_in_transaction_session_timeout = '60s'`;

        const [migration] = await tx`
                SELECT EXISTS (
                    SELECT 1
                    FROM schema_migrations
                    WHERE version = '20260821170000'
                ) AS financial_year_numbering_migration_applied
            `;

        const formatSummary = await tx`
                WITH scoped_sales AS (
                    SELECT
                        s.organization_id,
                        o.name AS organization_name,
                        s.store_id,
                        st.name AS store_name,
                        s.sale_number,
                        s.sale_sequence_number,
                        s.sale_period_key,
                        s.committed_at,
                        CASE
                            WHEN s.sale_number ~ '^[0-9]+$' THEN 'plain'
                            WHEN s.sale_number ~ '^FY[0-9]{2}-[0-9]{2}-[0-9]+$' THEN 'financial-year-prefixed'
                            WHEN s.sale_number ~ '^[0-9]{8}-[0-9]+$' THEN 'daily-prefixed'
                            ELSE 'other'
                        END AS bill_number_format
                    FROM sales s
                    INNER JOIN stores st ON st.id = s.store_id AND st.organization_id = s.organization_id
                    INNER JOIN organizations o ON o.id = s.organization_id
                    WHERE s.status <> 'draft'
                      AND (${organizationId}::uuid IS NULL OR s.organization_id = ${organizationId}::uuid)
                      AND (${storeId}::uuid IS NULL OR s.store_id = ${storeId}::uuid)
                )
                SELECT
                    organization_name,
                    organization_id,
                    store_name,
                    store_id,
                    sale_period_key,
                    bill_number_format,
                    COUNT(*)::int AS bill_count,
                    MIN(sale_sequence_number)::bigint AS first_sequence_number,
                    MAX(sale_sequence_number)::bigint AS last_sequence_number,
                    MIN(committed_at) AS first_committed_at,
                    MAX(committed_at) AS last_committed_at
                FROM scoped_sales
                GROUP BY
                    organization_name,
                    organization_id,
                    store_name,
                    store_id,
                    sale_period_key,
                    bill_number_format
                ORDER BY organization_name, store_name, last_committed_at DESC, sale_period_key
                LIMIT ${sqlLimit}
            `;

        const repairPreview = await tx`
                WITH store_periods AS (
                    SELECT
                        st.organization_id,
                        o.name AS organization_name,
                        st.id AS store_id,
                        st.name AS store_name,
                        COALESCE(NULLIF(TRIM(sbs.sale_number_timezone), ''), 'Asia/Kolkata') AS timezone,
                        FORMAT(
                            'FY%s-%s',
                            TO_CHAR((NOW() AT TIME ZONE COALESCE(NULLIF(TRIM(sbs.sale_number_timezone), ''), 'Asia/Kolkata')) - INTERVAL '3 months', 'YY'),
                            TO_CHAR((NOW() AT TIME ZONE COALESCE(NULLIF(TRIM(sbs.sale_number_timezone), ''), 'Asia/Kolkata')) + INTERVAL '9 months', 'YY')
                        ) AS current_financial_year
                    FROM stores st
                    INNER JOIN organizations o ON o.id = st.organization_id
                    LEFT JOIN store_billing_settings sbs
                        ON sbs.store_id = st.id AND sbs.organization_id = st.organization_id
                    WHERE (${organizationId}::uuid IS NULL OR st.organization_id = ${organizationId}::uuid)
                      AND (${storeId}::uuid IS NULL OR st.id = ${storeId}::uuid)
                ),
                sales_in_current_financial_year AS (
                    SELECT
                        sp.store_id,
                        sp.organization_id,
                        s.sale_number,
                        s.sale_sequence_number,
                        s.sale_period_key
                    FROM store_periods sp
                    INNER JOIN sales s
                        ON s.store_id = sp.store_id
                       AND s.organization_id = sp.organization_id
                    WHERE s.status <> 'draft'
                      AND FORMAT(
                            'FY%s-%s',
                            TO_CHAR((s.committed_at AT TIME ZONE sp.timezone) - INTERVAL '3 months', 'YY'),
                            TO_CHAR((s.committed_at AT TIME ZONE sp.timezone) + INTERVAL '9 months', 'YY')
                        ) = sp.current_financial_year
                ),
                sequence_totals AS (
                    SELECT
                        sp.organization_id,
                        sp.organization_name,
                        sp.store_id,
                        sp.store_name,
                        sp.timezone,
                        sp.current_financial_year,
                        COUNT(scfy.sale_number)::int AS bills_in_current_financial_year,
                        COUNT(*) FILTER (WHERE scfy.sale_period_key = sp.current_financial_year)::int AS bills_in_financial_year_bucket,
                        COUNT(*) FILTER (WHERE scfy.sale_period_key <> sp.current_financial_year)::int AS bills_in_legacy_buckets,
                        COALESCE(MAX(scfy.sale_sequence_number), 0)::bigint AS maximum_sequence_in_current_financial_year,
                        COALESCE(MAX(scfy.sale_sequence_number) FILTER (WHERE scfy.sale_period_key = sp.current_financial_year), 0)::bigint AS maximum_sequence_in_financial_year_bucket
                    FROM store_periods sp
                    LEFT JOIN sales_in_current_financial_year scfy
                        ON scfy.store_id = sp.store_id AND scfy.organization_id = sp.organization_id
                    GROUP BY
                        sp.organization_id,
                        sp.organization_name,
                        sp.store_id,
                        sp.store_name,
                        sp.timezone,
                        sp.current_financial_year
                )
                SELECT
                    totals.organization_name,
                    totals.organization_id,
                    totals.store_name,
                    totals.store_id,
                    totals.timezone,
                    totals.current_financial_year,
                    totals.bills_in_current_financial_year,
                    totals.bills_in_financial_year_bucket,
                    totals.bills_in_legacy_buckets,
                    totals.maximum_sequence_in_current_financial_year,
                    totals.maximum_sequence_in_financial_year_bucket,
                    sequences.next_sequence_number AS stored_financial_year_next_sequence_number,
                    GREATEST(
                        COALESCE(sequences.next_sequence_number, 1),
                        totals.maximum_sequence_in_financial_year_bucket + 1
                    )::bigint AS allocator_next_without_repair,
                    (totals.maximum_sequence_in_current_financial_year + 1)::bigint AS proposed_next_sequence_number,
                    (
                        totals.maximum_sequence_in_current_financial_year + 1
                        > GREATEST(
                            COALESCE(sequences.next_sequence_number, 1),
                            totals.maximum_sequence_in_financial_year_bucket + 1
                        )
                    ) AS needs_counter_repair
                FROM sequence_totals totals
                LEFT JOIN store_sale_sequences sequences
                    ON sequences.store_id = totals.store_id
                   AND sequences.organization_id = totals.organization_id
                   AND sequences.period_key = totals.current_financial_year
                WHERE totals.bills_in_legacy_buckets > 0
                   OR totals.maximum_sequence_in_current_financial_year + 1
                      > GREATEST(
                          COALESCE(sequences.next_sequence_number, 1),
                          totals.maximum_sequence_in_financial_year_bucket + 1
                      )
                ORDER BY needs_counter_repair DESC, proposed_next_sequence_number DESC, organization_name, store_name
                LIMIT ${sqlLimit}
            `;

        const printedNumberCollisions = await tx`
                WITH sales_in_current_financial_year AS (
                    SELECT
                        s.organization_id,
                        o.name AS organization_name,
                        s.store_id,
                        st.name AS store_name,
                        s.sale_number,
                        s.sale_period_key,
                        s.sale_sequence_number,
                        s.committed_at,
                        FORMAT(
                            'FY%s-%s',
                            TO_CHAR((s.committed_at AT TIME ZONE COALESCE(NULLIF(TRIM(sbs.sale_number_timezone), ''), 'Asia/Kolkata')) - INTERVAL '3 months', 'YY'),
                            TO_CHAR((s.committed_at AT TIME ZONE COALESCE(NULLIF(TRIM(sbs.sale_number_timezone), ''), 'Asia/Kolkata')) + INTERVAL '9 months', 'YY')
                        ) AS actual_financial_year
                    FROM sales s
                    INNER JOIN stores st ON st.id = s.store_id AND st.organization_id = s.organization_id
                    INNER JOIN organizations o ON o.id = s.organization_id
                    LEFT JOIN store_billing_settings sbs
                        ON sbs.store_id = s.store_id AND sbs.organization_id = s.organization_id
                    WHERE s.status <> 'draft'
                      AND (${organizationId}::uuid IS NULL OR s.organization_id = ${organizationId}::uuid)
                      AND (${storeId}::uuid IS NULL OR s.store_id = ${storeId}::uuid)
                )
                SELECT
                    organization_name,
                    organization_id,
                    store_name,
                    store_id,
                    actual_financial_year,
                    sale_number AS duplicated_printed_bill_number,
                    COUNT(*)::int AS bill_count,
                    ARRAY_AGG(DISTINCT sale_period_key ORDER BY sale_period_key) AS period_keys,
                    MIN(committed_at) AS first_committed_at,
                    MAX(committed_at) AS last_committed_at
                FROM sales_in_current_financial_year
                GROUP BY organization_name, organization_id, store_name, store_id, actual_financial_year, sale_number
                HAVING COUNT(*) > 1
                ORDER BY bill_count DESC, organization_name, store_name, actual_financial_year, sale_number
                LIMIT ${sqlLimit}
            `;

        const sequenceCollisions = await tx`
                WITH sales_in_current_financial_year AS (
                    SELECT
                        s.id,
                        s.organization_id,
                        o.name AS organization_name,
                        s.store_id,
                        st.name AS store_name,
                        s.sale_number,
                        s.sale_period_key,
                        s.sale_sequence_number,
                        s.committed_at,
                        FORMAT(
                            'FY%s-%s',
                            TO_CHAR((s.committed_at AT TIME ZONE COALESCE(NULLIF(TRIM(sbs.sale_number_timezone), ''), 'Asia/Kolkata')) - INTERVAL '3 months', 'YY'),
                            TO_CHAR((s.committed_at AT TIME ZONE COALESCE(NULLIF(TRIM(sbs.sale_number_timezone), ''), 'Asia/Kolkata')) + INTERVAL '9 months', 'YY')
                        ) AS actual_financial_year
                    FROM sales s
                    INNER JOIN stores st ON st.id = s.store_id AND st.organization_id = s.organization_id
                    INNER JOIN organizations o ON o.id = s.organization_id
                    LEFT JOIN store_billing_settings sbs
                        ON sbs.store_id = s.store_id AND sbs.organization_id = s.organization_id
                    WHERE s.status <> 'draft'
                      AND (${organizationId}::uuid IS NULL OR s.organization_id = ${organizationId}::uuid)
                      AND (${storeId}::uuid IS NULL OR s.store_id = ${storeId}::uuid)
                )
                SELECT
                    organization_name,
                    organization_id,
                    store_name,
                    store_id,
                    actual_financial_year,
                    sale_sequence_number AS duplicated_sequence_number,
                    COUNT(*)::int AS bill_count,
                    ARRAY_AGG(DISTINCT sale_number ORDER BY sale_number) AS printed_bill_numbers,
                    ARRAY_AGG(DISTINCT sale_period_key ORDER BY sale_period_key) AS period_keys,
                    MIN(committed_at) AS first_committed_at,
                    MAX(committed_at) AS last_committed_at
                FROM sales_in_current_financial_year
                GROUP BY organization_name, organization_id, store_name, store_id, actual_financial_year, sale_sequence_number
                HAVING COUNT(*) > 1
                ORDER BY bill_count DESC, organization_name, store_name, actual_financial_year, duplicated_sequence_number
                LIMIT ${sqlLimit}
            `;

        return {
          migration,
          formatSummary,
          repairPreview,
          printedNumberCollisions,
          sequenceCollisions,
        };
      },
    );

    console.log(
      "Bill-number repair dry run completed in a READ ONLY transaction. No production data was changed.",
    );
    console.log(
      `Scope: organization=${organizationId ?? "all"}, store=${storeId ?? "all"}, detail limit=${limit === 0 ? "unlimited" : limit}`,
    );
    console.log(
      `Financial-year numbering migration applied: ${String(report.migration?.financial_year_numbering_migration_applied ?? false)}`,
    );
    printSection(
      "Bill-number formats and persisted period buckets",
      report.formatSummary,
    );
    printSection(
      "Stores whose current-FY counter needs review or repair",
      report.repairPreview,
    );
    printSection(
      "Exact duplicate printed bill numbers in the same actual financial year",
      report.printedNumberCollisions,
    );
    printSection(
      "Duplicate sequence numbers in the same actual financial year",
      report.sequenceCollisions,
    );
  } finally {
    await pg.end();
  }
};

main().catch((error) => {
  console.error(`Bill-number dry run failed: ${formatError(error)}`);
  process.exitCode = 1;
});
