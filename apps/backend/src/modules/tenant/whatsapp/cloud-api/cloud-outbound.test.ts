import { describe, expect, test } from "bun:test";
import { WhatsAppCloudApiError } from "./cloud-api.client";
import {
  buildCloudOutboundPayload,
  dispatchCloudOutboundMessage,
} from "./cloud-outbound";

describe("WhatsApp Cloud outbound transport", () => {
  test("builds a normalized text payload", () => {
    expect(
      buildCloudOutboundPayload("+91 98765 43210", {
        type: "text",
        body: "Hello",
        previewUrl: true,
      }),
    ).toEqual({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: "+919876543210",
      type: "text",
      text: { body: "Hello", preview_url: true },
    });
  });

  test("builds a template payload without stringifying components", () => {
    expect(
      buildCloudOutboundPayload("+919876543210", {
        type: "template",
        name: "bill_ready",
        languageCode: "en_US",
        components: [
          { type: "body", parameters: [{ type: "text", text: "INV-1" }] },
        ],
      }).template,
    ).toEqual({
      name: "bill_ready",
      language: { code: "en_US" },
      components: [
        { type: "body", parameters: [{ type: "text", text: "INV-1" }] },
      ],
    });
  });

  test("rejects invalid outbound input before a client call", async () => {
    let calls = 0;
    const result = await dispatchCloudOutboundMessage(
      {
        sendMessage: async () => {
          calls += 1;
          return { messages: [{ id: "wamid.1" }] };
        },
      },
      "1234567890",
      "12345",
      { type: "text", body: "Hello" },
    );

    expect(result).toEqual({
      status: "permanent",
      code: "invalid_outbound_message",
      message: "WhatsApp recipient phone number is invalid",
    });
    expect(calls).toBe(0);
  });

  test("rejects an invalid Phone Number ID as permanent", async () => {
    const result = await dispatchCloudOutboundMessage(
      {
        sendMessage: async () => ({ messages: [{ id: "wamid.1" }] }),
      },
      "not valid",
      "+919876543210",
      { type: "text", body: "Hello" },
    );

    expect(result).toEqual({
      status: "permanent",
      code: "invalid_outbound_message",
      message: "WhatsApp Phone Number ID is invalid",
    });
  });

  test("accepts only a valid provider message ID", async () => {
    const result = await dispatchCloudOutboundMessage(
      {
        sendMessage: async () => ({ messages: [{ id: "wamid.ABC-123" }] }),
      },
      "1234567890",
      "+919876543210",
      { type: "text", body: "Hello" },
    );
    expect(result).toEqual({
      status: "accepted",
      providerMessageId: "wamid.ABC-123",
    });
  });

  test("treats a network failure during POST as reconciling", async () => {
    const result = await dispatchCloudOutboundMessage(
      {
        sendMessage: async () => {
          throw new WhatsAppCloudApiError({
            message: "request timed out",
            retryable: true,
            uncertain: true,
          });
        },
      },
      "1234567890",
      "+919876543210",
      { type: "text", body: "Hello" },
    );
    expect(result).toEqual({
      status: "reconciling",
      code: "submission_uncertain",
      message: "Cloud API submission result is unknown",
    });
  });

  test("keeps definitive provider errors retryable or permanent", async () => {
    const retryable = await dispatchCloudOutboundMessage(
      {
        sendMessage: async () => {
          throw new WhatsAppCloudApiError({
            message: "rate limited",
            status: 429,
            providerCode: "130429",
            retryable: true,
          });
        },
      },
      "1234567890",
      "+919876543210",
      { type: "template", name: "bill_ready", languageCode: "en_US" },
    );
    expect(retryable).toEqual({
      status: "retryable",
      code: "130429",
      message: "rate limited",
    });

    const permanent = await dispatchCloudOutboundMessage(
      {
        sendMessage: async () => {
          throw new WhatsAppCloudApiError({
            message: "template rejected",
            status: 400,
            providerCode: "100",
          });
        },
      },
      "1234567890",
      "+919876543210",
      { type: "template", name: "bill_ready", languageCode: "en_US" },
    );
    expect(permanent).toEqual({
      status: "permanent",
      code: "100",
      message: "template rejected",
    });
  });

  test("treats a malformed successful response as a permanent protocol error", async () => {
    const result = await dispatchCloudOutboundMessage(
      {
        sendMessage: async () => null,
      },
      "1234567890",
      "+919876543210",
      { type: "text", body: "Hello" },
    );

    expect(result).toEqual({
      status: "permanent",
      code: "missing_provider_message_id",
      message: "Cloud API accepted no valid message ID",
    });
  });

  test("does not retry an unexpected POST failure", async () => {
    const result = await dispatchCloudOutboundMessage(
      {
        sendMessage: async () => {
          throw new Error("socket closed");
        },
      },
      "1234567890",
      "+919876543210",
      { type: "text", body: "Hello" },
    );

    expect(result).toEqual({
      status: "reconciling",
      code: "submission_uncertain",
      message: "Cloud API submission result is unknown",
    });
  });

  test("supports template media links", () => {
    expect(
      buildCloudOutboundPayload("+919876543210", {
        type: "template",
        name: "promotion",
        languageCode: "en_US",
        components: [
          {
            type: "header",
            parameters: [
              {
                type: "image",
                image: { link: "https://example.com/promo.jpg" },
              },
            ],
          },
        ],
      }).template?.components,
    ).toEqual([
      {
        type: "header",
        parameters: [
          { type: "image", image: { link: "https://example.com/promo.jpg" } },
        ],
      },
    ]);
  });
});
