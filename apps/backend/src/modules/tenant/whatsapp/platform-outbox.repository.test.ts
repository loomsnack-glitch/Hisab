import { describe, expect, test } from "bun:test";
import { GANATRI_PLATFORM_SENDER_KEY, createPlatformTemplateOutboxInDatabase } from "./platform-outbox.repository";

const databaseTest = process.env.DATABASE_URL ? test : test.skip;

describe("platform WhatsApp outbox contract", () => {
  test("uses an explicit platform sender key instead of a tenant account", () => {
    expect(GANATRI_PLATFORM_SENDER_KEY).toBe("ganatri_utility");
  });

  databaseTest("persists and replays an account-less platform message atomically", async () => {
    const { SQL } = await import("bun");
    const database = new SQL({ url: process.env.DATABASE_URL });
    const [scope] = await database`
      SELECT store.organization_id,
             store.id AS store_id,
             customer.id AS customer_id,
             customer.phone AS customer_phone
      FROM stores store
      INNER JOIN customers customer
        ON customer.organization_id = store.organization_id
       AND customer.phone ~ '^[+][1-9][0-9]{7,14}$'
      ORDER BY store.created_at, customer.created_at
      LIMIT 1
    `;
    if (!scope) throw new Error("Development database has no Store and Customer probe scope");

    const rollback = "platform-outbox-rollback-probe";
    try {
      await database.begin(async transaction => {
        await transaction`
          UPDATE whatsapp_store_policies
          SET mode = 'ganatri_utility', revision = revision + 1
          WHERE organization_id = ${scope.organization_id}
            AND store_id = ${scope.store_id}
            AND effective_to IS NULL
        `;
        const [policy] = await transaction`
          SELECT revision FROM whatsapp_store_policies
          WHERE organization_id = ${scope.organization_id}
            AND store_id = ${scope.store_id}
            AND effective_to IS NULL
        `;
        const request = {
          organizationId: String(scope.organization_id),
          storeId: String(scope.store_id),
          customerId: String(scope.customer_id),
          customerPhone: String(scope.customer_phone),
          idempotencyKey: "phase3-platform-outbox-probe",
          snapshot: {
            senderKey: GANATRI_PLATFORM_SENDER_KEY,
            templateKind: "bill" as const,
            phoneNumberId: "123456789012345",
            wabaId: "987654321098765",
            graphVersion: "v26.0",
            templateName: "ganatri_bill",
            templateLanguage: "en_US",
            policyVersion: Number(policy.revision),
            components: [],
          },
        };

        const first = await createPlatformTemplateOutboxInDatabase(request, transaction);
        const duplicate = await createPlatformTemplateOutboxInDatabase(request, transaction);
        const [stored] = await transaction`
          SELECT message.whatsapp_account_id,
                 message.conversation_id,
                 message.recipient_phone_number,
                 outbox.sender_kind,
                 outbox.platform_sender_key,
                 outbox.platform_sender_snapshot
          FROM whatsapp_messages message
          INNER JOIN whatsapp_outbox outbox ON outbox.message_id = message.id
          WHERE message.id = ${first.messageId}
        `;

        expect(duplicate.deduplicated).toBe(true);
        expect(stored.whatsapp_account_id).toBeNull();
        expect(stored.conversation_id).toBeNull();
        expect(stored.recipient_phone_number).toBe(String(scope.customer_phone));
        expect(stored.sender_kind).toBe("ganatri_platform");
        expect(stored.platform_sender_key).toBe(GANATRI_PLATFORM_SENDER_KEY);
        expect(stored.platform_sender_snapshot).toMatchObject({
          templateName: "ganatri_bill",
          policyVersion: 1,
        });
        throw new Error(rollback);
      });
    } catch (error) {
      if (!(error instanceof Error) || error.message !== rollback) throw error;
    } finally {
      await database.close();
    }
  });
});
