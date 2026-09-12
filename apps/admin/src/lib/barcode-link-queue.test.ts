import { describe, expect, test } from "bun:test";

import {
    createUnknownProductCodeQueue,
    getCatalogProductCodeLinkPath,
} from "./barcode-link-queue";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const memory = new Map<string, string>();
const localStorage = {
    clear: () => memory.clear(),
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
        memory.set(key, value);
    },
    removeItem: (key: string) => {
        memory.delete(key);
    },
};

describe("barcode link queue", () => {
    test("queues an unknown Product Code without creating a Product", () => {
        memory.clear();
        const queue = createUnknownProductCodeQueue(localStorage);

        const queued = queue.enqueue({
            organizationId,
            productCode: "missing-code",
            storeId: "store-1",
            deviceId: "device-1",
        });

        expect(queued).toHaveLength(1);
        expect(queued[0]?.productCode).toBe("missing-code");
        expect(queue.list(organizationId)).toHaveLength(1);
        expect(getCatalogProductCodeLinkPath(organizationId, "missing-code")).toBe(
            `/organizations/${organizationId}/products/list?linkProductCode=missing-code`,
        );
    });

    test("replaces a duplicate queued code and can dismiss it", () => {
        memory.clear();
        const queue = createUnknownProductCodeQueue(localStorage);
        queue.enqueue({ organizationId, productCode: "missing-code" });
        queue.enqueue({ organizationId, productCode: "missing-code" });
        expect(queue.list(organizationId)).toHaveLength(1);

        queue.dequeue(organizationId, "missing-code");
        expect(queue.list(organizationId)).toEqual([]);
    });
});
