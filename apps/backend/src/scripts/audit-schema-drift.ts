#!/usr/bin/env bun

import { readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pg } from "@/config/db";

type ExpectedColumn = { table: string; column: string };

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("[schema-audit] DATABASE_URL is required");
  process.exit(1);
}

const migrationsDirectory = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../db/migrations",
);

const migrationFiles = readdirSync(migrationsDirectory)
  .filter((file) => file.endsWith(".sql"))
  .sort();

const upSql = (file: string): string => {
  const sql = readFileSync(join(migrationsDirectory, file), "utf8");
  return sql.split(/--\s*migrate:down/i, 1)[0];
};

const unquote = (value: string): string => value.replace(/^"|"$/g, "");

const createdTables = new Set<string>();
const createdTypes = new Set<string>();

for (const file of migrationFiles) {
  const sql = upSql(file);

  for (const match of sql.matchAll(
    /\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w."]+)/gi,
  )) {
    createdTables.add(unquote(match[1].split(".").at(-1) ?? match[1]));
  }

  for (const match of sql.matchAll(
    /\bCREATE\s+TYPE\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w."]+)/gi,
  )) {
    createdTypes.add(unquote(match[1].split(".").at(-1) ?? match[1]));
  }
}

// These are the columns used by the billing/KOT code path that recently failed.
// Keep them explicit so this check stays meaningful even when old migrations
// later add and remove columns.
const requiredColumns: ExpectedColumn[] = [
  { table: "sales", column: "service_mode" },
  { table: "kots", column: "table_order_id" },
  { table: "kots", column: "kitchen_completed_at" },
  { table: "kots", column: "fulfillment_type" },
  { table: "kots", column: "sale_batch_sequence" },
  { table: "service_tables", column: "service_area_id" },
];

// Keep these queries sequential. Bun's PostgreSQL client can crash when one
// SQL instance opens several concurrent queries against the same connection.
const identity = await pg`
  SELECT current_database() AS database,
         current_schema() AS schema,
         current_setting('search_path') AS search_path,
         inet_server_addr()::text AS server
`;
const tables = await pg`
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
`;
const types = await pg`
  SELECT typname AS type_name
  FROM pg_type
  WHERE typnamespace = 'public'::regnamespace
`;
const columns = await pg`
  SELECT table_name, column_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
`;
const migrationRows = await pg`
  SELECT version::text AS version
  FROM schema_migrations
  ORDER BY version
`;

const actualTables = new Set(tables.map((row) => String(row.table_name)));
const actualTypes = new Set(types.map((row) => String(row.type_name)));
const actualColumns = new Set(
  columns.map((row) => `${row.table_name}.${row.column_name}`),
);
const recordedMigrations = new Set(
  migrationRows.map((row) => String(row.version).replace(/\.sql$/, "")),
);
const fileMigrations = new Set(
  migrationFiles.map((file) => basename(file, ".sql").split("_", 1)[0]),
);

// These tables were renamed by later migrations and therefore are not
// expected to exist under their original migration names.
const renamedTables = new Map([
  ["owner_users", "console_users"],
  ["store_sale_counters", "store_sale_sequences"],
]);

const missingTables = [...createdTables]
  .filter((table) => !renamedTables.has(table))
  .filter((table) => !actualTables.has(table));
const missingTypes = [...createdTypes].filter(
  (type) => !actualTypes.has(type),
);
const missingColumns = requiredColumns
  .filter(({ table, column }) => !actualColumns.has(`${table}.${column}`))
  .map(({ table, column }) => `${table}.${column}`);
const pendingMigrations = [...fileMigrations].filter(
  (migration) => !recordedMigrations.has(migration),
);
const recordedWithoutFile = [...recordedMigrations].filter(
  (migration) => !fileMigrations.has(migration),
);

const report = {
  identity: identity[0] ?? null,
  migrationLedger: {
    recorded: recordedMigrations.size,
    files: fileMigrations.size,
    pendingMigrations,
    recordedWithoutFile,
  },
  missingTables,
  missingTypes,
  missingColumns,
};

console.log(JSON.stringify(report, null, 2));

if (
  missingTables.length > 0 ||
  missingTypes.length > 0 ||
  missingColumns.length > 0 ||
  pendingMigrations.length > 0 ||
  recordedWithoutFile.length > 0
) {
  process.exitCode = 1;
}
