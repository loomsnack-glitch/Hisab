import { describe, expect, test } from "bun:test";

import { createConcurrentTaskQueue } from "./concurrent-task-queue";

describe("createConcurrentTaskQueue", () => {
    test("does not run more tasks than its configured concurrency", async () => {
        const queue = createConcurrentTaskQueue(2);
        let running = 0;
        let peakRunning = 0;

        await Promise.all(
            Array.from({ length: 5 }, () => queue.run(async () => {
                running += 1;
                peakRunning = Math.max(peakRunning, running);
                await new Promise((resolve) => setTimeout(resolve, 5));
                running -= 1;
            })),
        );

        expect(peakRunning).toBe(2);
    });
});
