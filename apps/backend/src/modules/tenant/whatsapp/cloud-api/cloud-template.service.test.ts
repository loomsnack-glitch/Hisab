import { describe, expect, test } from "bun:test";
import { listCloudTemplatesForAccount, submitCloudTemplateForAccount, syncCloudTemplatesForAccount } from "./cloud-template.service";

const organizationId = "11111111-1111-4111-8111-111111111111";
const userId = "33333333-3333-4333-8333-333333333333";
const accountId = "44444444-4444-4444-8444-444444444444";
const businessAccountId = "55555555-5555-4555-8555-555555555555";

const accountSnapshot = {
  id: accountId,
  organizationId,
  whatsappBusinessAccountId: businessAccountId,
  wabaId: "1234567890",
  phoneNumberId: "9876543210",
  verifiedName: "Ganatri",
  status: "connected" as const,
  qualityRating: null,
  messagingLimit: null,
  lastLimitSyncedAt: null,
  lastWebhookAt: null,
  lastGraphApiAt: null,
  lastErrorCode: null,
};

describe("Cloud template synchronization service", () => {
  test("discovers provider templates with an in-memory credential and upserts normalized assets", async () => {
    let upserted: unknown[] = [];
    const response = await syncCloudTemplatesForAccount(userId, organizationId, accountId, {
      organizationAccess: async () => true,
      getAccount: async () => accountSnapshot,
      getCredential: async () => ({ businessAccountId, reference: "secret://cloud/1", keyVersion: "kms-v1" }),
      vault: {
        async store() { return { reference: "unused", keyVersion: "unused" }; },
        async resolve() { return "token-in-memory"; },
        async rotate() { return { reference: "unused", keyVersion: "unused" }; },
        async revoke() {},
      },
      createClient: () => ({
        async getTemplates() {
          return { data: [{ id: "meta-1", name: "bill_ready", language: "en_US", category: "UTILITY", status: "APPROVED", components: [] }] };
        },
      }),
      upsert: async assets => { upserted = assets; return assets.map((asset, index) => ({
        id: `66666666-6666-4666-8666-66666666666${index}`,
        ...asset,
        lastSyncedAt: "2026-08-22T10:00:00.000Z",
        version: 1,
      })); },
    });
    expect(response.status).toBe("success");
    expect(upserted).toHaveLength(1);
    expect(response.data?.templates[0]?.status).toBe("approved");
  });

  test("lists templates with the internal business-account UUID, not the provider WABA ID", async () => {
    let listedWith: string | undefined;
    const response = await listCloudTemplatesForAccount(userId, organizationId, accountId, {
      organizationAccess: async () => true,
      getAccount: async () => accountSnapshot,
      list: async (listedOrganizationId, listedBusinessAccountId) => {
        expect(listedOrganizationId).toBe(organizationId);
        listedWith = listedBusinessAccountId;
        return [];
      },
    });

    expect(response.status).toBe("success");
    expect(listedWith).toBe(businessAccountId);
  });

  test("persists the submission before creating a provider template and reconciles the returned asset", async () => {
    const created: string[] = [];
    let providerCreated = false;
    let update: Record<string, unknown> | undefined;
    const submission = {
      id: "77777777-7777-4777-8777-777777777777",
      organizationId,
      whatsappBusinessAccountId: businessAccountId,
      originatingStoreId: null,
      localTemplateId: null,
      kind: "bill" as const,
      friendlyName: "Bill ready",
      metaTemplateName: "bill_ready",
      languageCode: "en_US",
      category: "utility" as const,
      requestedComponents: [{ type: "BODY", text: "Hello {{1}}" }],
      sampleValues: { "1": "Customer" },
      idempotencyKey: "idem-1",
      metaTemplateId: null,
      status: "draft" as const,
      rejectionReason: null,
      lastErrorCode: null,
      lastErrorMessage: null,
      submittedAt: null,
      providerUpdatedAt: null,
      createdBy: userId,
      updatedBy: userId,
      createdAt: "2026-08-23T10:00:00.000Z",
      updatedAt: "2026-08-23T10:00:00.000Z",
    };
    const response = await submitCloudTemplateForAccount(userId, organizationId, accountId, {
      whatsappBusinessAccountId: businessAccountId,
      kind: "bill",
      friendlyName: "Bill ready",
      metaTemplateName: "bill_ready",
      languageCode: "en_US",
      components: [{ type: "BODY", text: "Hello {{1}}" }],
      sampleValues: { "1": "Customer" },
      idempotencyKey: "idem-1",
    }, {
      organizationAccess: async () => true,
      getAccount: async () => accountSnapshot,
      getCredential: async () => ({ businessAccountId, reference: "secret://cloud/1", keyVersion: "kms-v1" }),
      isAccountAssignedToStore: async () => true,
      vault: {
        async store() { return { reference: "unused", keyVersion: "unused" }; },
        async resolve() { return "token-in-memory"; },
        async rotate() { return { reference: "unused", keyVersion: "unused" }; },
        async revoke() {},
      },
      createSubmission: async input => { created.push(input.idempotencyKey); return submission; },
      updateSubmission: async (_organizationId, _submissionId, values) => {
        update = values;
        return { ...submission, ...values, metaTemplateId: values.metaTemplateId ?? submission.metaTemplateId, status: values.status ?? submission.status } as typeof submission;
      },
      createClient: () => ({
        async getTemplates() {
          return !providerCreated
            ? { data: [] }
            : { data: [{ id: "meta-1", name: "bill_ready", language: "en_US", category: "UTILITY", status: "PENDING", components: [{ type: "BODY", text: "Hello {{1}}" }] }] };
        },
        async createMessageTemplate() { providerCreated = true; created.push("provider-create"); return { id: "meta-1", status: "PENDING" }; },
      }),
      upsert: async assets => assets.map((asset, index) => ({ id: `66666666-6666-4666-8666-66666666666${index}`, ...asset, lastSyncedAt: "2026-08-23T10:00:00.000Z", version: 1 })),
    });

    expect(response.status).toBe("success");
    expect(created).toEqual(["idem-1", "provider-create"]);
    expect(update?.status).toBe("pending");
    expect(response.data?.submission.metaTemplateId).toBe("meta-1");
    expect(response.data?.template?.name).toBe("bill_ready");
  });
});
