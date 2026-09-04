import "../test-setup";
import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import type {
    CommercialModuleListItemDTO,
    CommercialModuleListResponse,
    CommercialPlanDetailDTO,
    CommercialPlanDetailResponse,
    CommercialPlanListItemDTO,
    CommercialPlanListResponse,
    CommercialPlanRevisionDTO,
    CreateCommercialPlanJSON,
    OwnerUserDTO,
    ServiceResponse,
} from "@repo/types";

import CommercialCatalogPage from "./commercial-catalog-page";
import CommercialCatalogPlansPage from "./commercial-catalog-plans-page";
import ConsoleEntry from "./console-entry";

afterEach(() => {
    cleanup();
    window.history.replaceState(null, "", "/");
});

const asha: OwnerUserDTO = {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    firstName: "Asha",
    lastName: "Shah",
    phone: "+919876543210",
    isActive: true,
    createdAt: "2026-09-04T00:00:00.000Z",
    updatedAt: "2026-09-04T00:00:00.000Z",
};

const ashaActor = { id: asha.id, firstName: asha.firstName, lastName: asha.lastName };

const billingFeature = {
    featureId: "11111111-1111-4111-8111-111111111111",
    featureRevisionId: "22222222-2222-4222-8222-222222222222",
    key: "billing",
    displayName: "Billing",
    revisionNumber: 1,
    status: "active" as const,
};

const coreModuleListItem: CommercialModuleListItemDTO = {
    id: "aaaa1111-1111-4111-8111-111111111111",
    key: "core_operations",
    currentRevisionId: "bbbb2222-2222-4222-8222-222222222222",
    revisionNumber: 1,
    status: "active",
    displayName: "Core Operations",
    description: "Billing workflow bundle",
    isSeparatelyPurchasable: false,
    priceInr: null,
    term: null,
};

const financeModuleListItem: CommercialModuleListItemDTO = {
    id: "cccc3333-3333-4333-8333-333333333333",
    key: "finance",
    currentRevisionId: "dddd4444-4444-4444-8444-444444444444",
    revisionNumber: 1,
    status: "active",
    displayName: "Finance",
    description: "Vendors and purchases",
    isSeparatelyPurchasable: false,
    priceInr: null,
    term: null,
};

const trialRevision = (overrides: Partial<CommercialPlanRevisionDTO> = {}): CommercialPlanRevisionDTO => ({
    id: "eeee5555-5555-4555-8555-555555555555",
    planId: "ffff6666-6666-4666-8666-666666666666",
    key: "trial",
    revisionNumber: 1,
    status: "draft",
    displayName: "Trial",
    description: "Seven-day exploration",
    planType: "trial",
    priceInr: 0,
    term: { count: 7, unit: "day" },
    modules: [{
        moduleId: coreModuleListItem.id,
        moduleRevisionId: coreModuleListItem.currentRevisionId,
        key: coreModuleListItem.key,
        displayName: coreModuleListItem.displayName,
        revisionNumber: coreModuleListItem.revisionNumber,
        status: coreModuleListItem.status,
        features: [billingFeature],
    }],
    resolvedFeatures: [billingFeature],
    createdBy: ashaActor,
    createdAt: "2026-09-04T00:00:00.000Z",
    publishedBy: null,
    publishedAt: null,
    retiredBy: null,
    retiredAt: null,
    discardedBy: null,
    discardedAt: null,
    ...overrides,
});

const trialPlan = (revision: CommercialPlanRevisionDTO = trialRevision(), extra: CommercialPlanRevisionDTO[] = []): CommercialPlanDetailDTO => ({
    id: revision.planId,
    key: revision.key,
    currentRevision: extra[0] ?? revision,
    revisions: extra.length > 0 ? extra : [revision],
});

