import { afterEach, describe, expect, test } from "bun:test";
import { Window } from "happy-dom";
import type { DeviceSessionDTO, ProductResponseDTO } from "@repo/types";

const globalWithTestDom = globalThis as typeof globalThis & { __hisabTestDomInstalled?: boolean };
if (!globalWithTestDom.__hisabTestDomInstalled) {
    const testWindow = new Window({ url: "http://localhost" });
    const requestAnimationFrame = (callback: FrameRequestCallback) =>
        Number(setTimeout(() => callback(Date.now()), 16));
    const cancelAnimationFrame = (id: number) => clearTimeout(id);

    Object.assign(globalThis, {
        Element: testWindow.Element,
        Event: testWindow.Event,
        KeyboardEvent: testWindow.KeyboardEvent,
        document: testWindow.document,
        HTMLElement: testWindow.HTMLElement,
        HTMLInputElement: testWindow.HTMLInputElement,
        Node: testWindow.Node,
        MutationObserver: testWindow.MutationObserver,
        ResizeObserver: testWindow.ResizeObserver,
        getComputedStyle: testWindow.getComputedStyle.bind(testWindow),
        navigator: testWindow.navigator,
        window: testWindow,
        requestAnimationFrame,
        cancelAnimationFrame,
    });
    globalWithTestDom.__hisabTestDomInstalled = true;
}

const { act, cleanup, fireEvent, render, screen } = await import("@testing-library/react");
const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query");
const { MemoryRouter } = await import("react-router-dom");
const { default: BillingPage } = await import("@/pages/billing-page");
const { billingKeys, catalogKeys } = await import("@/lib/query-keys");
const { getSalesDateBounds, startOfLocalDay } = await import("@/lib/billing/sales-date");

afterEach(cleanup);

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const storeId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const deviceId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const categoryId = "11111111-1111-4111-8111-111111111111";
const now = "2026-09-13T00:00:00.000Z";

const milk = {
    id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    organizationId,
    categoryId,
    name: "Milk",
    sortOrder: 0,
    price: 42,
    discount: 0,
    imagePath: null,
    productType: "single",
    productCode: "0012345678905",
    productCodeKind: "manufacturer",
    unitId: "98989898-9898-4989-8989-989898989898",
    defaultSellingQuantity: 1,
    allowCustomSellingQuantity: false,
    unitLabel: "pc",
    status: "active",
    createdBy: "11111111-1111-4111-8111-111111111111",
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
    imageSignedUrl: null,
    labelProfile: null,
} as ProductResponseDTO;

const session: DeviceSessionDTO = {
    device: {
        id: deviceId,
        organizationId,
        storeId,
        name: "Counter 1",
        loginUsername: "counter-1",
        status: "active",
        lastSeenAt: now,
    },
    store: {
        id: storeId,
        organizationId,
        name: "Adajan",
        address: null,
        kotSystemEnabled: false,
        tableManagementEnabled: false,
        moneyAccountTrackingEnabled: false,
    },
    organization: {
        id: organizationId,
        name: "Demo Org",
        username: "demo",
        tagline: null,
    },
};

const success = <T,>(data: T) => ({
    status: "success" as const,
    data,
    message: "ok",
    code: 200,
});

const renderBilling = (options?: { attachments?: boolean }) => {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const today = startOfLocalDay(new Date());
    const bounds = getSalesDateBounds("date", today, null, null, "today");
    const salesQueryParams = {
        limit: 40,
        sort: "newest" as const,
        status: undefined,
        paymentStatus: undefined,
        search: undefined,
        paymentMethods: undefined,
        createdFrom: bounds.from?.toISOString(),
        createdTo: bounds.to?.toISOString(),
    };

    queryClient.setQueryData(catalogKeys.categories(organizationId), success({ categories: [] }));
    queryClient.setQueryData(
        catalogKeys.products(organizationId),
        success({ products: [milk], inactiveProductCodes: [] }),
    );
    queryClient.setQueryData(catalogKeys.combos(organizationId), success({ combos: [] }));
    queryClient.setQueryData(
        catalogKeys.selectableProductAttachments(organizationId),
        success({
            attachments: options?.attachments
                ? [{ productId: milk.id, addOnId: "add-on-1", addOn: { id: "add-on-1", name: "Extra" } }]
                : [],
        }),
    );
    queryClient.setQueryData(
        ["pos", "settings", deviceId],
        success({
            organizationCatalogSettings: {
                organizationId,
                barcodeScanningEnabled: true,
                createdAt: now,
                updatedAt: now,
            },
            storeDevicePosSettings: {
                deviceId,
                organizationId,
                storeId,
                directBarcodeScanEnabled: true,
                createdAt: now,
                updatedAt: now,
            },
        }),
    );
    queryClient.setQueryData(
        billingKeys.customers(organizationId, { mode: "device", search: "" }),
        success({ customers: [], pageInfo: { hasMore: false, nextCursor: null } }),
    );
    queryClient.setQueryData(billingKeys.sales(organizationId, storeId, salesQueryParams), {
        pages: [
            success({
                sales: [],
                summary: null,
                pageInfo: { hasMore: false, nextCursor: null },
            }),
        ],
        pageParams: [null],
    });

    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter>
                <BillingPage mode="device" session={session} initialPanelTab="products" />
            </MemoryRouter>
        </QueryClientProvider>,
    );
};

const scanHid = (productCode: string) => {
    for (const key of productCode) {
        fireEvent.keyDown(window, { key, bubbles: true });
    }
    fireEvent.keyDown(window, { key: "Enter", bubbles: true });
};

describe("BillingPage HID barcode capture", () => {
    test("captures a desktop HID scan into the cart when the scan field is visible", async () => {
        renderBilling();

        expect(screen.getByPlaceholderText("Scan or type code")).toBeTruthy();

        await act(async () => {
            scanHid("0012345678905");
        });

        expect(await screen.findByText("Milk added. Quantity 1.")).toBeTruthy();
        expect(screen.getByText("Milk")).toBeTruthy();
    });

    test("prevents the default HID Enter terminator and ignores typing in other fields or dialogs", async () => {
        renderBilling();

        const enterEvent = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
        await act(async () => {
            scanHid("0012345678905");
        });
        window.dispatchEvent(enterEvent);

        const search = document.createElement("input");
        search.setAttribute("aria-label", "Unrelated field");
        document.body.appendChild(search);
        search.focus();
        await act(async () => {
            scanHid("0012345678905");
        });
        search.remove();

        const dialog = document.createElement("div");
        dialog.setAttribute("role", "dialog");
        document.body.appendChild(dialog);
        await act(async () => {
            scanHid("0012345678905");
        });
        dialog.remove();

        expect(screen.getByText("Milk added. Quantity 1.")).toBeTruthy();
    });

    test("opens configuration instead of adding when a HID scan resolves to a Product with add-ons", async () => {
        renderBilling({ attachments: true });

        await act(async () => {
            scanHid("0012345678905");
        });

        expect(await screen.findByText("Choose options for Milk.")).toBeTruthy();
        expect(screen.queryByText("Milk added. Quantity 1.")).toBeNull();
    });
});
