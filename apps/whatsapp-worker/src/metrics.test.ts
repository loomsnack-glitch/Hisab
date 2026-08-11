import { describe, expect, test } from "bun:test";
import { WorkerMetrics } from "./metrics.js";

describe("worker metrics", () => {
    test("tracks bounded dispatch and operations aggregates without sensitive payloads", () => {
        const metrics = new WorkerMetrics();
        metrics.setAccountStatus("account-1", "connected");
        metrics.setAccountStatus("account-2", "failed");
        metrics.recordClaim();
        metrics.recordDispatchSuccess();
        metrics.recordInboundMessage(true);
        metrics.recordInboundFailure();
        metrics.recordOperationsRefresh({
            pendingCount: 3,
            processingCount: 1,
            retryableCount: 2,
            deadLetterCount: 1,
            oldestPendingAgeSeconds: 42,
            connectedAccountCount: 1,
            accountCount: 2,
        });

        const snapshot = metrics.snapshot("worker-1", 2, 0);
        expect(snapshot.accountCount).toBe(2);
        expect(snapshot.connectedAccountCount).toBe(1);
        expect(snapshot.activeDispatches).toBe(0);
        expect(snapshot.dispatchSuccesses).toBe(1);
        expect(snapshot.inboundMessages).toBe(1);
        expect(snapshot.inboundFailures).toBe(1);
        expect(snapshot.operations?.oldestPendingAgeSeconds).toBe(42);

        const prometheus = metrics.prometheus("worker-1", 2, 0);
        expect(prometheus).toContain("whatsapp_outbox_oldest_pending_age_seconds");
        expect(prometheus).not.toContain("account-1");
    });
});
