#!/usr/bin/env bun

import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pg } from "@/config/db";

type Row = Record<string, unknown>;

const reportPath = resolve(
  import.meta.dir,
  "../../../../.scratch/ganatri-standalone-whatsapp/phase-7-dry-run.json",
);

const count = (row: Row | undefined, key: string): number => Number(row?.[key] ?? 0);
const ids = (rows: Row[], key: string): string[] => rows.map(row => String(row[key])).slice(0, 100);

const run = async (): Promise<void> => {
  const [identity] = await pg`
    SELECT current_database() AS database,
           current_schema() AS schema,
           inet_server_addr()::text AS server
  `;
  const [organizations] = await pg`
    SELECT COUNT(*) AS organization_count
    FROM organizations
  `;
  const [stores] = await pg`
    SELECT COUNT(*) AS store_count
    FROM stores
  `;
  const [accounts] = await pg`
    SELECT COUNT(*) AS account_count,
           COUNT(*) FILTER (WHERE provider = 'cloud_api') AS cloud_account_count,
           COUNT(*) FILTER (WHERE provider = 'baileys') AS legacy_account_count
    FROM whatsapp_accounts
  `;
  const [assignments] = await pg`
    SELECT COUNT(*) AS assignment_count,
           COUNT(*) FILTER (WHERE accounts.provider = 'cloud_api') AS cloud_assignment_count,
           COUNT(DISTINCT assignments.store_id) FILTER (WHERE accounts.provider = 'cloud_api') AS cloud_assigned_store_count
    FROM whatsapp_account_stores assignments
    INNER JOIN whatsapp_accounts accounts
      ON accounts.id = assignments.whatsapp_account_id
     AND accounts.organization_id = assignments.organization_id
  `;
  const [storesWithoutCloudAssignment] = await pg`
    SELECT COUNT(*) AS count
    FROM stores stores
    WHERE NOT EXISTS (
      SELECT 1
      FROM whatsapp_account_stores assignments
      INNER JOIN whatsapp_accounts accounts
        ON accounts.id = assignments.whatsapp_account_id
       AND accounts.organization_id = assignments.organization_id
      WHERE assignments.organization_id = stores.organization_id
        AND assignments.store_id = stores.id
        AND accounts.provider = 'cloud_api'
    )
  `;
  const multipleStoreAssignments = await pg`
    SELECT assignments.organization_id, assignments.store_id,
           COUNT(DISTINCT assignments.whatsapp_account_id) AS account_count
    FROM whatsapp_account_stores assignments
    INNER JOIN whatsapp_accounts accounts
      ON accounts.id = assignments.whatsapp_account_id
     AND accounts.organization_id = assignments.organization_id
    WHERE accounts.provider = 'cloud_api'
    GROUP BY assignments.organization_id, assignments.store_id
    HAVING COUNT(DISTINCT assignments.whatsapp_account_id) > 1
    ORDER BY assignments.organization_id, assignments.store_id
    LIMIT 100
  `;
  const sharedInboundDefaults = await pg`
    SELECT assignments.organization_id, assignments.whatsapp_account_id,
           COUNT(*) AS store_count,
           COUNT(*) FILTER (WHERE assignments.is_default_for_inbound) AS default_store_count
    FROM whatsapp_account_stores assignments
    INNER JOIN whatsapp_accounts accounts
      ON accounts.id = assignments.whatsapp_account_id
     AND accounts.organization_id = assignments.organization_id
    WHERE accounts.provider = 'cloud_api'
    GROUP BY assignments.organization_id, assignments.whatsapp_account_id
    HAVING COUNT(*) > 1
    ORDER BY assignments.organization_id, assignments.whatsapp_account_id
    LIMIT 100
  `;
  const [policies] = await pg`
    SELECT COUNT(*) FILTER (WHERE effective_to IS NULL) AS current_policy_count,
           COUNT(*) FILTER (WHERE effective_to IS NULL AND mode = 'organization_cloud') AS current_cloud_policy_count,
           COUNT(*) FILTER (WHERE effective_to IS NULL AND mode = 'ganatri_utility') AS current_utility_policy_count,
           COUNT(*) FILTER (WHERE effective_to IS NULL AND mode = 'disabled') AS current_disabled_policy_count
    FROM whatsapp_store_policies
  `;
  const [storesWithoutPolicy] = await pg`
    SELECT COUNT(*) AS count
    FROM stores stores
    WHERE NOT EXISTS (
      SELECT 1
      FROM whatsapp_store_policies policies
      WHERE policies.organization_id = stores.organization_id
        AND policies.store_id = stores.id
        AND policies.effective_to IS NULL
    )
  `;
  const staleCloudPolicies = await pg`
    SELECT policies.organization_id, policies.store_id
    FROM whatsapp_store_policies policies
    LEFT JOIN whatsapp_accounts accounts
      ON accounts.id = policies.whatsapp_account_id
     AND accounts.organization_id = policies.organization_id
    LEFT JOIN whatsapp_account_stores assignments
      ON assignments.organization_id = policies.organization_id
     AND assignments.store_id = policies.store_id
     AND assignments.whatsapp_account_id = policies.whatsapp_account_id
    WHERE policies.effective_to IS NULL
      AND policies.mode = 'organization_cloud'
      AND (
        policies.whatsapp_account_id IS NULL
        OR accounts.provider <> 'cloud_api'
        OR assignments.store_id IS NULL
      )
    ORDER BY policies.organization_id, policies.store_id
    LIMIT 100
  `;
  const [templates] = await pg`
    SELECT
      (SELECT COUNT(*) FROM whatsapp_message_templates) AS local_template_count,
      (SELECT COUNT(*) FROM whatsapp_message_templates WHERE is_default AND is_active) AS local_default_count,
      (SELECT COUNT(*) FROM whatsapp_cloud_templates) AS cloud_template_count,
      (SELECT COUNT(*) FROM whatsapp_cloud_template_bindings) AS cloud_binding_count,
      (SELECT COUNT(*) FROM whatsapp_cloud_template_bindings WHERE is_default AND is_active) AS cloud_default_count,
      (SELECT COUNT(*) FROM whatsapp_cloud_template_submissions) AS submission_count
  `;
  const [history] = await pg`
    SELECT
      (SELECT COUNT(*) FROM whatsapp_messages) AS message_count,
      (SELECT COUNT(*) FROM whatsapp_provider_events) AS provider_event_count,
      (SELECT COUNT(*) FROM whatsapp_outbox) AS outbox_count,
      (SELECT COUNT(*) FROM whatsapp_outbox WHERE status IN ('pending', 'processing', 'retryable', 'reconciling')) AS active_outbox_count
  `;
  const [invalidOutboxReferences] = await pg`
    SELECT COUNT(*) AS count
    FROM whatsapp_outbox outbox
    LEFT JOIN whatsapp_accounts accounts
      ON accounts.id = outbox.whatsapp_account_id
     AND accounts.organization_id = outbox.organization_id
    WHERE outbox.whatsapp_account_id IS NOT NULL
      AND accounts.id IS NULL
  `;
  const [invalidPlatformReferences] = await pg`
    SELECT COUNT(*) AS count
    FROM whatsapp_outbox outbox
    WHERE outbox.sender_kind = 'ganatri_platform'
      AND (
        outbox.platform_sender_key IS NULL
        OR outbox.platform_sender_snapshot IS NULL
      )
  `;
  const [migrations] = await pg`
    SELECT COUNT(DISTINCT version::text) AS applied_migration_count
    FROM schema_migrations
  `;
  const migrationFiles = readdirSync(resolve(import.meta.dir, "../../db/migrations"))
    .filter(file => file.endsWith(".sql"))
    .map(file => file.split("_", 1)[0]);
  const migrationRows = await pg`
    SELECT DISTINCT version::text AS version
    FROM schema_migrations
    ORDER BY version
  `;
  const recordedMigrations = (migrationRows as Row[]).map((row: Row) => String(row.version));
  const migrationsWithoutFiles = recordedMigrations.filter(version => !migrationFiles.includes(version));
  const filesWithoutRecords = migrationFiles.filter(version => !recordedMigrations.includes(version));

  const report = {
    generatedAt: new Date().toISOString(),
    readOnly: true,
    database: identity ?? null,
    migrations: {
      appliedLedgerRows: count(migrations as Row | undefined, "applied_migration_count"),
      migrationFiles: migrationFiles.length,
      migrationsWithoutFiles,
      filesWithoutRecords,
    },
    organizations: { total: count(organizations as Row | undefined, "organization_count") },
    stores: {
      total: count(stores as Row | undefined, "store_count"),
      withoutCloudAssignment: count(storesWithoutCloudAssignment as Row | undefined, "count"),
      withoutCurrentPolicy: count(storesWithoutPolicy as Row | undefined, "count"),
    },
    accounts: {
      total: count(accounts as Row | undefined, "account_count"),
      cloud: count(accounts as Row | undefined, "cloud_account_count"),
      legacy: count(accounts as Row | undefined, "legacy_account_count"),
    },
    assignments: {
      total: count(assignments as Row | undefined, "assignment_count"),
      cloud: count(assignments as Row | undefined, "cloud_assignment_count"),
      cloudAssignedStores: count(assignments as Row | undefined, "cloud_assigned_store_count"),
    },
    policies: {
      current: count(policies as Row | undefined, "current_policy_count"),
      currentCloud: count(policies as Row | undefined, "current_cloud_policy_count"),
      currentGanatriUtility: count(policies as Row | undefined, "current_utility_policy_count"),
      currentDisabled: count(policies as Row | undefined, "current_disabled_policy_count"),
    },
    templates: {
      local: count(templates as Row | undefined, "local_template_count"),
      localDefaults: count(templates as Row | undefined, "local_default_count"),
      cloud: count(templates as Row | undefined, "cloud_template_count"),
      cloudBindings: count(templates as Row | undefined, "cloud_binding_count"),
      cloudDefaults: count(templates as Row | undefined, "cloud_default_count"),
      submissions: count(templates as Row | undefined, "submission_count"),
    },
    history: {
      messages: count(history as Row | undefined, "message_count"),
      providerEvents: count(history as Row | undefined, "provider_event_count"),
      outbox: count(history as Row | undefined, "outbox_count"),
      activeOutbox: count(history as Row | undefined, "active_outbox_count"),
    },
    conflicts: {
      storesWithMultipleCloudAccounts: {
        count: multipleStoreAssignments.length,
        sampleStoreIds: ids(multipleStoreAssignments as Row[], "store_id"),
      },
      sharedCloudNumbersWithoutExactlyOneDefaultInboundStore: {
        count: (sharedInboundDefaults as Row[]).filter((row: Row) => Number(row.default_store_count) !== 1).length,
        sampleAccountIds: (sharedInboundDefaults as Row[])
          .filter((row: Row) => Number(row.default_store_count) !== 1)
          .map((row: Row) => String(row.whatsapp_account_id))
          .slice(0, 100),
      },
      staleCloudPolicies: {
        count: staleCloudPolicies.length,
        sampleStoreIds: ids(staleCloudPolicies as Row[], "store_id"),
      },
      outboxRowsWithUnresolvedAccountReference: count(invalidOutboxReferences as Row | undefined, "count"),
      platformOutboxRowsWithIncompleteSenderReference: count(invalidPlatformReferences as Row | undefined, "count"),
      migrationLedgerMismatch: migrationsWithoutFiles.length > 0 || filesWithoutRecords.length > 0,
    },
    writeGate: {
      canStartPolicyMigration:
        multipleStoreAssignments.length === 0
        && (sharedInboundDefaults as Row[]).every((row: Row) => Number(row.default_store_count) === 1)
        && staleCloudPolicies.length === 0
        && count(invalidOutboxReferences as Row | undefined, "count") === 0
        && count(invalidPlatformReferences as Row | undefined, "count") === 0
        && migrationsWithoutFiles.length === 0
        && filesWithoutRecords.length === 0,
    },
  };

  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));
  console.log(`Read-only report written to ${reportPath}`);
};

await run();
