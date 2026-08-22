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
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

type Arguments = {
  organizationId: string | null;
  storeId: string | null;
  limit: number;
  outputDirectory: string | null;
};

type ReportRow = Record<string, unknown>;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_LIMIT = 200;
const DEFAULT_REPORT_DIRECTORY = resolve(
  import.meta.dir,
  "..",
  "..",
  "reports",
  "bill-number-dry-run",
);

const usage = () => {
  console.log(`
Usage:
  DATABASE_URL='...' bun run src/scripts/dry-run-bill-number-repair.ts
  DATABASE_URL='...' bun run src/scripts/dry-run-bill-number-repair.ts --store-id <uuid>
  DATABASE_URL='...' bun run src/scripts/dry-run-bill-number-repair.ts --organization-id <uuid> --limit 0
  DATABASE_URL='...' bun run src/scripts/dry-run-bill-number-repair.ts --output-dir ./reports

Options:
  --organization-id <uuid>  Restrict the report to one Organization.
  --store-id <uuid>         Restrict the report to one Store.
  --limit <count>           Detail rows per section (default: ${DEFAULT_LIMIT}; 0: unlimited).
  --output-dir <path>       Parent folder for the timestamped report export.
`);
};

const parseArguments = (args: string[]): Arguments => {
  const parsed: Arguments = {
    organizationId: null,
    storeId: null,
    limit: DEFAULT_LIMIT,
    outputDirectory: null,
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
      case "--output-dir":
        parsed.outputDirectory = value;
        break;
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

const slugifyPathSegment = (value: unknown, fallback: string) => {
  const slug = String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return slug || fallback;
};

const shortId = (value: unknown) => String(value ?? "unknown").slice(0, 8);

const reportTimestamp = () => new Date().toISOString().replace(/[:.]/g, "-");

const writeJson = (filePath: string, value: unknown) => {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

const csvCell = (value: unknown) => {
  if (value === null || value === undefined) {
    return "";
  }

  const text = value instanceof Date ? value.toISOString() : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

const toCsv = (rows: ReportRow[]) => {
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const header = columns.map(csvCell).join(",");
  const dataRows = rows.map((row) =>
    columns.map((column) => csvCell(row[column])).join(","),
  );

  return `${[header, ...dataRows].join("\n")}\n`;
};

const writeStoreSummary = (
  filePath: string,
  store: ReportRow,
  repairPreview: ReportRow | undefined,
  billCount: number,
  printedCollisionCount: number,
  sequenceCollisionCount: number,
) => {
  const lines = [
    `# Bill-number dry run: ${String(store.organization_name)} / ${String(store.store_name)}`,
    "",
    `- Organization ID: \`${String(store.organization_id)}\``,
    `- Store ID: \`${String(store.store_id)}\``,
    `- Bills exported: ${billCount}`,
    `- Exact duplicate printed bill numbers: ${printedCollisionCount}`,
    `- Duplicate sequence numbers: ${sequenceCollisionCount}`,
  ];

  if (repairPreview) {
    lines.push(
      `- Current financial year: ${String(repairPreview.current_financial_year)}`,
      `- Current allocator next number: ${String(repairPreview.allocator_next_without_repair)}`,
      `- Proposed safe next number: ${String(repairPreview.proposed_next_sequence_number)}`,
      `- Counter repair needed: ${String(repairPreview.needs_counter_repair)}`,
    );
  } else {
    lines.push(
      "- Counter repair needed: no current-financial-year risk detected.",
    );
  }

  lines.push(
    "",
    "`report.json` contains the complete structured Store report. `bills.csv` lists every committed bill in this export scope.",
  );
  writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
};

const writeReportExport = (
  report: Record<string, ReportRow[]>,
  outputDirectory: string | null,
  scope: Pick<Arguments, "organizationId" | "storeId">,
) => {
  const runDirectory = join(
    outputDirectory ? resolve(outputDirectory) : DEFAULT_REPORT_DIRECTORY,
    `run-${reportTimestamp()}`,
  );
  const organizationsDirectory = join(runDirectory, "organizations");
  mkdirSync(organizationsDirectory, { recursive: true });

  const storeDirectories: Array<Record<string, unknown>> = [];
  const storesByOrganization = new Map<string, ReportRow[]>();
  for (const store of report.storeDirectory) {
    const organizationId = String(store.organization_id);
    const stores = storesByOrganization.get(organizationId) ?? [];
    stores.push(store);
    storesByOrganization.set(organizationId, stores);
  }

  for (const [organizationId, stores] of storesByOrganization) {
    const organization = stores[0];
    const organizationDirectory = join(
      organizationsDirectory,
      `${slugifyPathSegment(organization?.organization_name, "organization")}-${shortId(organizationId)}`,
    );
    const storesDirectory = join(organizationDirectory, "stores");
    mkdirSync(storesDirectory, { recursive: true });

    writeJson(join(organizationDirectory, "organization.json"), {
      organizationId,
      organizationName: organization?.organization_name,
      storeCount: stores.length,
    });

    for (const store of stores) {
      const storeId = String(store.store_id);
      const storeDirectory = join(
        storesDirectory,
        `${slugifyPathSegment(store.store_name, "store")}-${shortId(storeId)}`,
      );
      mkdirSync(storeDirectory, { recursive: true });

      const matchesStore = (row: ReportRow) => String(row.store_id) === storeId;
      const bills = report.bills.filter(matchesStore);
      const formatSummary = report.formatSummary.filter(matchesStore);
      const repairPreview = report.repairPreview.find(matchesStore);
      const printedNumberCollisions =
        report.printedNumberCollisions.filter(matchesStore);
      const sequenceCollisions = report.sequenceCollisions.filter(matchesStore);
      const storeReport = {
        generatedAt: new Date().toISOString(),
        store,
        repairPreview: repairPreview ?? null,
        formatSummary,
        exactPrintedBillNumberCollisions: printedNumberCollisions,
        duplicateSequenceNumberCollisions: sequenceCollisions,
        billCount: bills.length,
      };

      writeJson(join(storeDirectory, "report.json"), storeReport);
      writeJson(
        join(storeDirectory, "duplicate-printed-bill-numbers.json"),
        printedNumberCollisions,
      );
      writeJson(
        join(storeDirectory, "duplicate-sequence-numbers.json"),
        sequenceCollisions,
      );
      writeFileSync(join(storeDirectory, "bills.csv"), toCsv(bills), "utf8");
      writeStoreSummary(
        join(storeDirectory, "SUMMARY.md"),
        store,
        repairPreview,
        bills.length,
        printedNumberCollisions.length,
        sequenceCollisions.length,
      );

      storeDirectories.push({
        organizationId,
        organizationName: store.organization_name,
        storeId,
        storeName: store.store_name,
        path: storeDirectory,
        billCount: bills.length,
        needsCounterRepair: repairPreview?.needs_counter_repair ?? false,
        proposedNextSequenceNumber:
          repairPreview?.proposed_next_sequence_number ?? null,
        exactPrintedBillNumberCollisionCount: printedNumberCollisions.length,
        sequenceCollisionCount: sequenceCollisions.length,
      });
    }
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    scope,
    databaseMutations:
      "none; report queries ran in a PostgreSQL READ ONLY transaction",
    storeCount: storeDirectories.length,
    billCount: report.bills.length,
    stores: storeDirectories,
  };
  writeJson(join(runDirectory, "manifest.json"), manifest);
  writeFileSync(
    join(runDirectory, "README.md"),
    `# Bill-number dry-run export\n\nGenerated: ${manifest.generatedAt}\n\n` +
      "This report contains no database mutation. Each Organization and Store has its own folder. " +
      "Open a Store's `SUMMARY.md` first, then share its `report.json` and `bills.csv` when deeper analysis is needed.\n",
    "utf8",
  );

  return runDirectory;
};

const main = async () => {
  const { organizationId, storeId, limit, outputDirectory } = parseArguments(
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

        const storeDirectory = await tx`
                SELECT
                    st.organization_id,
                    o.name AS organization_name,
                    st.id AS store_id,
                    st.name AS store_name,
                    COALESCE(NULLIF(TRIM(sbs.sale_number_timezone), ''), 'Asia/Kolkata') AS timezone
                FROM stores st
                INNER JOIN organizations o ON o.id = st.organization_id
                LEFT JOIN store_billing_settings sbs
                    ON sbs.store_id = st.id AND sbs.organization_id = st.organization_id
                WHERE (${organizationId}::uuid IS NULL OR st.organization_id = ${organizationId}::uuid)
                  AND (${storeId}::uuid IS NULL OR st.id = ${storeId}::uuid)
                ORDER BY o.name, st.name, st.id
            `;

        const bills = await tx`
                WITH scoped_sales AS (
                    SELECT
                        s.id AS sale_id,
                        s.organization_id,
                        o.name AS organization_name,
                        s.store_id,
                        st.name AS store_name,
                        s.status::text AS sale_status,
                        s.sale_number,
                        s.sale_sequence_number,
                        s.sale_period_key,
                        s.committed_at,
                        COALESCE(NULLIF(TRIM(sbs.sale_number_timezone), ''), 'Asia/Kolkata') AS timezone
                    FROM sales s
                    INNER JOIN stores st ON st.id = s.store_id AND st.organization_id = s.organization_id
                    INNER JOIN organizations o ON o.id = s.organization_id
                    LEFT JOIN store_billing_settings sbs
                        ON sbs.store_id = s.store_id AND sbs.organization_id = s.organization_id
                    WHERE s.status <> 'draft'
                      AND (${organizationId}::uuid IS NULL OR s.organization_id = ${organizationId}::uuid)
                      AND (${storeId}::uuid IS NULL OR s.store_id = ${storeId}::uuid)
                ),
                classified_sales AS (
                    SELECT
                        *,
                        FORMAT(
                            'FY%s-%s',
                            TO_CHAR((committed_at AT TIME ZONE timezone) - INTERVAL '3 months', 'YY'),
                            TO_CHAR((committed_at AT TIME ZONE timezone) + INTERVAL '9 months', 'YY')
                        ) AS actual_financial_year,
                        CASE
                            WHEN sale_number ~ '^[0-9]+$' THEN 'plain'
                            WHEN sale_number ~ '^FY[0-9]{2}-[0-9]{2}-[0-9]+$' THEN 'financial-year-prefixed'
                            WHEN sale_number ~ '^[0-9]{8}-[0-9]+$' THEN 'daily-prefixed'
                            ELSE 'other'
                        END AS bill_number_format
                    FROM scoped_sales
                )
                SELECT
                    sale_id,
                    organization_id,
                    organization_name,
                    store_id,
                    store_name,
                    sale_status,
                    sale_number,
                    sale_sequence_number,
                    sale_period_key,
                    actual_financial_year,
                    (sale_period_key <> actual_financial_year) AS is_legacy_period_for_actual_financial_year,
                    bill_number_format,
                    timezone,
                    committed_at
                FROM classified_sales
                ORDER BY organization_name, store_name, committed_at, sale_id
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
          storeDirectory,
          bills,
          formatSummary,
          repairPreview,
          printedNumberCollisions,
          sequenceCollisions,
        };
      },
    );

    const reportDirectory = writeReportExport(
      {
        storeDirectory: report.storeDirectory,
        bills: report.bills,
        formatSummary: report.formatSummary,
        repairPreview: report.repairPreview,
        printedNumberCollisions: report.printedNumberCollisions,
        sequenceCollisions: report.sequenceCollisions,
      },
      outputDirectory,
      { organizationId, storeId },
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
    console.log(`Shareable report files written to: ${reportDirectory}`);
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
