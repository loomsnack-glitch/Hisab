export type UnknownProductCodeLinkRequest = {
    productCode: string;
    organizationId: string;
    storeId?: string | null;
    deviceId?: string | null;
    queuedAt: string;
};

const LINK_QUEUE_LIMIT = 50;

type QueueStorage = Pick<Storage, "getItem" | "setItem">;

const storageKey = (organizationId: string) => `hisab:barcode-link-queue:${organizationId}`;

export const createUnknownProductCodeQueue = (storage: QueueStorage | null) => {
    const readQueue = (organizationId: string): UnknownProductCodeLinkRequest[] => {
        if (!organizationId || !storage) {
            return [];
        }

        try {
            const stored = storage.getItem(storageKey(organizationId));
            const parsed = stored ? (JSON.parse(stored) as UnknownProductCodeLinkRequest[]) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    };

    const writeQueue = (organizationId: string, queue: UnknownProductCodeLinkRequest[]) => {
        storage?.setItem(storageKey(organizationId), JSON.stringify(queue.slice(-LINK_QUEUE_LIMIT)));
    };

    const list = (organizationId: string) => readQueue(organizationId);

    const enqueue = (
        input: Omit<UnknownProductCodeLinkRequest, "queuedAt"> & { queuedAt?: string },
    ): UnknownProductCodeLinkRequest[] => {
        const nextRequest: UnknownProductCodeLinkRequest = {
            productCode: input.productCode,
            organizationId: input.organizationId,
            storeId: input.storeId ?? null,
            deviceId: input.deviceId ?? null,
            queuedAt: input.queuedAt ?? new Date().toISOString(),
        };
        const current = readQueue(input.organizationId);
        const withoutDuplicate = current.filter((item) => item.productCode !== nextRequest.productCode);
        const next = [...withoutDuplicate, nextRequest];
        try {
            writeQueue(input.organizationId, next);
        } catch {
            // The returned queue still lets the current caller retain the code.
        }
        return next;
    };

    const dequeue = (organizationId: string, productCode: string) => {
        const next = readQueue(organizationId).filter((item) => item.productCode !== productCode);
        try {
            writeQueue(organizationId, next);
        } catch {
            // Removing the visible queue item is sufficient when storage is unavailable.
        }
        return next;
    };

    return { list, enqueue, dequeue };
};

const getBrowserStorage = (): QueueStorage | null => {
    if (typeof window === "undefined") {
        return null;
    }

    try {
        return window.localStorage;
    } catch {
        return null;
    }
};

const browserQueue = () => createUnknownProductCodeQueue(getBrowserStorage());

export const listUnknownProductCodeQueue = (organizationId: string) => browserQueue().list(organizationId);

export const enqueueUnknownProductCode = (
    input: Omit<UnknownProductCodeLinkRequest, "queuedAt"> & { queuedAt?: string },
) => browserQueue().enqueue(input);

export const dequeueUnknownProductCode = (organizationId: string, productCode: string) =>
    browserQueue().dequeue(organizationId, productCode);

export const getCatalogProductCodeLinkPath = (organizationId: string, productCode: string) =>
    `/organizations/${organizationId}/products/list?linkProductCode=${encodeURIComponent(productCode)}`;
