import { createHmac } from "node:crypto";
import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import {
  parseWhatsAppCloudWebhook,
  WHATSAPP_CLOUD_WEBHOOK_MAX_BODY_BYTES,
} from "./cloud-api.webhook";
import { createWhatsAppCloudWebhookRoutes } from "./cloud-webhook.routes";

const APP_SECRET = "app-secret";
const VERIFY_TOKEN = "verify-token";

const payload = JSON.stringify({
  object: "whatsapp_business_account",
  entry: [
    {
      id: "waba-1",
      changes: [
        {
          field: "messages",
          value: {
            messaging_product: "whatsapp",
            metadata: {
              display_phone_number: "+919876543210",
              phone_number_id: "phone-1",
            },
            messages: [
              {
                from: "919812345678",
                id: "wamid.inbound-1",
                timestamp: "1760000000",
                type: "text",
                text: { body: "Hello" },
              },
            ],
          },
        },
      ],
    },
  ],
});

const signature = (body: string): string =>
  `sha256=${createHmac("sha256", APP_SECRET).update(body).digest("hex")}`;

const appWith = (
  persist: Parameters<typeof createWhatsAppCloudWebhookRoutes>[0],
) => {
  const app = new Hono();
  app.route("/webhooks/whatsapp", createWhatsAppCloudWebhookRoutes(persist));
  return app;
};

const setConfiguration = () => {
  process.env.WHATSAPP_CLOUD_APP_SECRET = APP_SECRET;
  process.env.WHATSAPP_CLOUD_WEBHOOK_VERIFY_TOKEN = VERIFY_TOKEN;
};

describe("WhatsApp Cloud webhook routes", () => {
  test("returns the challenge only for a valid verification token", async () => {
    setConfiguration();
    const app = appWith(async () => {
      throw new Error("persistence should not run");
    });

    const valid = await app.request(
      "/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=verify-token&hub.challenge=challenge-1",
    );
    expect(valid.status).toBe(200);
    expect(await valid.text()).toBe("challenge-1");

    const invalid = await app.request(
      "/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=challenge-1",
    );
    expect(invalid.status).toBe(403);
  });

  test("validates the raw body signature before persisting a receipt", async () => {
    setConfiguration();
    const receipts: unknown[] = [];
    const app = appWith(async (receipt) => {
      receipts.push(receipt);
      return {
        eventId: "event-1",
        accountId: "account-1",
        status: "pending",
        duplicate: false,
      };
    });

    const valid = await app.request("/webhooks/whatsapp", {
      method: "POST",
      headers: { "x-hub-signature-256": signature(payload) },
      body: payload,
    });
    expect(valid.status).toBe(200);
    expect(await valid.json()).toMatchObject({
      status: "accepted",
      duplicate: false,
      eventId: "event-1",
    });
    expect(receipts).toHaveLength(1);
    expect(receipts[0]).toMatchObject({
      wabaId: "waba-1",
      phoneNumberId: "phone-1",
    });

    const invalid = await app.request("/webhooks/whatsapp", {
      method: "POST",
      headers: { "x-hub-signature-256": "sha256=00" },
      body: payload,
    });
    expect(invalid.status).toBe(401);
    expect(receipts).toHaveLength(1);
  });

  test("rejects malformed signed envelopes and acknowledges durable duplicates", async () => {
    setConfiguration();
    const app = appWith(async () => ({
      eventId: "event-1",
      accountId: null,
      status: "pending",
      duplicate: true,
    }));

    const malformed = '{"object":"not-whatsapp"}';
    const invalid = await app.request("/webhooks/whatsapp", {
      method: "POST",
      headers: { "x-hub-signature-256": signature(malformed) },
      body: malformed,
    });
    expect(invalid.status).toBe(400);

    const duplicate = await app.request("/webhooks/whatsapp", {
      method: "POST",
      headers: { "x-hub-signature-256": signature(payload) },
      body: payload,
    });
    expect(duplicate.status).toBe(200);
    expect(await duplicate.json()).toMatchObject({
      status: "accepted",
      duplicate: true,
    });
  });

  test("rejects a declared oversized request before reading or persisting it", async () => {
    setConfiguration();
    const app = appWith(async () => {
      throw new Error("persistence should not run");
    });

    const response = await app.request("/webhooks/whatsapp", {
      method: "POST",
      headers: {
        "content-length": String(WHATSAPP_CLOUD_WEBHOOK_MAX_BODY_BYTES + 1),
      },
      body: "{}",
    });
    expect(response.status).toBe(413);
  });

  test("derives a stable digest and leaves ambiguous multi-account routing unresolved", () => {
    const multiEntry = JSON.stringify({
      object: "whatsapp_business_account",
      entry: [
        { id: "waba-1", changes: [] },
        { id: "waba-2", changes: [] },
      ],
    });
    const first = parseWhatsAppCloudWebhook(multiEntry);
    const second = parseWhatsAppCloudWebhook(multiEntry);
    expect(first.eventKey).toHaveLength(64);
    expect(first.eventKey).toBe(second.eventKey);
    expect(first.wabaId).toBeNull();
    expect(first.phoneNumberId).toBeNull();
  });
});
