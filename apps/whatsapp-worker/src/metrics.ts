type AccountStatus = "pending_qr" | "connecting" | "connected" | "disconnected" | "failed" | "revoked";

export type OperationsMetrics = {
    pendingCount: number;
    processingCount: number;
    retryableCount: number;
    deadLetterCount: number;
    oldestPendingAgeSeconds: number;
    connectedAccountCount: number;
    accountCount: number;
};

export class WorkerMetrics {
    private readonly startedAt = Date.now();
    private readonly accountStatuses = new Map<string, AccountStatus>();
    private claims = 0;
    private dispatchSuccesses = 0;
    private dispatchFailures = 0;
    private inboundMessages = 0;
    private inboundFailures = 0;
    private activeDispatches = 0;
    private maxActiveDispatches = 0;
    private lastDispatchAt: number | null = null;
    private lastOperationsRefreshAt: number | null = null;
    private operationsRefreshFailures = 0;
    private operations: OperationsMetrics | null = null;

    public setAccountStatus(accountId: string, status: AccountStatus): void {
        this.accountStatuses.set(accountId, status);
    }

    public recordClaim(): void {
        this.claims += 1;
        this.activeDispatches += 1;
        this.maxActiveDispatches = Math.max(this.maxActiveDispatches, this.activeDispatches);
    }

    public recordDispatchSuccess(): void {
        this.dispatchSuccesses += 1;
        this.finishDispatch();
    }

    public recordDispatchFailure(): void {
        this.dispatchFailures += 1;
        this.finishDispatch();
    }

    public recordInboundMessage(stored: boolean): void {
        if (stored) this.inboundMessages += 1;
    }

    public recordInboundFailure(): void {
        this.inboundFailures += 1;
    }

    public recordOperationsRefresh(metrics: OperationsMetrics): void {
        this.operations = metrics;
        this.lastOperationsRefreshAt = Date.now();
    }

    public recordOperationsRefreshFailure(): void {
        this.operationsRefreshFailures += 1;
    }

    public snapshot(workerId: string, partitionCount: number, partitionIndex: number) {
        return {
            workerId,
            partitionCount,
            partitionIndex,
            uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1_000),
            accountCount: this.accountStatuses.size,
            connectedAccountCount: [...this.accountStatuses.values()].filter(status => status === "connected").length,
            claims: this.claims,
            dispatchSuccesses: this.dispatchSuccesses,
            dispatchFailures: this.dispatchFailures,
            inboundMessages: this.inboundMessages,
            inboundFailures: this.inboundFailures,
            activeDispatches: this.activeDispatches,
            maxActiveDispatches: this.maxActiveDispatches,
            lastDispatchAt: this.lastDispatchAt ? new Date(this.lastDispatchAt).toISOString() : null,
            lastOperationsRefreshAt: this.lastOperationsRefreshAt ? new Date(this.lastOperationsRefreshAt).toISOString() : null,
            operationsRefreshFailures: this.operationsRefreshFailures,
            operations: this.operations,
        };
    }

    public recordDispatchCompleted(): void {
        this.lastDispatchAt = Date.now();
    }

    public prometheus(workerId: string, partitionCount: number, partitionIndex: number): string {
        const snapshot = this.snapshot(workerId, partitionCount, partitionIndex);
        const labels = `worker_id="${escapeLabel(workerId)}",partition_index="${partitionIndex}",partition_count="${partitionCount}"`;
        const lines = [
            "# TYPE whatsapp_worker_uptime_seconds gauge",
            `whatsapp_worker_uptime_seconds{${labels}} ${snapshot.uptimeSeconds}`,
            "# TYPE whatsapp_worker_accounts gauge",
            `whatsapp_worker_accounts{${labels}} ${snapshot.accountCount}`,
            "# TYPE whatsapp_worker_connected_accounts gauge",
            `whatsapp_worker_connected_accounts{${labels}} ${snapshot.connectedAccountCount}`,
            "# TYPE whatsapp_worker_active_dispatches gauge",
            `whatsapp_worker_active_dispatches{${labels}} ${snapshot.activeDispatches}`,
            "# TYPE whatsapp_worker_max_active_dispatches gauge",
            `whatsapp_worker_max_active_dispatches{${labels}} ${snapshot.maxActiveDispatches}`,
            "# TYPE whatsapp_worker_dispatch_claims_total counter",
            `whatsapp_worker_dispatch_claims_total{${labels}} ${snapshot.claims}`,
            "# TYPE whatsapp_worker_dispatch_successes_total counter",
            `whatsapp_worker_dispatch_successes_total{${labels}} ${snapshot.dispatchSuccesses}`,
            "# TYPE whatsapp_worker_dispatch_failures_total counter",
            `whatsapp_worker_dispatch_failures_total{${labels}} ${snapshot.dispatchFailures}`,
            "# TYPE whatsapp_worker_inbound_messages_total counter",
            `whatsapp_worker_inbound_messages_total{${labels}} ${snapshot.inboundMessages}`,
            "# TYPE whatsapp_worker_inbound_failures_total counter",
            `whatsapp_worker_inbound_failures_total{${labels}} ${snapshot.inboundFailures}`,
            "# TYPE whatsapp_worker_operations_refresh_failures_total counter",
            `whatsapp_worker_operations_refresh_failures_total{${labels}} ${snapshot.operationsRefreshFailures}`,
        ];
        if (snapshot.operations) {
            lines.push(
                "# TYPE whatsapp_outbox_pending gauge",
                `whatsapp_outbox_pending{${labels}} ${snapshot.operations.pendingCount}`,
                "# TYPE whatsapp_outbox_processing gauge",
                `whatsapp_outbox_processing{${labels}} ${snapshot.operations.processingCount}`,
                "# TYPE whatsapp_outbox_retryable gauge",
                `whatsapp_outbox_retryable{${labels}} ${snapshot.operations.retryableCount}`,
                "# TYPE whatsapp_outbox_dead_letter gauge",
                `whatsapp_outbox_dead_letter{${labels}} ${snapshot.operations.deadLetterCount}`,
                "# TYPE whatsapp_outbox_oldest_pending_age_seconds gauge",
                `whatsapp_outbox_oldest_pending_age_seconds{${labels}} ${snapshot.operations.oldestPendingAgeSeconds}`,
                "# TYPE whatsapp_api_connected_accounts gauge",
                `whatsapp_api_connected_accounts{${labels}} ${snapshot.operations.connectedAccountCount}`,
                "# TYPE whatsapp_api_accounts gauge",
                `whatsapp_api_accounts{${labels}} ${snapshot.operations.accountCount}`,
            );
        }
        return lines.join("\n") + "\n";
    }

    private finishDispatch(): void {
        this.activeDispatches = Math.max(0, this.activeDispatches - 1);
        this.recordDispatchCompleted();
    }
}

const escapeLabel = (value: string) => value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
