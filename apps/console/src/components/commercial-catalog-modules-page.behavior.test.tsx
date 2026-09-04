import "../test-setup";
import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import type {
    CommercialFeatureListItemDTO,
    CommercialFeatureListResponse,
    CommercialModuleDetailDTO,
    CommercialModuleDetailResponse,
    CommercialModuleListItemDTO,
    CommercialModuleListResponse,
    CommercialModuleRevisionDTO,
    CreateCommercialModuleJSON,
    OwnerUserDTO,
    ServiceResponse,
} from "@repo/types";

import CommercialCatalogModulesPage from "./commercial-catalog-modules-page";
import CommercialCatalogPage from "./commercial-catalog-page";
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

const billingFeature: CommercialFeatureListItemDTO = {
    id: "11111111-1111-4111-8111-111111111111",
    key: "billing",
    currentRevisionId: "22222222-2222-4222-8222-222222222222",
    revisionNumber: 1,
    status: "active",
    displayName: "Billing",
    description: "POS billing workflow",
};

const kotFeature: CommercialFeatureListItemDTO = {
    id: "33333333-3333-4333-8333-333333333333",
    key: "kot_system",
    currentRevisionId: "44444444-4444-4444-8444-444444444444",
    revisionNumber: 1,
    status: "active",
    displayName: "KOT System",
    description: "Kitchen tickets",
};

