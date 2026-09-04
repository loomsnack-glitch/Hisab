import "../test-setup";
import { afterEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type {
    ConsoleStoreCommercialInspectionResponse,
    CreateCommercialRefundAndRevocationJSON,
    CreateStoreAccessGrantJSON,
    ServiceResponse,
} from "@repo/types";

import ConsoleStoreCommercialAccess from "./console-store-commercial-access";

afterEach(() => {
    cleanup();
});

const setDatetimeLocalValue = (input: HTMLInputElement, value: string) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
    setter?.call(input, value);
};

const organizationId = "33333333-3333-4333-8333-333333333333";
const storeId = "77777777-7777-4777-8777-777777777777";
const startsAt = new Date("2026-09-04T15:00:00.000Z");
const migrationEndsAt = new Date("2026-10-04T15:00:00.000Z");
const customEndsAt = new Date("2026-09-20T15:00:00.000Z");

const emptyInspection: ConsoleStoreCommercialInspectionResponse = {
    commercialStatus: {
        storeId,
        organizationId,
        timezone: "Asia/Kolkata",
        baseAccess: null,
        scheduledSuccessor: null,
        accessGrants: [],
        activeAddOns: [],
        availablePaidPlans: [],
        availableCoTermAddOns: [],
        pendingCheckout: null,
        commercialHistory: [],
        trial: {
            eligible: true,
            message: "This Store can start the standard Trial Plan once.",
        },
        entitlements: { storeId, features: [] },
    },
    grantableAccess: {
        plans: [
            { key: "trial", displayName: "Trial", planType: "trial", term: { count: 7, unit: "day" } },
            { key: "core", displayName: "Core", planType: "paid", term: { count: 1, unit: "year" } },
        ],
        modules: [
            { key: "core_operations", displayName: "Core Operations" },
            { key: "integrations", displayName: "Integrations" },
        ],
    },
    refundablePayments: [],
};

const migrationInspection: ConsoleStoreCommercialInspectionResponse = {
    commercialStatus: {
        ...emptyInspection.commercialStatus,
        accessGrants: [
            {
                id: "00000000-0000-4000-8000-000000000101",
                sourceKind: "store_access_grant",
                origin: "legacy_migration",
                termKind: "complimentary",
                selectionKind: "all_current_modules",
                label: "Legacy migration grant",
                selectionLabel: "All current Modules",
                planKey: null,
                planDisplayName: null,
                moduleKey: null,
                moduleDisplayName: null,
                term: { count: 30, unit: "day" },
                startsAt,
                endsAt: migrationEndsAt,
                status: "active",
                modules: [
                    {
                        key: "core_operations",
                        displayName: "Core Operations",
                        features: [{ key: "billing", displayName: "Billing" }],
                    },
                ],
            },
        ],
        entitlements: {
            storeId,
            features: [
                {
                    key: "billing",
                    displayName: "Billing",
                    sources: [
                        {
                            sourceKind: "store_access_grant",
                            sourceId: "00000000-0000-4000-8000-000000000101",
                            moduleKey: "core_operations",
                            moduleDisplayName: "Core Operations",
                            featureDisplayName: "Billing",
                            startsAt,
                            endsAt: migrationEndsAt,
                        },
                    ],
                },
            ],
        },
    },
    grantableAccess: emptyInspection.grantableAccess,
    refundablePayments: [],
};

const success = (
    data: ConsoleStoreCommercialInspectionResponse,
): ServiceResponse<ConsoleStoreCommercialInspectionResponse> => ({
    status: "success",
    message: "Store commercial status fetched successfully",
    data,
    code: 200,
});

const renderAccess = (options: {
    inspection?: ConsoleStoreCommercialInspectionResponse;
    create?: (
        organizationId: string,
        storeId: string,
        input: CreateStoreAccessGrantJSON,
    ) => Promise<ServiceResponse<ConsoleStoreCommercialInspectionResponse | null>>;
    refund?: (
        organizationId: string,
        storeId: string,
        input: CreateCommercialRefundAndRevocationJSON,
    ) => Promise<ServiceResponse<ConsoleStoreCommercialInspectionResponse | null>>;
} = {}) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={client}>
            <ConsoleStoreCommercialAccess
                organizationId={organizationId}
                storeId={storeId}
                getPlatformStoreCommercialStatus={async () => success(options.inspection ?? emptyInspection)}
                createStoreAccessGrant={options.create}
                refundAndRevokeLicense={options.refund}
            />
        </QueryClientProvider>,
    );
};

