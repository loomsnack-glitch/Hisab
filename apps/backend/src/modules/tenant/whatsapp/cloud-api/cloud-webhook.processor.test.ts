import { describe, expect, test } from "bun:test";
import type { CloudWebhookEventClaim } from "./cloud-webhook.repository";
import { processCloudWebhookEvent } from "./cloud-webhook.processor";

const claim = (
  overrides: Partial<CloudWebhookEventClaim> = {},
): CloudWebhookEventClaim => ({
  id: "event-id",
  eventKey: "a".repeat(64),
  wabaId: "waba-1",
  phoneNumberId: "phone-1",
  accountId: "account-1",
  payload: {},
  attemptCount: 1,
  leaseOwner: "lease-1",
  ...overrides,
});

const textReceipt = {
  entry: [
    {
      id: "waba-1",
      changes: [
        {
          value: {
            metadata: { phone_number_id: "phone-1" },
            contacts: [{ wa_id: "919876543210", profile: { name: "Ada" } }],
            messages: [
              {
                id: "wamid-1",
                from: "919876543210",
                timestamp: "1700000000",
                type: "text",
                text: { body: "Hello" },
              },
            ],
          },
        },
      ],
    },
  ],
};

const deps = () => {
  const calls = {
    messages: [] as unknown[],
    statuses: [] as unknown[],
    completed: 0,
    ignored: [] as unknown[],
    failed: [] as unknown[],
  };
  return {
    calls,
    injected: {
      ingestMessage: async (_accountId: string, data: unknown) => {
        calls.messages.push(data);
        return { stored: true };
      },
      updateStatus: async (...data: unknown[]) => {
        calls.statuses.push(data);
        return "updated" as "updated" | "stale" | "missing";
      },
      resolveAccount: async (): Promise<string | null> => "account-1",
      complete: async () => {
        calls.completed += 1;
        return true;
      },
      ignore: async (...data: unknown[]) => {
        calls.ignored.push(data);
        return true;
      },
      fail: async (...data: unknown[]) => {
        calls.failed.push(data);
        return true;
      },
    },
  };
};

describe("processCloudWebhookEvent", () => {
  test("dispatches inbound text without using the legacy inbox", async () => {
    const state = deps();
    const result = await processCloudWebhookEvent(
      claim({ payload: textReceipt }),
      state.injected,
    );

    expect(result).toEqual({ status: "completed", processed: 1, ignored: 0 });
    expect(state.calls.messages).toHaveLength(1);
    expect(state.calls.completed).toBe(1);
    expect(state.calls.failed).toHaveLength(0);
  });

  test("ignores a receipt containing only deferred events", async () => {
    const state = deps();
    const result = await processCloudWebhookEvent(
      claim({
        payload: {
          entry: [
            {
              id: "waba-1",
              changes: [
                {
                  value: {
                    metadata: { phone_number_id: "phone-1" },
                    messages: [
                      {
                        id: "media-1",
                        from: "919876543210",
                        timestamp: "1700000000",
                        type: "image",
                        image: { id: "media-id" },
                      },
                    ],
                  },
                },
              ],
            },
          ],
        },
      }),
      state.injected,
    );

    expect(result).toEqual({ status: "ignored", code: "deferred_event" });
    expect(state.calls.ignored).toHaveLength(1);
    expect(state.calls.completed).toBe(0);
  });

  test("retries a valid receipt when account provisioning is not ready", async () => {
    const state = deps();
    state.injected.resolveAccount = async () => null;
    const result = await processCloudWebhookEvent(
      claim({ accountId: null, payload: textReceipt }),
      state.injected,
    );

    expect(result).toEqual({
      status: "retryable",
      code: "cloud_account_not_found",
    });
    expect(state.calls.failed).toHaveLength(1);
  });

  test("retries a status that arrives before its outbound message", async () => {
    const state = deps();
    state.injected.updateStatus = async () => "missing";
    const result = await processCloudWebhookEvent(
      claim({
        payload: {
          entry: [
            {
              id: "waba-1",
              changes: [
                {
                  value: {
                    metadata: { phone_number_id: "phone-1" },
                    statuses: [
                      {
                        id: "wamid-1",
                        status: "delivered",
                        timestamp: "1700000000",
                        recipient_id: "919876543210",
                      },
                    ],
                  },
                },
              ],
            },
          ],
        },
      }),
      state.injected,
    );

    expect(result).toEqual({
      status: "retryable",
      code: "cloud_message_not_found",
    });
    expect(state.calls.failed).toHaveLength(1);
  });

  test("completes a stale status as an idempotent no-op", async () => {
    const state = deps();
    state.injected.updateStatus = async () => "stale";
    const result = await processCloudWebhookEvent(
      claim({
        payload: {
          entry: [
            {
              id: "waba-1",
              changes: [
                {
                  value: {
                    metadata: { phone_number_id: "phone-1" },
                    statuses: [
                      {
                        id: "wamid-1",
                        status: "sent",
                        timestamp: "1700000000",
                        recipient_id: "919876543210",
                      },
                    ],
                  },
                },
              ],
            },
          ],
        },
      }),
      state.injected,
    );

    expect(result).toEqual({ status: "completed", processed: 1, ignored: 0 });
    expect(state.calls.failed).toHaveLength(0);
    expect(state.calls.completed).toBe(1);
  });

  test("reports exhausted processing attempts as dead letters", async () => {
    const state = deps();
    state.injected.ingestMessage = async () => {
      throw new Error("temporary database outage");
    };
    const result = await processCloudWebhookEvent(
      claim({ attemptCount: 8, payload: textReceipt }),
      state.injected,
    );

    expect(result).toEqual({
      status: "dead_letter",
      code: "cloud_processing_failed",
    });
    expect(state.calls.failed).toHaveLength(1);
  });
});
