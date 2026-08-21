import { describe, expect, test } from "bun:test";
import { dispatchCloudOutboxJob } from "./cloud-dispatcher";
import type { CloudOutboxJob } from "./cloud-outbox.repository";

const job: CloudOutboxJob = {
  organizationId: "11111111-1111-4111-8111-111111111111",
  accountId: "22222222-2222-4222-8222-222222222222",
  outboxId: "33333333-3333-4333-8333-333333333333",
  messageId: "44444444-4444-4444-8444-444444444444",
  phoneNumber: "+919876543210",
  phoneNumberId: "9876543210",
  credentialReference: "secret://whatsapp/cloud/account-1",
  credentialKeyVersion: "kms-2026-08",
  messageType: "text",
  body: "Hello",
  caption: null,
  attachmentStorageKey: null,
  attachmentFileName: null,
  attachmentMimeType: null,
  attemptCount: 1,
  leaseOwner: "cloud-outbox-test",
};

describe("Cloud outbox dispatcher", () => {
  test("resolves credentials in memory and completes an accepted text send", async () => {
    const completed: unknown[] = [];
    const result = await dispatchCloudOutboxJob(job, {
      vault: {
        async store() {
          return { reference: "secret://new", keyVersion: "v2" };
        },
        async resolve(binding) {
          expect(binding).toEqual({
            reference: job.credentialReference,
            keyVersion: job.credentialKeyVersion,
          });
          return "token-only-in-memory";
        },
        async rotate() {
          return { reference: "secret://new", keyVersion: "v2" };
        },
        async revoke() {},
      },
      createClient: (accessToken) => ({
        async sendMessage(phoneNumberId, payload) {
          expect(accessToken).toBe("token-only-in-memory");
          expect(phoneNumberId).toBe(job.phoneNumberId);
          expect(payload).toMatchObject({ text: { body: "Hello" } });
          return { messages: [{ id: "wamid.HBgM123" }] };
        },
        async uploadMedia() {
          return { id: "media-1" };
        },
      }),
      loadAttachment: async () => new Uint8Array(),
      complete: async (...args) => {
        completed.push(args);
        return true;
      },
      reconcile: async () => true,
    });

    expect(result).toEqual({ status: "accepted", providerMessageId: "wamid.HBgM123" });
    expect(completed).toHaveLength(1);
  });

  test("marks an uncertain provider submission for reconciliation", async () => {
    let reconciled = false;
    const result = await dispatchCloudOutboxJob(job, {
      vault: {
        async store() {
          return { reference: "secret://new", keyVersion: "v2" };
        },
        async resolve() {
          return "token-only-in-memory";
        },
        async rotate() {
          return { reference: "secret://new", keyVersion: "v2" };
        },
        async revoke() {},
      },
      createClient: () => ({
        async sendMessage() {
          throw new Error("network result unknown");
        },
        async uploadMedia() {
          return { id: "media-1" };
        },
      }),
      loadAttachment: async () => new Uint8Array(),
      complete: async () => {
        throw new Error("uncertain sends must not complete as failed");
      },
      reconcile: async (claimed, code) => {
        reconciled = claimed.outboxId === job.outboxId && code === "submission_uncertain";
        return true;
      },
    });

    expect(result).toEqual({ status: "reconciling", code: "submission_uncertain" });
    expect(reconciled).toBe(true);
  });

  test("dispatches an immutable Cloud template snapshot", async () => {
    let payload: unknown;
    const result = await dispatchCloudOutboxJob({
      ...job,
      messageType: "template",
      body: null,
      templateSnapshot: {
        bindingId: "55555555-5555-4555-8555-555555555555",
        assetId: "66666666-6666-4666-8666-666666666666",
        version: 2,
        name: "bill_ready",
        languageCode: "en_US",
        category: "utility",
        intent: "bill",
        components: [{ type: "body", parameters: [{ type: "text", text: "Asha" }] }],
      },
    }, {
      vault: {
        async store() { return { reference: "secret://new", keyVersion: "v2" }; },
        async resolve() { return "token-only-in-memory"; },
        async rotate() { return { reference: "secret://new", keyVersion: "v2" }; },
        async revoke() {},
      },
      createClient: () => ({
        async sendMessage(_phoneNumberId, nextPayload) { payload = nextPayload; return { messages: [{ id: "wamid.HBgM456" }] }; },
        async uploadMedia() { return { id: "media-1" }; },
      }),
      loadAttachment: async () => new Uint8Array(),
      complete: async () => true,
      reconcile: async () => true,
    });
    expect(result).toEqual({ status: "accepted", providerMessageId: "wamid.HBgM456" });
    expect(payload).toMatchObject({ template: { name: "bill_ready", language: { code: "en_US" } } });
  });
});
