import { afterEach, describe, expect, mock, test } from "bun:test";
import { Window } from "happy-dom";
import type { SaleSummaryDTO } from "@repo/types";
import { formatCurrency } from "@repo/ui/lib/money";

const globalWithTestDom = globalThis as typeof globalThis & { __hisabTestDomInstalled?: boolean };
if (!globalWithTestDom.__hisabTestDomInstalled) {
    const testWindow = new Window({ url: "http://localhost" });
    const requestAnimationFrame = (callback: FrameRequestCallback) =>
        Number(setTimeout(() => callback(Date.now()), 16));
    const cancelAnimationFrame = (id: number) => clearTimeout(id);

    Object.assign(globalThis, {
        Element: testWindow.Element,
        Event: testWindow.Event,
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

const { cleanup, fireEvent, render, screen } = await import("@testing-library/react");
const { BillingBillsPanel } = await import("./billing-bills-panel");
import type { BillingBillsPanelProps } from "./billing-bills-panel";

afterEach(cleanup);

const today = new Date("2026-09-13T10:00:00.000Z");

const sale = (overrides: Partial<SaleSummaryDTO> = {}): SaleSummaryDTO =>
    ({
        id: "11111111-1111-4111-8111-111111111111",
        organizationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        storeId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        saleNumber: "42",
        serviceMode: "dine_in",
        status: "completed",
        paymentStatus: "paid",
        subtotal: 100,
        discountTotal: 0,
        grandTotal: 100,
        paidTotal: 100,
        dueTotal: 0,
        itemCount: 2,
        customer: { id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", name: "Asha", phone: null },
        createdAt: "2026-09-13T10:00:00.000Z",
        updatedAt: "2026-09-13T10:00:00.000Z",
        ...overrides,
    }) as SaleSummaryDTO;

const panelProps = (overrides: Partial<BillingBillsPanelProps> = {}): BillingBillsPanelProps => ({
    store: {
        showStoreSwitcher: false,
        stores: [{ id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", name: "Adajan" }],
        selectedStoreId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        onStoreChange: mock(() => undefined),
    },
    toolbar: {
        paymentMethodSelection: new Set(),
        onPaymentMethodSelectionChange: mock(() => undefined),
        sortBy: "newest",
        onSortChange: mock(() => undefined),
        hasToolbarFilters: false,
        onClearToolbarFilters: mock(() => undefined),
        toolbarFilterCount: 0,
    },
    date: {
        applied: {
            mode: "date",
            preset: "today",
            specificDate: today,
            fromDate: null,
            toDate: null,
        },
        popoverOpen: false,
        onPopoverOpenChange: mock(() => undefined),
        filter: "date",
        onFilterChange: mock(() => undefined),
        preset: "today",
        onPresetSelect: mock(() => undefined),
        specificDate: today,
        onSpecificDateChange: mock(() => undefined),
        customFromDate: null,
        customToDate: null,
        onCustomRangeChange: mock(() => undefined),
        onConfirm: mock(() => undefined),
    },
    mobileFilters: {
        open: false,
        onOpenChange: mock(() => undefined),
        draftStoreId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        onDraftStoreChange: mock(() => undefined),
        draftPaymentMethodSelection: new Set(),
        onDraftPaymentToggle: mock(() => undefined),
        onDraftPaymentClear: mock(() => undefined),
        draftSortBy: "newest",
        onDraftSortChange: mock(() => undefined),
        draftFilterCount: 0,
        onClearDraftFilters: mock(() => undefined),
        onApply: mock(() => undefined),
    },
    list: {
        summary: {
            completedCount: 4,
            salesTotal: 800,
            collectedTotal: 500,
            dueTotal: 300,
        },
        sales: [],
        onOpenSale: mock(() => undefined),
    },
    ...overrides,
});

describe("BillingBillsPanel", () => {
    test("renders the sales summary and empty bills state", () => {
        render(<BillingBillsPanel {...panelProps()} />);

        expect(screen.getByText("Sales")).toBeTruthy();
        expect(screen.getByText("4")).toBeTruthy();
        expect(screen.getByText(formatCurrency(800))).toBeTruthy();
        expect(screen.getByText("No bills found")).toBeTruthy();
    });

    test("opens completed bill details from the extracted list", () => {
        const onOpenSale = mock(() => undefined);
        render(
            <BillingBillsPanel
                {...panelProps({
                    list: {
                        summary: null,
                        sales: [sale()],
                        onOpenSale,
                    },
                })}
            />,
        );

        expect(screen.getByText("Asha")).toBeTruthy();
        expect(screen.getByText("Bill 42")).toBeTruthy();
        fireEvent.click(screen.getByRole("button", { name: "Open Details" }));
        expect(onOpenSale).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111");
    });

    test("resumes a draft only when the workspace can mutate bills", () => {
        const onResumeDraft = mock(() => undefined);
        const onOpenSale = mock(() => undefined);
        const draft = sale({
            id: "22222222-2222-4222-8222-222222222222",
            saleNumber: null,
            status: "draft",
            paymentStatus: "unpaid",
            grandTotal: 80,
            paidTotal: 0,
            dueTotal: 80,
        });

        const { rerender } = render(
            <BillingBillsPanel
                {...panelProps({
                    list: {
                        summary: null,
                        sales: [draft],
                        canMutate: true,
                        onResumeDraft,
                        onOpenSale,
                    },
                })}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: "Resume" }));
        expect(onResumeDraft).toHaveBeenCalledWith("22222222-2222-4222-8222-222222222222");
        expect(onOpenSale).not.toHaveBeenCalled();

        rerender(
            <BillingBillsPanel
                {...panelProps({
                    list: {
                        summary: null,
                        sales: [draft],
                        canMutate: false,
                        onResumeDraft,
                        onOpenSale,
                    },
                })}
            />,
        );
        fireEvent.click(screen.getByRole("button", { name: "Open Details" }));
        expect(onOpenSale).toHaveBeenCalledWith("22222222-2222-4222-8222-222222222222");
    });
});
