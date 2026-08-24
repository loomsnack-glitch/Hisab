import { describe, expect, mock, test } from "bun:test";

const executed: Array<{
  sql: string;
  values: unknown[];
}> = [];

const pg = (strings: TemplateStringsArray, ...values: unknown[]) => {
  const sql = strings.join("?");
  executed.push({ sql, values });

  if (sql.includes("FROM whatsapp_accounts")) return Promise.resolve([]);
  if (sql.includes("INSERT INTO whatsapp_cloud_webhook_events")) {
    const payload = values[4];
    if (
      typeof payload !== "object" ||
      payload === null ||
      Array.isArray(payload)
    ) {
      throw new Error("payload JSONB value must be an object");
    }
    return Promise.resolve([
      {
        id: "event-1",
        whatsapp_account_id: null,
        status: "pending",
      },
    ]);
  }
  return Promise.resolve([]);
};

mock.module("@/config/db", () => ({ pg }));

const { persistCloudWebhookEvent } = await import("./cloud-webhook.repository");

describe("Cloud webhook persistence", () => {
  test("passes the parsed webhook payload as a JSON object", async () => {
    executed.length = 0;

    const result = await persistCloudWebhookEvent({
      eventKey: "a".repeat(64),
      wabaId: "waba-1",
      phoneNumberId: "phone-1",
      payload: {
        object: "whatsapp_business_account",
        entry: [{ id: "waba-1", changes: [] }],
      },
    });

    expect(result).toEqual({
      eventId: "event-1",
      accountId: null,
      status: "pending",
      duplicate: false,
    });
    const insert = executed.find((query) =>
      query.sql.includes("INSERT INTO whatsapp_cloud_webhook_events"),
    );
    expect(insert).toBeDefined();
    expect(insert?.values[4]).toEqual({
      object: "whatsapp_business_account",
      entry: [{ id: "waba-1", changes: [] }],
    });
  });
});