const trialListItem = (overrides: Partial<CommercialPlanListItemDTO> = {}): CommercialPlanListItemDTO => ({
    id: "ffff6666-6666-4666-8666-666666666666",
    key: "trial",
    currentRevisionId: "eeee5555-5555-4555-8555-555555555555",
    revisionNumber: 1,
    status: "draft",
    displayName: "Trial",
    description: "Seven-day exploration",
    planType: "trial",
    priceInr: 0,
    term: { count: 7, unit: "day" },
    ...overrides,
});

const coreListItem: CommercialPlanListItemDTO = {
    id: "11112222-3333-4444-8555-666677778888",
    key: "core",
    currentRevisionId: "99990000-1111-4222-8333-444455556666",
    revisionNumber: 1,
    status: "active",
    displayName: "Core",
    description: "Billing-focused Store offering",
    planType: "paid",
    priceInr: 2999,
    term: { count: 1, unit: "year" },
};

const successPlanList = (plans: CommercialPlanListItemDTO[]): ServiceResponse<CommercialPlanListResponse> => ({
    status: "success",
    data: { plans },
    message: "Plans retrieved successfully",
    code: 200,
});

const successPlanDetail = (planDetail: CommercialPlanDetailDTO, code = 200): ServiceResponse<CommercialPlanDetailResponse> => ({
    status: "success",
    data: { plan: planDetail },
    message: "Plan retrieved successfully",
    code,
});

const successModuleList = (modules: CommercialModuleListItemDTO[]): ServiceResponse<CommercialModuleListResponse> => ({
    status: "success",
    data: { modules },
    message: "Modules retrieved successfully",
    code: 200,
});

const renderPage = (props: Partial<Parameters<typeof CommercialCatalogPlansPage>[0]> = {}) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return render(
        <QueryClientProvider client={client}>
            <CommercialCatalogPlansPage
                listCommercialPlans={props.listCommercialPlans ?? (async () => successPlanList([trialListItem(), coreListItem]))}
                getCommercialPlan={props.getCommercialPlan ?? (async () => successPlanDetail(trialPlan()))}
                createCommercialPlan={props.createCommercialPlan ?? (async () => successPlanDetail(trialPlan(), 201))}
                updateCommercialPlanDraft={props.updateCommercialPlanDraft ?? (async () => successPlanDetail(trialPlan()))}
                publishCommercialPlanRevision={props.publishCommercialPlanRevision ?? (async () => successPlanDetail(trialPlan(trialRevision({ status: "active", publishedBy: ashaActor, publishedAt: "2026-09-04T01:00:00.000Z" }))))}
                retireCommercialPlanRevision={props.retireCommercialPlanRevision ?? (async () => successPlanDetail(trialPlan(trialRevision({ status: "retired", publishedBy: ashaActor, publishedAt: "2026-09-04T01:00:00.000Z", retiredBy: ashaActor, retiredAt: "2026-09-04T02:00:00.000Z" }))))}
                discardCommercialPlanRevision={props.discardCommercialPlanRevision ?? (async () => successPlanDetail(trialPlan(trialRevision({ status: "discarded", discardedBy: ashaActor, discardedAt: "2026-09-04T01:00:00.000Z" }))))}
                createCommercialPlanSuccessor={props.createCommercialPlanSuccessor ?? (async () => successPlanDetail(trialPlan(trialRevision({ id: "12121212-1212-4121-8121-121212121212", revisionNumber: 2, status: "draft" }))))}
                listCommercialModules={props.listCommercialModules ?? (async () => successModuleList([coreModuleListItem, financeModuleListItem]))}
                initialSearch={props.initialSearch}
                initialStatus={props.initialStatus}
                initialCreateValues={props.initialCreateValues}
                onUnauthorized={props.onUnauthorized}
            />
        </QueryClientProvider>,
    );
};

