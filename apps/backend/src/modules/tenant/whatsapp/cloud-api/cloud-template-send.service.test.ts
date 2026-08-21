import { describe, expect, test } from "bun:test";
import { enqueueCloudTemplateSend } from "./cloud-template-send.service";

const organizationId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const storeId = "33333333-3333-4333-8333-333333333333";
const accountId = "44444444-4444-4444-8444-444444444444";
const customerId = "55555555-5555-4555-8555-555555555555";
const bindingId = "66666666-6666-4666-8666-666666666666";

const binding = {
  binding: {
    id: bindingId,
    organizationId,
    storeId,
    localTemplateId: "77777777-7777-4777-8777-777777777777",
    cloudTemplateId: "88888888-8888-4888-8888-888888888888",
    whatsappBusinessAccountId: "99999999-9999-4999-8999-999999999999",
    kind: "promotion" as const,
    isDefault: true,
    isActive: true,
    createdAt: "2026-08-22T10:00:00.000Z",
    updatedAt: "2026-08-22T10:00:00.000Z",
  },
  asset: {
    id: "88888888-8888-4888-8888-888888888888",
    organizationId,
    whatsappBusinessAccountId: "99999999-9999-4999-8999-999999999999",
    metaTemplateId: "offer",
    name: "offer",
    languageCode: "en_US",
    category: "marketing" as const,
    status: "approved" as const,
    components: [],
    rejectionReason: null,
    providerUpdatedAt: null,
    lastSyncedAt: "2026-08-22T10:00:00.000Z",
    version: 2,
  },
};

describe("Cloud template send service", () => {
  test("admits first, then queues the versioned template snapshot", async () => {
    let queuedSnapshotVersion: number | null = null;
    let queuedIdempotencyKey: string | null = null;
    const response = await enqueueCloudTemplateSend(userId, organizationId, {
      storeId,
      accountId,
      customerId,
      bindingId,
      idempotencyKey: "promotion:campaign-1:recipient-1",
      intent: "promotion",
    }, {
      organizationAccess: async () => true,
      getBinding: async () => binding,
      getCustomer: async () => ({ id: customerId, name: "Asha", phone: "+919876543210", marketingOptedIn: true, marketingOptedOut: false, utilityOptedIn: true, whatsappSuppressed: false }),
      enqueue: async input => { queuedSnapshotVersion = input.snapshot.version; queuedIdempotencyKey = input.idempotencyKey; return { messageId: "message-1", outboxId: "outbox-1", messageStatus: "queued", outboxStatus: "pending" }; },
    });
    expect(response.status).toBe("success");
    expect(queuedSnapshotVersion as unknown as number).toBe(2);
    expect(queuedIdempotencyKey as unknown as string).toBe("promotion:campaign-1:recipient-1");
  });

  test("blocks a rejected template before enqueue", async () => {
    let enqueueCalled = false;
    const response = await enqueueCloudTemplateSend(userId, organizationId, { storeId, accountId, customerId, bindingId, idempotencyKey: "promotion:campaign-1:recipient-2", intent: "promotion" }, {
      organizationAccess: async () => true,
      getBinding: async () => ({ ...binding, asset: { ...binding.asset, status: "rejected" as const } }),
      getCustomer: async () => ({ id: customerId, name: "Asha", phone: "+919876543210", marketingOptedIn: true, marketingOptedOut: false, utilityOptedIn: true, whatsappSuppressed: false }),
      enqueue: async () => { enqueueCalled = true; return { messageId: "message-1", outboxId: "outbox-1", messageStatus: "queued", outboxStatus: "pending" }; },
    });
    expect(response.status).toBe("error");
    expect(response.message).toContain("not approved");
    expect(enqueueCalled).toBe(false);
  });
});