const coreRevision = (overrides: Partial<CommercialModuleRevisionDTO> = {}): CommercialModuleRevisionDTO => ({
    id: "bbbb2222-2222-4222-8222-222222222222",
    moduleId: "aaaa1111-1111-4111-8111-111111111111",
    key: "core_operations",
    revisionNumber: 1,
    status: "draft",
    displayName: "Core Operations",
    description: "Billing workflow bundle",
    isSeparatelyPurchasable: false,
    priceInr: null,
    term: null,
    features: [{
        featureId: billingFeature.id,
        featureRevisionId: billingFeature.currentRevisionId,
        key: billingFeature.key,
        displayName: billingFeature.displayName,
        revisionNumber: billingFeature.revisionNumber,
        status: billingFeature.status,
    }],
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

const coreModule = (revision: CommercialModuleRevisionDTO = coreRevision(), extra: CommercialModuleRevisionDTO[] = []): CommercialModuleDetailDTO => ({
    id: revision.moduleId,
    key: revision.key,
    currentRevision: extra[0] ?? revision,
    revisions: extra.length > 0 ? extra : [revision],
    referencingPlans: [],
});

const coreListItem = (overrides: Partial<CommercialModuleListItemDTO> = {}): CommercialModuleListItemDTO => ({
    id: "aaaa1111-1111-4111-8111-111111111111",
    key: "core_operations",
    currentRevisionId: "bbbb2222-2222-4222-8222-222222222222",
    revisionNumber: 1,
    status: "draft",
    displayName: "Core Operations",
    description: "Billing workflow bundle",
    isSeparatelyPurchasable: false,
    priceInr: null,
    term: null,
    ...overrides,
});

const integrationsListItem: CommercialModuleListItemDTO = {
    id: "cccc3333-3333-4333-8333-333333333333",
    key: "integrations",
    currentRevisionId: "dddd4444-4444-4444-8444-444444444444",
    revisionNumber: 1,
    status: "active",
    displayName: "Integrations",
    description: "WhatsApp and Google Contacts",
    isSeparatelyPurchasable: true,
    priceInr: 2999,
    term: { count: 1, unit: "year" },
};

const successModuleList = (modules: CommercialModuleListItemDTO[]): ServiceResponse<CommercialModuleListResponse> => ({
    status: "success",
    data: { modules },
    message: "Modules retrieved successfully",
    code: 200,
});

const successModuleDetail = (moduleDetail: CommercialModuleDetailDTO, code = 200): ServiceResponse<CommercialModuleDetailResponse> => ({
    status: "success",
    data: { module: moduleDetail },
    message: "Module retrieved successfully",
    code,
});

const successFeatureList = (features: CommercialFeatureListItemDTO[]): ServiceResponse<CommercialFeatureListResponse> => ({
    status: "success",
    data: { features },
    message: "Features retrieved successfully",
    code: 200,
});

const renderPage = (props: Partial<Parameters<typeof CommercialCatalogModulesPage>[0]> = {}) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return render(
        <QueryClientProvider client={client}>
            <CommercialCatalogModulesPage
                listCommercialModules={props.listCommercialModules ?? (async () => successModuleList([coreListItem(), integrationsListItem]))}
                getCommercialModule={props.getCommercialModule ?? (async () => successModuleDetail(coreModule()))}
                createCommercialModule={props.createCommercialModule ?? (async () => successModuleDetail(coreModule(), 201))}
                updateCommercialModuleDraft={props.updateCommercialModuleDraft ?? (async () => successModuleDetail(coreModule()))}
                publishCommercialModuleRevision={props.publishCommercialModuleRevision ?? (async () => successModuleDetail(coreModule(coreRevision({ status: "active", publishedBy: ashaActor, publishedAt: "2026-09-04T01:00:00.000Z" }))))}
                retireCommercialModuleRevision={props.retireCommercialModuleRevision ?? (async () => successModuleDetail(coreModule(coreRevision({ status: "retired", publishedBy: ashaActor, publishedAt: "2026-09-04T01:00:00.000Z", retiredBy: ashaActor, retiredAt: "2026-09-04T02:00:00.000Z" }))))}
                discardCommercialModuleRevision={props.discardCommercialModuleRevision ?? (async () => successModuleDetail(coreModule(coreRevision({ status: "discarded", discardedBy: ashaActor, discardedAt: "2026-09-04T01:00:00.000Z" }))))}
                createCommercialModuleSuccessor={props.createCommercialModuleSuccessor ?? (async () => successModuleDetail(coreModule(coreRevision({ id: "eeee5555-5555-4555-8555-555555555555", revisionNumber: 2, status: "draft" }))))}
                listCommercialFeatures={props.listCommercialFeatures ?? (async () => successFeatureList([billingFeature, kotFeature]))}
                initialSearch={props.initialSearch}
                initialStatus={props.initialStatus}
                initialCreateValues={props.initialCreateValues}
                onUnauthorized={props.onUnauthorized}
            />
        </QueryClientProvider>,
    );
};

describe("Commercial Catalog Modules console destination", () => {
    test("opens Modules and Plans from the Commercial Catalog area", async () => {
        const view = render(
            <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
                <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
                    <ConsoleEntry
                        ownerUser={asha}
                        onLogout={async () => {}}
                        commercialCatalogPageProps={{
                            listCommercialFeatures: async () => successFeatureList([billingFeature]),
                            listCommercialModules: async () => successModuleList([coreListItem()]),
                            listCommercialPlans: async () => ({
                                status: "success",
                                data: { plans: [] },
                                message: "Plans retrieved successfully",
                                code: 200,
                            }),
                        }}
                    />
                </ThemeProvider>
            </QueryClientProvider>,
        );

        fireEvent.click(view.getAllByRole("button", { name: "Commercial Catalog" })[0]!);
        expect(await view.findByRole("heading", { name: "Features" })).toBeTruthy();
        fireEvent.click(view.getByRole("button", { name: "Modules" }));
        expect(await view.findByRole("heading", { name: "Modules" })).toBeTruthy();
        expect(await view.findByText("Core Operations")).toBeTruthy();
        expect(view.queryByText(/does not check Feature dependencies/)).toBeNull();
        fireEvent.click(view.getByRole("button", { name: "Plans" }));
        expect(await view.findByRole("heading", { name: "Plans" })).toBeTruthy();
        expect(view.queryByText(/not available yet/)).toBeNull();
        expect(view.queryByText("Create Organization")).toBeNull();
    });

    test("lists Modules with display name, key, status, revision, and INR add-on pricing", async () => {
        const view = renderPage();

        expect(await view.findByText("Core Operations")).toBeTruthy();
        expect(view.getByText("Integrations")).toBeTruthy();
        expect(view.getByText("core_operations")).toBeTruthy();
        expect(view.getByText("Draft")).toBeTruthy();
        expect(view.getByText("Active")).toBeTruthy();
        expect(view.getByText("Not separately purchasable")).toBeTruthy();
        expect(view.getByText(/₹2,999/)).toBeTruthy();
        expect(view.getByText(/1 year/)).toBeTruthy();
    });

    test("searches Modules by name or key", async () => {
        const requested: Array<{ search?: string }> = [];
        const view = renderPage({
            initialSearch: "core",
            listCommercialModules: async (query) => {
                requested.push(query);
                if (query.search === "core") return successModuleList([coreListItem()]);
                return successModuleList([coreListItem(), integrationsListItem]);
            },
        });

        expect(await view.findByText("Core Operations")).toBeTruthy();
        await waitFor(() => expect(requested.some((query) => query.search === "core")).toBe(true));
        await waitFor(() => expect(view.queryByText("Integrations")).toBeNull());
        expect(view.getByLabelText("Search Modules by name or key")).toHaveProperty("value", "core");
    });

    test("creates a Draft Module by selecting Feature revisions and optional add-on terms", async () => {
        let created: CreateCommercialModuleJSON | null = null;
        const view = renderPage({
            createCommercialModule: async (data) => {
                created = data;
                return successModuleDetail(coreModule(), 201);
            },
            initialCreateValues: {
                key: "core_operations",
                displayName: "Core Operations",
                description: "Billing workflow bundle",
                featureRevisionIds: [billingFeature.currentRevisionId],
                isSeparatelyPurchasable: true,
                priceInr: 2999,
                term: { count: 1, unit: "year" },
            },
        });

        await view.findByText("Core Operations");
        fireEvent.click(view.getByRole("button", { name: "Add Module" }));
        expect(await view.findByLabelText("Include Feature Billing")).toBeTruthy();
        fireEvent.click(view.getByLabelText("Include Feature KOT System"));
        fireEvent.click(view.getByRole("button", { name: "Create Draft Module" }));

        await waitFor(() => expect(created).toEqual({
            key: "core_operations",
            displayName: "Core Operations",
            description: "Billing workflow bundle",
            featureRevisionIds: [billingFeature.currentRevisionId, kotFeature.currentRevisionId],
            isSeparatelyPurchasable: true,
            priceInr: 2999,
            term: { count: 1, unit: "year" },
        }));
        expect(await view.findByRole("heading", { name: "Core Operations" })).toBeTruthy();
        expect(view.getByText("Included Features")).toBeTruthy();
        expect(view.getByText("No Plans currently include this Module.")).toBeTruthy();
    });

    test("requires at least one Feature revision before creating a Module", async () => {
        let created = false;
        const view = renderPage({
            createCommercialModule: async () => {
                created = true;
                return successModuleDetail(coreModule(), 201);
            },
            initialCreateValues: {
                key: "core_operations",
                displayName: "Core Operations",
                description: "",
                featureRevisionIds: [],
                isSeparatelyPurchasable: false,
            },
        });

        fireEvent.click(await view.findByRole("button", { name: "Add Module" }));
        fireEvent.click(view.getByRole("button", { name: "Create Draft Module" }));
        expect(await view.findByText("A Module must include at least one Feature revision")).toBeTruthy();
        expect(created).toBe(false);
    });

    test("publishes, retires, discards, and creates a successor revision from Module detail", async () => {
        window.history.replaceState(null, "", "/catalog/modules/aaaa1111-1111-4111-8111-111111111111");
        let published = false;
        const draft = coreRevision();
        let moduleDetail = coreModule(draft);
        const view = renderPage({
            getCommercialModule: async () => successModuleDetail(moduleDetail),
            publishCommercialModuleRevision: async (moduleId, revisionId) => {
                published = moduleId === draft.moduleId && revisionId === draft.id;
                moduleDetail = coreModule(coreRevision({
                    status: "active",
                    publishedBy: ashaActor,
                    publishedAt: "2026-09-04T01:00:00.000Z",
                }));
                return successModuleDetail(moduleDetail);
            },
            createCommercialModuleSuccessor: async () => {
                moduleDetail = coreModule(coreRevision({
                    id: "eeee5555-5555-4555-8555-555555555555",
                    revisionNumber: 2,
                    status: "draft",
                }));
                return successModuleDetail(moduleDetail, 201);
            },
        });

        expect(await view.findByRole("heading", { name: "Core Operations" })).toBeTruthy();
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

    test("shows revision history, included Features, and empty referencing Plans", async () => {
        window.history.replaceState(null, "", "/catalog/modules/aaaa1111-1111-4111-8111-111111111111");
        const first = coreRevision({
            status: "retired",
            publishedBy: ashaActor,
            publishedAt: "2026-09-04T01:00:00.000Z",
            retiredBy: ashaActor,
            retiredAt: "2026-09-04T02:00:00.000Z",
        });
        const second = coreRevision({
            id: "eeee5555-5555-4555-8555-555555555555",
            revisionNumber: 2,
            status: "active",
            description: "v2",
            publishedBy: ashaActor,
            publishedAt: "2026-09-04T03:00:00.000Z",
        });
        const view = renderPage({
            getCommercialModule: async () => successModuleDetail({
                id: first.moduleId,
                key: "core_operations",
                currentRevision: second,
                revisions: [second, first],
                referencingPlans: [],
            }),
        });

        expect(await view.findByText("Revision history")).toBeTruthy();
        expect(view.getByRole("heading", { name: "Revision 2" })).toBeTruthy();
        expect(view.getByRole("heading", { name: "Revision 1" })).toBeTruthy();
        expect(view.getAllByText(/Created by Asha Shah/).length).toBeGreaterThan(0);
        expect(view.getByText(/Retired by Asha Shah/)).toBeTruthy();
        expect(view.getByText("Included Features")).toBeTruthy();
        expect(view.getByText("No Plans currently include this Module.")).toBeTruthy();
    });

    test("discards an unused Draft after confirmation", async () => {
        window.history.replaceState(null, "", "/catalog/modules/aaaa1111-1111-4111-8111-111111111111");
        let discardedFor: string | null = null;
        const view = renderPage({
            discardCommercialModuleRevision: async (_moduleId, revisionId) => {
                discardedFor = revisionId;
                return successModuleDetail(coreModule(coreRevision({
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
        await waitFor(() => expect(discardedFor).toBe("bbbb2222-2222-4222-8222-222222222222"));
    });

    test("returns the operator to sign-in when the Console session is unauthorized", async () => {
        let unauthorized = false;
        renderPage({
            listCommercialModules: async () => ({
                status: "error",
                data: null,
                message: "Owner session is no longer active",
                code: 401,
            }),
            onUnauthorized: async () => { unauthorized = true; },
        });

        await waitFor(() => expect(unauthorized).toBe(true));
    });

    test("Commercial Catalog page keeps Features and Modules as separate views", async () => {
        window.history.replaceState(null, "", "/catalog");
        const view = render(
            <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
                <CommercialCatalogPage
                    listCommercialFeatures={async () => successFeatureList([billingFeature])}
                    listCommercialModules={async () => successModuleList([coreListItem(), integrationsListItem])}
                />
            </QueryClientProvider>,
        );

        expect(await view.findByRole("heading", { name: "Features" })).toBeTruthy();
        expect(await view.findByText("Billing")).toBeTruthy();
        fireEvent.click(view.getByRole("button", { name: "Modules" }));
        expect(await view.findByRole("heading", { name: "Modules" })).toBeTruthy();
        expect(await view.findByText("Core Operations")).toBeTruthy();
        expect(view.queryByText("Create Sale")).toBeNull();
    });
});
