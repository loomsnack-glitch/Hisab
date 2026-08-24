import { beforeEach, describe, expect, mock, test, type Mock } from "bun:test";

const defaultStoreId = "651d6c3a-6d7c-4f57-9f92-0f95b4f8a1a1";
const routedStoreId = "21705de9-81e1-4452-919b-800c99073f27";

type PgMock = Mock<(...args: unknown[]) => Promise<unknown[]>> & {
    begin: <T>(callback: (tx: PgMock) => Promise<T>) => Promise<T>;
};

const query = mock(async (..._args: unknown[]) => [{ store_id: defaultStoreId }]) as unknown as PgMock;
query.begin = async callback => callback(query);

mock.module("@/config/db", () => ({ pg: query }));

const {
    claimPendingProviderEvents,
    resolveMessageEventStore,
    shouldApplyCloudFailureSideEffects,
    updateCloudMessageStatus,
} = await import("./whatsapp.repository?routing-test");

const baseParams = {
    whatsappAccountId: "82eb216c-be36-4575-8007-bd04b743c4b2",
    externalChatId: "919876543210@s.whatsapp.net",
    messageType: "text" as const,
    body: "Hello",
    caption: null,
    attachmentFileName: null,
    occurredAt: "2026-08-16T15:00:00.000Z",
};

describe("WhatsApp message event Store routing", () => {
    beforeEach(() => {
        query.mockClear();
        query.mockImplementation(async () => [{ store_id: defaultStoreId }]);
    });

    test("routes an outbound provider event to its pending Store message", async () => {
        query.mockImplementationOnce(async () => [{ store_id: routedStoreId }]);
        await expect(resolveMessageEventStore({ ...baseParams, direction: "outbound" })).resolves.toBe(routedStoreId);
        expect(query).toHaveBeenCalledTimes(1);
    });

    test("routes an inbound event to the most relevant existing conversation", async () => {
        await expect(resolveMessageEventStore({ ...baseParams, direction: "inbound" })).resolves.toBe(defaultStoreId);
        expect(query).toHaveBeenCalledTimes(1);
    });

    test("normalizes JSONB provider payloads returned as strings", async () => {
        query.mockImplementationOnce(async () => [{
            id: "56d5fd47-4386-4e40-96ca-dcd1b4e9bfac",
            whatsapp_account_id: baseParams.whatsappAccountId,
            provider_event_id: baseParams.externalChatId,
            payload: JSON.stringify({ ...baseParams, direction: "inbound", source: "realtime" }),
        }]);

        await expect(claimPendingProviderEvents()).resolves.toEqual([{
            id: "56d5fd47-4386-4e40-96ca-dcd1b4e9bfac",
            accountId: baseParams.whatsappAccountId,
            providerEventId: baseParams.externalChatId,
            payload: { ...baseParams, direction: "inbound", source: "realtime" },
        }]);
    });

    test("does not apply Cloud failure side effects after terminal delivery or cancellation", () => {
        expect(shouldApplyCloudFailureSideEffects("delivered", "sent")).toBe(false);
        expect(shouldApplyCloudFailureSideEffects("read", "sent")).toBe(false);
        expect(shouldApplyCloudFailureSideEffects("failed", "retryable")).toBe(false);
        expect(shouldApplyCloudFailureSideEffects("sent", "sent")).toBe(true);
        expect(shouldApplyCloudFailureSideEffects("sending", "processing")).toBe(true);
        expect(shouldApplyCloudFailureSideEffects("sending", "cancelled")).toBe(false);
    });

    test("casts the optional callback parameter before PostgreSQL checks it", async () => {
        const calls: unknown[][] = [];
        query.mockImplementationOnce(async (...args: unknown[]) => {
            calls.push(args);
            return [{
                id: "message-1",
                message_status: "queued",
                outbox_id: null,
                outbox_status: null,
                cloud_quota_reservation_id: null,
            }];
        });
        query.mockImplementationOnce(async (...args: unknown[]) => {
            calls.push(args);
            return [{ id: "message-1" }];
        });

        await expect(updateCloudMessageStatus(
            "account-1",
            "wamid.provider-1",
            "invoice:1",
            "sent",
            "2026-08-23T14:33:00.000Z",
            null,
            null,
        )).resolves.toBe("updated");

        const sql = String((calls[0]?.[0] as TemplateStringsArray | undefined)?.join("?"));
        expect(sql).toContain("?::text IS NOT NULL");
    });
});
