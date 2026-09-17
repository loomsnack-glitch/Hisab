import { describe, expect, test } from "bun:test";
import { SQL } from "bun";
import { recordPlatformInboundReplyInDatabase } from "./platform-inbound.repository";

const databaseTest = process.env.DATABASE_URL ? test : test.skip;

describe("Ganatri Utility inbound retention", () => {
  databaseTest("stores a normalized reply internally and deduplicates provider delivery", async () => {
    const database = new SQL({ url: process.env.DATABASE_URL });
    const reply = {
      wabaId: "987654321098765",
      phoneNumberId: "123456789012345",
      providerMessageId: "wamid-platform-probe",
      contactPhoneNumber: "+919876543210",
      displayName: "Internal customer",
      body: "Please send my bill again",
      occurredAt: "2026-09-18T10:00:00.000Z",
    } as const;
    const rollback = "platform-inbound-rollback-probe";
    try {
      await database.begin(async transaction => {
        const first = await recordPlatformInboundReplyInDatabase(transaction, reply);
        const duplicate = await recordPlatformInboundReplyInDatabase(transaction, reply);
        const [stored] = await transaction`
          SELECT sender_key, waba_id, phone_number_id, contact_phone_number, display_name, body
          FROM whatsapp_platform_inbound_messages
          WHERE id = ${first.id}
        `;
        expect(first.stored).toBe(true);
        expect(duplicate).toEqual({ id: first.id, stored: false });
        expect(stored).toEqual({
          sender_key: "ganatri_utility",
          waba_id: reply.wabaId,
          phone_number_id: reply.phoneNumberId,
          contact_phone_number: reply.contactPhoneNumber,
          display_name: reply.displayName,
          body: reply.body,
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
