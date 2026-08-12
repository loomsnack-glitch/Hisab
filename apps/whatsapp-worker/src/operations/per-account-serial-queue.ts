type QueueOptions = {
    minimumIntervalMs?: number;
    now?: () => number;
    sleep?: (milliseconds: number) => Promise<void>;
};

export class PerAccountSerialQueue {
    private readonly tails = new Map<string, Promise<unknown>>();
    private readonly lastStartedAt = new Map<string, number>();
    private readonly minimumIntervalMs: number;
    private readonly now: () => number;
    private readonly sleep: (milliseconds: number) => Promise<void>;

    public constructor(options: QueueOptions = {}) {
        this.minimumIntervalMs = Math.max(0, options.minimumIntervalMs ?? 0);
        this.now = options.now ?? Date.now;
        this.sleep = options.sleep ?? (milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)));
    }

    public async run<T>(accountId: string, task: () => Promise<T>): Promise<T> {
        const previous = this.tails.get(accountId) ?? Promise.resolve();
        const current = previous.catch(() => undefined).then(async () => {
            const waitFor = (this.lastStartedAt.get(accountId) ?? 0) + this.minimumIntervalMs - this.now();
            if (waitFor > 0) await this.sleep(waitFor);
            this.lastStartedAt.set(accountId, this.now());
            return task();
        });
        this.tails.set(accountId, current);
        try {
            return await current;
        } finally {
            if (this.tails.get(accountId) === current) {
                this.tails.delete(accountId);
                this.lastStartedAt.delete(accountId);
            }
        }
    }

    public size(): number {
        return this.tails.size;
    }
}