describe("Console Store commercial access", () => {
    test("inspects access sources and keeps the legacy migration grant distinct from Console grants", async () => {
        const view = renderAccess({ inspection: migrationInspection });

        expect(await view.findByText("Legacy migration grant")).toBeTruthy();
        expect(view.getByText(/All current Modules/)).toBeTruthy();
        expect(view.getAllByText("Billing").length).toBeGreaterThan(0);
        expect(view.getByText(/Asia\/Kolkata/)).toBeTruthy();
        expect(view.queryByText("Complimentary Store Access Grant")).toBeNull();
        expect(view.getByRole("button", { name: "Create Store Access Grant" })).toBeTruthy();
        expect(view.queryByText("Create Store")).toBeNull();
        expect(view.queryByText("device secret")).toBeNull();
        expect(view.queryByText("Razorpay")).toBeNull();
    });

    test("creates a custom-range Module grant from Console without mutating Organization business data", async () => {
        let created: CreateStoreAccessGrantJSON | null = null;
        const view = renderAccess({
            inspection: migrationInspection,
            create: async (_organizationId, _storeId, input) => {
                created = input;
                return {
                    status: "success",
                    message: "Store Access Grant created successfully",
                    code: 201,
                    data: {
                        ...migrationInspection,
                        commercialStatus: {
                            ...migrationInspection.commercialStatus,
                            accessGrants: [
                                ...migrationInspection.commercialStatus.accessGrants,
                                {
                                    id: "00000000-0000-4000-8000-000000000202",
                                    sourceKind: "store_access_grant",
                                    origin: "administrator",
                                    termKind: "custom_range",
                                    selectionKind: "module",
                                    label: "Custom-range Store Access Grant",
                                    selectionLabel: "Integrations",
                                    planKey: null,
                                    planDisplayName: null,
                                    moduleKey: "integrations",
                                    moduleDisplayName: "Integrations",
                                    term: { count: 16, unit: "day" },
                                    startsAt,
                                    endsAt: customEndsAt,
                                    status: "active",
                                    modules: [
                                        {
                                            key: "integrations",
                                            displayName: "Integrations",
                                            features: [{ key: "whatsapp", displayName: "WhatsApp" }],
                                        },
                                    ],
                                },
                            ],
                        },
                    },
                };
            },
        });

        expect(await view.findByLabelText("Grant type")).toBeTruthy();
        fireEvent.change(view.getByLabelText("Grant type"), { target: { value: "custom_range" } });
        expect(view.getByLabelText("Grant ends at")).toBeTruthy();
        fireEvent.change(view.getByLabelText("Catalog selection"), { target: { value: "module" } });
        fireEvent.change(view.getByLabelText("Module"), { target: { value: "integrations" } });
        setDatetimeLocalValue(view.getByLabelText("Grant ends at") as HTMLInputElement, "2026-09-20T20:30");
        await act(async () => {
            fireEvent.click(view.getByRole("button", { name: "Create Store Access Grant" }));
        });

        await waitFor(() => {
            expect(created).toEqual({
                termKind: "custom_range",
                selection: { kind: "module", moduleKey: "integrations" },
                endsAt: customEndsAt.toISOString(),
            });
        });
        expect(await view.findByText("Custom-range Store Access Grant")).toBeTruthy();
        expect(view.getByText("Legacy migration grant")).toBeTruthy();
        expect(view.getByText("WhatsApp")).toBeTruthy();
        expect(view.queryByText("Edit store")).toBeNull();
        expect(view.queryByText("Add device")).toBeNull();
    });

    test("records a refund and License Revocation without exposing Razorpay credentials", async () => {
        const refundablePayment = {
            paymentEventId: "00000000-0000-4000-8000-000000000501",
            quoteId: "00000000-0000-4000-8000-000000000401",
            razorpayPaymentId: "pay_core_refund",
            razorpayOrderId: "order_core_refund",
            amountInr: 2999,
            amountPaise: 299900,
            currency: "INR" as const,
            paidAt: startsAt,
            accessSourceKind: "store_license" as const,
            accessSourceId: "00000000-0000-4000-8000-000000000301",
            accessSourceLabel: "Core Store License",
            accessSourceStatus: "active" as const,
            accessSourceStartsAt: startsAt,
            accessSourceEndsAt: migrationEndsAt,
        };
        let submitted: CreateCommercialRefundAndRevocationJSON | null = null;
        const view = renderAccess({
            inspection: {
                ...migrationInspection,
                refundablePayments: [refundablePayment],
            },
            refund: async (_organizationId, _storeId, input) => {
                submitted = input;
                return {
                    status: "success",
                    message: "Commercial Refund and License Revocation recorded successfully",
                    code: 201,
                    data: {
                        ...migrationInspection,
                        refundablePayments: [],
                        commercialStatus: {
                            ...migrationInspection.commercialStatus,
                            commercialHistory: [
                                {
                                    kind: "refund",
                                    id: "00000000-0000-4000-8000-000000000601",
                                    occurredAt: startsAt,
                                    title: "Commercial Refund",
                                    detail: "₹2,999.00 · rfnd_test_001",
                                    amountInr: 2999,
                                    status: "refunded",
                                },
                                {
                                    kind: "revocation",
                                    id: "00000000-0000-4000-8000-000000000701",
                                    occurredAt: startsAt,
                                    title: "License Revocation · Core Store License",
                                    detail: "Access end recorded",
                                    amountInr: 2999,
                                    status: "revoked",
                                },
                            ],
                        },
                    },
                };
            },
        });

        expect(await view.findByLabelText("Paid commercial payment")).toBeTruthy();
        fireEvent.change(view.getByLabelText("Refund amount in paise"), { target: { value: "299900" } });
        setDatetimeLocalValue(view.getByLabelText("Access ends at") as HTMLInputElement, "2026-09-10T20:30");
        await act(async () => {
            fireEvent.click(view.getByRole("button", { name: "Refund and revoke access" }));
        });

        await waitFor(() => {
            expect(submitted).toEqual({
                paymentEventId: refundablePayment.paymentEventId,
                amountPaise: 299900,
                effectiveEndsAt: new Date("2026-09-10T15:00:00.000Z").toISOString(),
            });
        });
        expect(await view.findByText("Commercial Refund")).toBeTruthy();
        expect(await view.findByText("License Revocation · Core Store License")).toBeTruthy();
        expect(view.queryByText("rzp_")).toBeNull();
    });
});
