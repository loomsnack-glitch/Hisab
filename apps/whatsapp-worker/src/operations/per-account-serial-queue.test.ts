import { describe, expect, test } from "bun:test";
import { PerAccountSerialQueue } from "./per-account-serial-queue.js";

const deferred = <T>() => {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>(next => { resolve = next; });
    return { promise, resolve };
};

describe("per-account outbound scheduling", () => {
    test("serializes work for one account while allowing another account to proceed", async () => {
        const queue = new PerAccountSerialQueue();
        const first = deferred<void>();
        const order: string[] = [];

        const firstAccount = queue.run("account-a", async () => {
            order.push("a:start");
            await first.promise;
            order.push("a:end");
        });
        const secondAccount = queue.run("account-a", async () => { order.push("a:second"); });
        const independentAccount = queue.run("account-b", async () => { order.push("b:start"); });

        await independentAccount;
        expect(order).toEqual(["a:start", "b:start"]);
        first.resolve();
        await Promise.all([firstAccount, secondAccount]);
        expect(order).toEqual(["a:start", "b:start", "a:end", "a:second"]);
        expect(queue.size()).toBe(0);
    });

    test("does not leave an account blocked after a failed task", async () => {
        const queue = new PerAccountSerialQueue();
        await expect(queue.run("account-a", async () => { throw new Error("temporary"); })).rejects.toThrow("temporary");
        await expect(queue.run("account-a", async () => "recovered")).resolves.toBe("recovered");
    });

    test("enforces a configurable interval between sends for one account", async () => {
        let currentTime = 0;
        const sleeps: number[] = [];
        const queue = new PerAccountSerialQueue({
            minimumIntervalMs: 100,
            now: () => currentTime,
            sleep: async milliseconds => {
                sleeps.push(milliseconds);
                currentTime += milliseconds;
            },
        });
        await queue.run("account-a", async () => undefined);
        await queue.run("account-a", async () => undefined);
        expect(sleeps).toEqual([100]);
    });
});