describe("Commercial Catalog Plans console destination", () => {
    test("opens Plans from the Commercial Catalog area", async () => {
        const view = render(
            <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
                <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
                    <ConsoleEntry
                        ownerUser={asha}
                        onLogout={async () => {}}
                        commercialCatalogPageProps={{
                            listCommercialFeatures: async () => ({
                                status: "success",
                                data: { features: [] },
                                message: "Features retrieved successfully",
                                code: 200,
                            }),
                            listCommercialModules: async () => successModuleList([coreModuleListItem]),
                            listCommercialPlans: async () => successPlanList([trialListItem()]),
                        }}
                    />
                </ThemeProvider>
            </QueryClientProvider>,
        );

        fireEvent.click(view.getAllByRole("button", { name: "Commercial Catalog" })[0]!);
        fireEvent.click(view.getByRole("button", { name: "Plans" }));
        expect(await view.findByRole("heading", { name: "Plans" })).toBeTruthy();
        expect((await view.findAllByText("Trial")).length).toBeGreaterThan(0);
        expect(view.queryByText("Create Organization")).toBeNull();
    });

    test("lists Plans with display name, key, status, revision, type, and INR pricing", async () => {
        const view = renderPage();

        expect(await view.findByText("Core")).toBeTruthy();
        expect(view.getByText("trial")).toBeTruthy();
        expect(view.getByText("Draft")).toBeTruthy();
        expect(view.getByText("Active")).toBeTruthy();
        expect(view.getAllByText("Trial").length).toBeGreaterThan(0);
        expect(view.getByText(/₹0/)).toBeTruthy();
        expect(view.getByText(/7 days/)).toBeTruthy();
        expect(view.getByText(/₹2,999/)).toBeTruthy();
        expect(view.getByText(/1 year/)).toBeTruthy();
    });

    test("searches Plans by name or key", async () => {
        const requested: Array<{ search?: string }> = [];
        const view = renderPage({
            initialSearch: "trial",
            listCommercialPlans: async (query) => {
                requested.push(query);
                if (query.search === "trial") return successPlanList([trialListItem()]);
                return successPlanList([trialListItem(), coreListItem]);
            },
        });

        expect((await view.findAllByText("Trial")).length).toBeGreaterThan(0);
        await waitFor(() => expect(requested.some((query) => query.search === "trial")).toBe(true));
        await waitFor(() => expect(view.queryByText("Core")).toBeNull());
        expect(view.getByLabelText("Search Plans by name or key")).toHaveProperty("value", "trial");
    });

    test("creates a Trial Plan by selecting Module revisions and never offers Feature membership", async () => {
        let created: CreateCommercialPlanJSON | null = null;
        const view = renderPage({
            createCommercialPlan: async (data) => {
                created = data;
                return successPlanDetail(trialPlan(), 201);
            },
            initialCreateValues: {
                key: "trial",
                displayName: "Trial",
                description: "Seven-day exploration",
                planType: "trial",
                priceInr: 0,
                term: { count: 7, unit: "day" },
                moduleRevisionIds: [coreModuleListItem.currentRevisionId],
            },
        });

        await view.findByRole("heading", { name: "Plans" });
        fireEvent.click(view.getByRole("button", { name: "Add Plan" }));
        expect(await view.findByLabelText("Include Module Core Operations")).toBeTruthy();
        expect(view.queryByLabelText(/Include Feature/)).toBeNull();
        expect(view.getByText(/cannot include Features directly/)).toBeTruthy();
        fireEvent.click(view.getByLabelText("Include Module Finance"));
        fireEvent.click(view.getByRole("button", { name: "Create Draft Plan" }));

        await waitFor(() => expect(created).toEqual({
            key: "trial",
            displayName: "Trial",
            description: "Seven-day exploration",
            planType: "trial",
            priceInr: 0,
            term: { count: 7, unit: "day" },
            moduleRevisionIds: [coreModuleListItem.currentRevisionId, financeModuleListItem.currentRevisionId],
        }));
        expect(await view.findByRole("heading", { name: "Trial" })).toBeTruthy();
        expect(view.getByText("Included Modules")).toBeTruthy();
        expect(view.getByText("Resolved Features")).toBeTruthy();
        expect(view.getAllByText(/Billing/).length).toBeGreaterThan(0);
    });

    test("requires at least one Module revision before creating a Plan", async () => {
        let created = false;
        const view = renderPage({
            createCommercialPlan: async () => {
                created = true;
                return successPlanDetail(trialPlan(), 201);
            },
            initialCreateValues: {
                key: "core",
                displayName: "Core",
                description: "",
                planType: "paid",
                priceInr: 2999,
                term: { count: 1, unit: "year" },
                moduleRevisionIds: [],
            },
        });

        fireEvent.click(await view.findByRole("button", { name: "Add Plan" }));
        fireEvent.click(view.getByRole("button", { name: "Create Draft Plan" }));
        expect(await view.findByText("A Plan must include at least one Module revision")).toBeTruthy();
        expect(created).toBe(false);
    });

    test("rejects invalid paid prices in the Plan form", async () => {
        let created = false;
        const view = renderPage({
            createCommercialPlan: async () => {
                created = true;
                return successPlanDetail(trialPlan(), 201);
            },
            initialCreateValues: {
                key: "core",
                displayName: "Core",
                description: "",
                planType: "paid",
                priceInr: -10 as unknown as number,
                term: { count: 1, unit: "year" },
                moduleRevisionIds: [coreModuleListItem.currentRevisionId],
            },
        });

        fireEvent.click(await view.findByRole("button", { name: "Add Plan" }));
        fireEvent.click(view.getByRole("button", { name: "Create Draft Plan" }));
        expect(await view.findByText("Price must be 0 or more")).toBeTruthy();
        expect(created).toBe(false);
    });

    test("publishes, retires, discards, and creates a successor revision from Plan detail", async () => {
        window.history.replaceState(null, "", "/catalog/plans/ffff6666-6666-4666-8666-666666666666");
        let published = false;
        const draft = trialRevision();
        let planDetail = trialPlan(draft);
        const view = renderPage({
            getCommercialPlan: async () => successPlanDetail(planDetail),
            publishCommercialPlanRevision: async (planId, revisionId) => {
                published = planId === draft.planId && revisionId === draft.id;
                planDetail = trialPlan(trialRevision({
                    status: "active",
                    publishedBy: ashaActor,
                    publishedAt: "2026-09-04T01:00:00.000Z",
                }));
                return successPlanDetail(planDetail);
            },
            createCommercialPlanSuccessor: async () => {
                planDetail = trialPlan(trialRevision({
                    id: "12121212-1212-4121-8121-121212121212",
                    revisionNumber: 2,
                    status: "draft",
                }));
                return successPlanDetail(planDetail, 201);
            },
        });

        expect(await view.findByRole("heading", { name: "Trial" })).toBeTruthy();
        fireEvent.click(view.getByRole("button", { name: "Publish" }));
        fireEvent.click(view.getByRole("button", { name: "Publish revision" }));
        await waitFor(() => expect(published).toBe(true));
        expect((await view.findAllByText("Active")).length).toBeGreaterThan(0);
        expect(view.queryByRole("button", { name: "Save draft" })).toBeNull();
        expect(view.getByRole("button", { name: "Retire" })).toBeTruthy();
        expect(view.getByRole("button", { name: "Create successor revision" })).toBeTruthy();
        fireEvent.click(view.getByRole("button", { name: "Create successor revision" }));
        fireEvent.click(view.getByRole("button", { name: "Confirm successor revision" }));
        expect(await view.findByRole("button", { name: "Publish" })).toBeTruthy();
    });

    test("shows revision history, included Modules, and resolved Features", async () => {
        window.history.replaceState(null, "", "/catalog/plans/ffff6666-6666-4666-8666-666666666666");
        const first = trialRevision({
            status: "retired",
            publishedBy: ashaActor,
            publishedAt: "2026-09-04T01:00:00.000Z",
            retiredBy: ashaActor,
            retiredAt: "2026-09-04T02:00:00.000Z",
        });
        const second = trialRevision({
            id: "12121212-1212-4121-8121-121212121212",
            revisionNumber: 2,
            status: "active",
            description: "v2",
            publishedBy: ashaActor,
            publishedAt: "2026-09-04T03:00:00.000Z",
        });
        const view = renderPage({
            getCommercialPlan: async () => successPlanDetail({
                id: first.planId,
                key: "trial",
                currentRevision: second,
                revisions: [second, first],
            }),
        });

        expect(await view.findByText("Revision history")).toBeTruthy();
        expect(view.getByRole("heading", { name: "Revision 2" })).toBeTruthy();
        expect(view.getByRole("heading", { name: "Revision 1" })).toBeTruthy();
        expect(view.getAllByText(/Created by Asha Shah/).length).toBeGreaterThan(0);
        expect(view.getByText(/Retired by Asha Shah/)).toBeTruthy();
        expect(view.getByText("Included Modules")).toBeTruthy();
        expect(view.getByText("Resolved Features")).toBeTruthy();
        expect(view.getAllByText(/Core Operations/).length).toBeGreaterThan(0);
        expect(view.getAllByText(/Billing/).length).toBeGreaterThan(0);
    });

    test("discards an unused Draft after confirmation", async () => {
        window.history.replaceState(null, "", "/catalog/plans/ffff6666-6666-4666-8666-666666666666");
        let discardedFor: string | null = null;
        const view = renderPage({
            discardCommercialPlanRevision: async (_planId, revisionId) => {
                discardedFor = revisionId;
                return successPlanDetail(trialPlan(trialRevision({
                    status: "discarded",
                    discardedBy: ashaActor,
                    discardedAt: "2026-09-04T01:00:00.000Z",
                })));
            },
        });

        fireEvent.click(await view.findByRole("button", { name: "Discard draft" }));
        expect(view.getByRole("alertdialog")).toBeTruthy();
        expect(discardedFor).toBeNull();
        fireEvent.click(view.getByRole("button", { name: "Confirm discard" }));
        await waitFor(() => expect(discardedFor).toBe("eeee5555-5555-4555-8555-555555555555"));
    });

    test("returns the operator to sign-in when the Console session is unauthorized", async () => {
        let unauthorized = false;
        renderPage({
            listCommercialPlans: async () => ({
                status: "error",
                data: null,
                message: "Owner session is no longer active",
                code: 401,
            }),
            onUnauthorized: async () => { unauthorized = true; },
        });

        await waitFor(() => expect(unauthorized).toBe(true));
    });

    test("Commercial Catalog page keeps Features, Modules, and Plans as separate views", async () => {
        window.history.replaceState(null, "", "/catalog");
        const view = render(
            <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
                <CommercialCatalogPage
                    listCommercialFeatures={async () => ({
                        status: "success",
                        data: { features: [{
                            id: billingFeature.featureId,
                            key: billingFeature.key,
                            currentRevisionId: billingFeature.featureRevisionId,
                            revisionNumber: billingFeature.revisionNumber,
                            status: billingFeature.status,
                            displayName: billingFeature.displayName,
                            description: "POS billing",
                        }] },
                        message: "Features retrieved successfully",
                        code: 200,
                    })}
                    listCommercialModules={async () => successModuleList([coreModuleListItem])}
                    listCommercialPlans={async () => successPlanList([trialListItem(), coreListItem])}
                />
            </QueryClientProvider>,
        );

        expect(await view.findByRole("heading", { name: "Features" })).toBeTruthy();
        fireEvent.click(view.getByRole("button", { name: "Plans" }));
        expect(await view.findByRole("heading", { name: "Plans" })).toBeTruthy();
        expect((await view.findAllByText("Trial")).length).toBeGreaterThan(0);
        expect(view.queryByText("Create Sale")).toBeNull();
    });
});
