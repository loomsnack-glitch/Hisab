import { afterEach, describe, expect, test } from "bun:test";
import { Window } from "happy-dom";
import type {
    PaidPlanCheckoutResponse,
    ServiceResponse,
    StoreCommercialStatusResponse,
} from "@repo/types";

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

const { cleanup, fireEvent, render, waitFor } = await import("@testing-library/react");
const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query");
const { MemoryRouter } = await import("react-router-dom");
const { commercialLicenseKeys } = await import("@/lib/query-keys");
const { default: StoreCommercialStatus } = await import("./store-commercial-status");

afterEach(cleanup);

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const storeId = "11111111-1111-4111-8111-111111111111";
const startsAt = new Date("2026-09-04T15:00:00.000Z");
const endsAt = new Date("2027-09-04T15:00:00.000Z");

const availablePlansStatus: StoreCommercialStatusResponse = {
    commercialStatus: {
        storeId,
        organizationId,
        timezone: "Asia/Kolkata",
        baseAccess: null,
        scheduledSuccessor: null,
        accessGrants: [],
        activeAddOns: [],
        availablePaidPlans: [{
            key: "core",
            displayName: "Core",
            checkoutAction: "term_purchase",
            priceInr: 2999,
            amountInr: 2999,
            term: { count: 1, unit: "year" },
            licenseTiming: "immediate",
            intendedStartsAt: startsAt,
            intendedEndsAt: endsAt,
            isBestValue: false,
            isRecommended: true,
            displaySequence: 2,
            modules: [],
        }],
        availableCoTermAddOns: [],
        pendingCheckout: null,
        commercialHistory: [],
        trial: {
            eligible: true,
            message: "This Store can start the standard Trial Plan once.",
        },
        entitlements: { storeId, features: [] },
    },
};

const pendingQuote = {
    id: "00000000-0000-4000-8000-000000000201",
    kind: "paid_plan" as const,
    status: "open" as const,
    planKey: "core",
    planDisplayName: "Core",
    planType: "paid" as const,
    moduleKey: null,
    moduleDisplayName: null,
    priceInr: 2999,
    amountInr: 2999,
    amountPaise: 299900,
    currency: "INR" as const,
    term: { count: 1, unit: "year" as const },
    licenseTiming: "immediate" as const,
    intendedStartsAt: startsAt,
    intendedEndsAt: endsAt,
    expiresAt: new Date("2026-09-04T15:30:00.000Z"),
    razorpayOrderId: "order_core_001",
    lineItems: [{ description: "Core Plan", amountInr: 2999 }],
    fulfilledAt: null,
};

const checkoutResponse = (): ServiceResponse<PaidPlanCheckoutResponse> => ({
    status: "success",
    message: "Commercial Quote created successfully",
    code: 201,
    data: {
        quote: pendingQuote,
        checkout: {
            keyId: "rzp_test_key",
            orderId: "order_core_001",
            amountPaise: 299900,
            currency: "INR",
        },
        commercialStatus: {
            ...availablePlansStatus.commercialStatus,
            pendingCheckout: pendingQuote,
        },
    },
});

describe("Store License Plan checkout", () => {
    test("opens Razorpay as soon as a Plan is chosen", async () => {
        const opened: Array<{ orderId: string; description: string }> = [];
        const queryClient = new QueryClient({
            defaultOptions: {
                queries: { retry: false, staleTime: Infinity },
                mutations: { retry: false },
            },
        });
        queryClient.setQueryData(commercialLicenseKeys.status(organizationId, storeId), {
            status: "success",
            data: availablePlansStatus,
            message: "Store commercial status fetched successfully",
            code: 200,
        });

        const view = render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <StoreCommercialStatus
                        organizationId={organizationId}
                        storeId={storeId}
                        variant="workspace"
                        createPaidPlanCheckout={async (_organizationId, _storeId, input) => {
                            expect(input.planKey).toBe("core");
                            return checkoutResponse();
                        }}
                        openRazorpayCheckout={async (request) => {
                            opened.push({ orderId: request.orderId, description: request.description });
                            return { outcome: "dismissed" };
                        }}
                    />
                </MemoryRouter>
            </QueryClientProvider>,
        );

        fireEvent.click(await view.findByRole("button", { name: "Choose Core" }));

        await waitFor(() => expect(opened).toEqual([
            { orderId: "order_core_001", description: "Core Plan" },
        ]));
    });
});
