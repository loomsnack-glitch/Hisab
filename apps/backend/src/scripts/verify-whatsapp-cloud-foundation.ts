import { pg } from "@/config/db";

type Violation = {
  check: string;
  count: number;
};

const run = async (): Promise<void> => {
  const violations: Violation[] = [];

  const queries: Array<{ name: string; sql: string }> = [
    {
      name: "duplicate WABA identities",
      sql: `
        SELECT COUNT(*)::int AS count
        FROM (
          SELECT waba_id
          FROM whatsapp_business_accounts
          WHERE waba_id IS NOT NULL
          GROUP BY waba_id
          HAVING COUNT(*) > 1
        ) duplicates
      `,
    },
    {
      name: "duplicate Cloud phone identities",
      sql: `
        SELECT COUNT(*)::int AS count
        FROM (
          SELECT cloud_phone_number_id
          FROM whatsapp_accounts
          WHERE provider = 'cloud_api'
            AND cloud_phone_number_id IS NOT NULL
          GROUP BY cloud_phone_number_id
          HAVING COUNT(*) > 1
        ) duplicates
      `,
    },
    {
      name: "partial Cloud identity pairs",
      sql: `
        SELECT COUNT(*)::int AS count
        FROM whatsapp_accounts
        WHERE provider = 'cloud_api'
          AND (
            (cloud_phone_number_id IS NULL) <> (whatsapp_business_account_id IS NULL)
            OR (cloud_status IS NULL) <> (cloud_phone_number_id IS NULL)
          )
      `,
    },
    {
      name: "partial credential bindings",
      sql: `
        SELECT COUNT(*)::int AS count
        FROM whatsapp_business_accounts
        WHERE (credential_reference IS NULL) <> (credential_key_version IS NULL)
      `,
    },
    {
      name: "assigned accounts without a default Store",
      sql: `
        SELECT COUNT(*)::int AS count
        FROM (
          SELECT assignments.whatsapp_account_id
          FROM whatsapp_account_stores assignments
          GROUP BY assignments.whatsapp_account_id
          HAVING COUNT(*) FILTER (WHERE assignments.is_default_for_inbound) = 0
        ) invalid_assignments
      `,
    },
  ];

  for (const query of queries) {
    const [row] = await pg.unsafe(query.sql);
    const count = Number(row?.count ?? 0);
    if (count > 0) violations.push({ check: query.name, count });
  }

  if (violations.length > 0) {
    for (const violation of violations) {
      console.error(
        `[whatsapp-cloud-foundation] ${violation.check}: ${violation.count}`,
      );
    }
    process.exitCode = 1;
    return;
  }

  console.log("[whatsapp-cloud-foundation] all integrity checks passed");
};

await run();
