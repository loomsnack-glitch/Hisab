#!/usr/bin/env bun

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pg } from "@/config/db";

type Row = Record<string, unknown>;
const apply = process.argv.includes("--apply");
const reportPath = resolve(
  import.meta.dir,
  "../../../../.scratch/ganatri-standalone-whatsapp/phase-7-policy-migration.json",
);

const run = async (): Promise<void> => {
  const result = await pg.begin(async tx => {
    const stores = await tx`
      SELECT stores.id AS store_id,
             stores.organization_id,
             organizations.created_by
      FROM stores
      INNER JOIN organizations
        ON organizations.id = stores.organization_id
      ORDER BY stores.organization_id, stores.id
      FOR UPDATE OF stores
    `;
    const assignments = await tx`
      SELECT assignments.organization_id,
             assignments.store_id,
             assignments.whatsapp_account_id,
             accounts.provider
      FROM whatsapp_account_stores assignments
      INNER JOIN whatsapp_accounts accounts
        ON accounts.id = assignments.whatsapp_account_id
       AND accounts.organization_id = assignments.organization_id
      WHERE accounts.provider = 'cloud_api'
      ORDER BY assignments.organization_id, assignments.store_id, assignments.whatsapp_account_id
    `;
    const byStore = new Map<string, Row[]>();
    for (const row of assignments as Row[]) {
      const key = `${row.organization_id}:${row.store_id}`;
      byStore.set(key, [...(byStore.get(key) ?? []), row]);
    }
    const conflicts = (stores as Row[]).filter(store =>
      (byStore.get(`${store.organization_id}:${store.store_id}`) ?? []).length > 1,
    );
    if (conflicts.length > 0) {
      throw new Error(`Policy migration aborted: ${conflicts.length} Store(s) have multiple Cloud account assignments`);
    }

    let changed = 0;
    let unchanged = 0;
    let cloudEnabled = 0;
    let disabled = 0;
    for (const store of stores as Row[]) {
      const organizationId = String(store.organization_id);
      const storeId = String(store.store_id);
      const actorId = String(store.created_by);
      const [assignment] = byStore.get(`${organizationId}:${storeId}`) ?? [];
      const desiredMode = assignment ? "organization_cloud" : "disabled";
      const desiredAccountId = assignment ? String(assignment.whatsapp_account_id) : null;
      if (desiredMode === "organization_cloud") cloudEnabled += 1;
      else disabled += 1;

      const [current] = await tx`
        SELECT id, mode, whatsapp_account_id, revision
        FROM whatsapp_store_policies
        WHERE organization_id = ${organizationId}
          AND store_id = ${storeId}
          AND effective_to IS NULL
        FOR UPDATE
      `;
      if (
        current
        && current.mode === desiredMode
        && String(current.whatsapp_account_id ?? "") === String(desiredAccountId ?? "")
      ) {
        unchanged += 1;
        continue;
      }
      if (!apply) {
        changed += 1;
        continue;
      }
      if (current) {
        await tx`
          UPDATE whatsapp_store_policies
          SET effective_to = NOW(), ended_by = ${actorId}
          WHERE id = ${current.id}
            AND organization_id = ${organizationId}
            AND effective_to IS NULL
        `;
      }
      await tx`
        INSERT INTO whatsapp_store_policies (
          organization_id, store_id, mode, whatsapp_account_id,
          revision, created_by
        ) VALUES (
          ${organizationId}, ${storeId}, ${desiredMode}, ${desiredAccountId},
          ${Number(current?.revision ?? 0) + 1}, ${actorId}
        )
      `;
      changed += 1;
    }
    return {
      apply,
      stores: stores.length,
      assignments: assignments.length,
      changed,
      unchanged,
      cloudEnabled,
      disabled,
      conflicts: conflicts.length,
    };
  });

  const report = {
    generatedAt: new Date().toISOString(),
    readOnly: !apply,
    ...result,
  };
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));
  console.log(`Policy migration report written to ${reportPath}`);
};

await run();
