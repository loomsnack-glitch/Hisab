import { describe, expect, test } from "bun:test";
import { parseWhatsAppCloudWebhook } from "./cloud-api.webhook";
import {
  nextCloudMessageStatus,
  normalizeCloudWebhookReceipt,
} from "./cloud-webhook.normalizer";

const receiptFrom = (payload: Record<string, unknown>) =>
  parseWhatsAppCloudWebhook(JSON.stringify(payload));

const messagePayload = (message: Record<string, unknown>) => ({
  object: "whatsapp_business_account",
  entry: [
    {
      id: "waba-1",
      changes: [
        {
          field: "messages",
          value: {
            messaging_product: "whatsapp",
            metadata: { phone_number_id: "phone-1" },
            contacts: [{ wa_id: "919812345678", profile: { name: "Asha" } }],
            messages: [message],
          },
        },
      ],
    },
  ],
});

describe("WhatsApp Cloud webhook normalization", () => {
  test("accepts Meta WAMIDs with base64 padding", () => {
    const [event] = normalizeCloudWebhookReceipt(
      receiptFrom(
        messagePayload({
          from: "919812345678",
          id: "wamid.HBgMOTE4ODY2Mjg4NjAyFQIAERgSMzg4RDNGNDk3MzlGNUQwODMwAA==",
          timestamp: "1760000000",
          type: "text",
          text: { body: "Hello Hisab" },
        }),
      ),
    );

    expect(event).toMatchObject({
      kind: "message",
      providerMessageId:
        "wamid.HBgMOTE4ODY2Mjg4NjAyFQIAERgSMzg4RDNGNDk3MzlGNUQwODMwAA==",
    });
  });

  test("accepts padded Meta WAMIDs in status updates", () => {
    const [event] = normalizeCloudWebhookReceipt(
      receiptFrom({
        object: "whatsapp_business_account",
        entry: [
          {
            id: "waba-1",
            changes: [
              {
                value: {
                  metadata: { phone_number_id: "phone-1" },
                  statuses: [
                    {
                      id: "wamid.HBgMOTE4ODY2Mjg4NjAyFQIAERgSMzg4RDNGNDk3MzlGNUQwODMwAA==",
                      status: "delivered",
                      timestamp: "1760000000",
                      recipient_id: "919812345678",
                    },
                  ],
                },
                field: "messages",
              },
            ],
          },
        ],
      }),
    );

    expect(event).toMatchObject({
      kind: "status",
      providerMessageId:
        "wamid.HBgMOTE4ODY2Mjg4NjAyFQIAERgSMzg4RDNGNDk3MzlGNUQwODMwAA==",
      status: "delivered",
    });
  });

  test("normalizes inbound text into the existing conversation event shape", () => {
    const [event] = normalizeCloudWebhookReceipt(
      receiptFrom(
        messagePayload({
          from: "919812345678",
          id: "wamid.inbound-1",
          timestamp: "1760000000",
          type: "text",
          text: { body: "Hello Hisab" },
        }),
      ),
    );

    expect(event).toEqual({
      kind: "message",
      wabaId: "waba-1",
      phoneNumberId: "phone-1",
      providerMessageId: "wamid.inbound-1",
      externalChatId: "919812345678@s.whatsapp.net",
      contactPhoneNumber: "+919812345678",
      displayName: "Asha",
      messageType: "text",
      body: "Hello Hisab",
      caption: null,
      attachmentFileName: null,
      attachmentMimeType: null,
      occurredAt: "2025-10-09T08:53:20.000Z",
      source: "realtime",
    });
  });

  test("defers media instead of writing an incomplete message", () => {
    const [event] = normalizeCloudWebhookReceipt(
      receiptFrom(
        messagePayload({
          from: "919812345678",
          id: "wamid.image-1",
          timestamp: "1760000000",
          type: "image",
          image: { id: "media-1", mime_type: "image/jpeg" },
        }),
      ),
    );

    expect(event).toMatchObject({
      kind: "deferred",
      reason: "media",
      providerMessageId: "wamid.image-1",
      messageType: "image",
      mediaId: "media-1",
    });
  });

  test("defers malformed text and media identifiers without truncating content", () => {
    const [longText] = normalizeCloudWebhookReceipt(
      receiptFrom(
        messagePayload({
          from: "919812345678",
          id: "wamid.long-text-1",
          timestamp: "1760000000",
          type: "text",
          text: { body: "x".repeat(4097) },
        }),
      ),
    );
    const [missingMediaId] = normalizeCloudWebhookReceipt(
      receiptFrom(
        messagePayload({
          from: "919812345678",
          id: "wamid.image-missing-id",
          timestamp: "1760000000",
          type: "image",
          image: { mime_type: "image/jpeg" },
        }),
      ),
    );

    expect(longText).toMatchObject({ kind: "deferred", reason: "malformed" });
    expect(missingMediaId).toMatchObject({
      kind: "deferred",
      reason: "malformed",
    });
  });

  test("defers unsupported message and deleted status types", () => {
    const message = normalizeCloudWebhookReceipt(
      receiptFrom(
        messagePayload({
          from: "919812345678",
          id: "wamid.interactive-1",
          timestamp: "1760000000",
          type: "interactive",
          interactive: { type: "button_reply" },
        }),
      ),
    )[0];
    const status = normalizeCloudWebhookReceipt(
      receiptFrom({
        object: "whatsapp_business_account",
        entry: [
          {
            id: "waba-1",
            changes: [
              {
                value: {
                  metadata: { phone_number_id: "phone-1" },
                  statuses: [
                    {
                      id: "wamid.outbound-1",
                      status: "deleted",
                      timestamp: "1760000000",
                      recipient_id: "919812345678",
                    },
                  ],
                },
                field: "messages",
              },
            ],
          },
        ],
      }),
    )[0];

    expect(message).toMatchObject({
      kind: "deferred",
      reason: "unsupported_message",
    });
    expect(status).toMatchObject({
      kind: "deferred",
      reason: "unsupported_status",
    });
  });

  test("does not silently accept malformed provider identifiers", () => {
    const [event] = normalizeCloudWebhookReceipt(
      receiptFrom({
        object: "whatsapp_business_account",
        entry: [
          {
            id: "not a valid id",
            changes: [],
          },
        ],
      }),
    );

    expect(event).toMatchObject({
      kind: "deferred",
      reason: "malformed",
      detail: "Webhook entry is missing a valid WABA ID",
    });
  });

  test("deduplicates repeated provider items within one receipt", () => {
    const payload = messagePayload({
      from: "919812345678",
      id: "wamid.duplicate-1",
      timestamp: "1760000000",
      type: "text",
      text: { body: "Hello" },
    });
    const changes = (payload.entry as Array<Record<string, unknown>>)[0]
      ?.changes as Array<Record<string, unknown>>;
    const firstValue = changes[0]?.value as Record<string, unknown>;
    firstValue.messages = [
      firstValue.messages,
      ...(firstValue.messages as unknown[]),
    ].flat();

    expect(normalizeCloudWebhookReceipt(receiptFrom(payload))).toHaveLength(1);
  });

  test("keeps failure metadata bounded and normalizes status timestamps", () => {
    const [event] = normalizeCloudWebhookReceipt(
      receiptFrom({
        object: "whatsapp_business_account",
        entry: [
          {
            id: "waba-1",
            changes: [
              {
                value: {
                  metadata: { phone_number_id: "phone-1" },
                  statuses: [
                    {
                      id: "wamid.failed-1",
                      biz_opaque_callback_data: "message-idempotency-key",
                      status: "failed",
                      timestamp: "1760000000",
                      recipient_id: "919812345678",
                      errors: [
                        { code: 131026, title: "Message undeliverable" },
                      ],
                    },
                  ],
                },
                field: "messages",
              },
            ],
          },
        ],
      }),
    );

    expect(event).toMatchObject({
      kind: "status",
      status: "failed",
      recipientPhoneNumber: "+919812345678",
      failureCode: "131026",
      failureMessage: "Message undeliverable",
      callbackData: "message-idempotency-key",
      occurredAt: "2025-10-09T08:53:20.000Z",
    });
  });

  test("applies status transitions monotonically when notifications arrive late", () => {
    expect(
      nextCloudMessageStatus(
        { status: "queued", lastObservedAt: null },
        { status: "sent", occurredAt: "2025-10-09T08:53:20.000Z" },
      ),
    ).toEqual({
      status: "sent",
      lastObservedAt: "2025-10-09T08:53:20.000Z",
    });
    expect(
      nextCloudMessageStatus(
        { status: "sent", lastObservedAt: "2025-10-09T08:53:20.000Z" },
        { status: "delivered", occurredAt: "2025-10-09T08:53:19.000Z" },
      ),
    ).toEqual({
      status: "sent",
      lastObservedAt: "2025-10-09T08:53:20.000Z",
    });
    expect(
      nextCloudMessageStatus(
        { status: "delivered", lastObservedAt: "2025-10-09T08:53:20.000Z" },
        { status: "sent", occurredAt: "2025-10-09T08:53:21.000Z" },
      ),
    ).toEqual({
      status: "delivered",
      lastObservedAt: "2025-10-09T08:53:21.000Z",
    });
    expect(
      nextCloudMessageStatus(
        { status: "read", lastObservedAt: "2025-10-09T08:53:20.000Z" },
        { status: "failed", occurredAt: "2025-10-09T08:53:21.000Z" },
      ),
    ).toEqual({
      status: "read",
      lastObservedAt: "2025-10-09T08:53:21.000Z",
    });
  });
});
