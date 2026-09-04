import "../test-setup";
import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import type {
    CommercialFeatureDetailDTO,
    CommercialFeatureDetailResponse,
    CommercialFeatureListItemDTO,
    CommercialFeatureListResponse,
    CommercialFeatureRevisionDTO,
    CreateCommercialFeatureJSON,
    OwnerUserDTO,
    ServiceResponse,
} from "@repo/types";

import CommercialCatalogFeaturesPage from "./commercial-catalog-features-page";
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

const billingRevision = (overrides: Partial<CommercialFeatureRevisionDTO> = {}): CommercialFeatureRevisionDTO => ({
    id: "22222222-2222-4222-8222-222222222222",
    featureId: "11111111-1111-4111-8111-111111111111",
    key: "billing",
    revisionNumber: 1,
    status: "draft",
    displayName: "Billing",
    description: "POS billing workflow",
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

const billingFeature = (revision: CommercialFeatureRevisionDTO = billingRevision(), extra: CommercialFeatureRevisionDTO[] = []): CommercialFeatureDetailDTO => ({
    id: revision.featureId,
    key: revision.key,
    currentRevision: extra[0] ?? revision,
    revisions: extra.length > 0 ? extra : [revision],
    referencingModules: [],
    affectedPlans: [],
});

const billingListItem = (overrides: Partial<CommercialFeatureListItemDTO> = {}): CommercialFeatureListItemDTO => ({
    id: "11111111-1111-4111-8111-111111111111",
    key: "billing",
    currentRevisionId: "22222222-2222-4222-8222-222222222222",
    revisionNumber: 1,
    status: "draft",
    displayName: "Billing",
    description: "POS billing workflow",
    ...overrides,
});

const unitsListItem: CommercialFeatureListItemDTO = {
    id: "33333333-3333-4333-8333-333333333333",
    key: "units",
    currentRevisionId: "44444444-4444-4444-8444-444444444444",
    revisionNumber: 1,
    status: "active",
    displayName: "Units",
    description: "Organization units",
};

const successList = (features: CommercialFeatureListItemDTO[]): ServiceResponse<CommercialFeatureListResponse> => ({
    status: "success",
    data: { features },
    message: "Features retrieved successfully",
    code: 200,
});

const successDetail = (feature: CommercialFeatureDetailDTO, code = 200): ServiceResponse<CommercialFeatureDetailResponse> => ({
    status: "success",
    data: { feature },
    message: "Feature retrieved successfully",
    code,
});

const filterFeaturesByQuery = (
    items: CommercialFeatureListItemDTO[],
    query: { status?: string; search?: string },
) => {
    let filtered = items;
    if (query.status === "discarded") filtered = filtered.filter((item) => item.status === "discarded");
    else if (query.status === "all") filtered = filtered.filter((item) => item.status !== "discarded");
    else if (query.status) filtered = filtered.filter((item) => item.status === query.status);
    if (query.search?.trim()) {
        const term = query.search.trim().toLowerCase();
        filtered = filtered.filter((item) =>
            item.displayName.toLowerCase().includes(term) || item.key.toLowerCase().includes(term));
    }
    return filtered;
};

const renderPage = (props: Partial<Parameters<typeof CommercialCatalogFeaturesPage>[0]> = {}) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const defaultFeatures = [billingListItem(), unitsListItem];
    return render(
        <QueryClientProvider client={client}>
            <CommercialCatalogFeaturesPage
                listCommercialFeatures={props.listCommercialFeatures ?? (async (query) => successList(filterFeaturesByQuery(defaultFeatures, query)))}
                getCommercialFeature={props.getCommercialFeature ?? (async () => successDetail(billingFeature()))}
                createCommercialFeature={props.createCommercialFeature ?? (async () => successDetail(billingFeature(), 201))}
                updateCommercialFeatureDraft={props.updateCommercialFeatureDraft ?? (async () => successDetail(billingFeature()))}
                publishCommercialFeatureRevision={props.publishCommercialFeatureRevision ?? (async () => successDetail(billingFeature(billingRevision({ status: "active", publishedBy: ashaActor, publishedAt: "2026-09-04T01:00:00.000Z" }))))}
                retireCommercialFeatureRevision={props.retireCommercialFeatureRevision ?? (async () => successDetail(billingFeature(billingRevision({ status: "retired", publishedBy: ashaActor, publishedAt: "2026-09-04T01:00:00.000Z", retiredBy: ashaActor, retiredAt: "2026-09-04T02:00:00.000Z" }))))}
                discardCommercialFeatureRevision={props.discardCommercialFeatureRevision ?? (async () => successDetail(billingFeature(billingRevision({ status: "discarded", discardedBy: ashaActor, discardedAt: "2026-09-04T01:00:00.000Z" }))))}
                createCommercialFeatureSuccessor={props.createCommercialFeatureSuccessor ?? (async () => successDetail(billingFeature(billingRevision({ id: "55555555-5555-4555-8555-555555555555", revisionNumber: 2, status: "draft" }))))}
                initialSearch={props.initialSearch}
                initialStatus={props.initialStatus}
                initialStatuses={props.initialStatuses}
                initialCreateValues={props.initialCreateValues}
                onUnauthorized={props.onUnauthorized}
            />
        </QueryClientProvider>,
    );
};

describe("Commercial Catalog Features console destination", () => {
    test("opens the Commercial Catalog Features view from the console home", async () => {
        const view = render(
            <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
                <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
                    <ConsoleEntry
                        ownerUser={asha}
                        onLogout={async () => {}}
                        commercialCatalogPageProps={{
                            listCommercialFeatures: async (query) => successList(
                                filterFeaturesByQuery([billingListItem({ status: "active" })], query),
                            ),
                        }}
                    />
                </ThemeProvider>
            </QueryClientProvider>,
        );

        fireEvent.click(view.getAllByRole("button", { name: "Plans" })[0]!);
        fireEvent.click(await view.findByRole("button", { name: "Features" }));
        expect(await view.findByRole("button", { name: "Add Feature" })).toBeTruthy();
        expect(await view.findByText("Billing")).toBeTruthy();
        expect(view.queryByText("Create Organization")).toBeNull();
        expect(view.queryByText("Create Sale")).toBeNull();
        expect(view.queryByText(/never sold directly/)).toBeNull();
    });

    test("lists Features with display name, immutable key, status, and revision", async () => {
        const view = renderPage({ initialStatuses: ["draft", "active"] });

        expect(await view.findByText("Billing")).toBeTruthy();
        expect(view.getByText("Units")).toBeTruthy();
        expect(view.getByText("billing")).toBeTruthy();
        expect(view.getByText("units")).toBeTruthy();
        expect(view.getAllByText("Draft").length).toBeGreaterThan(0);
        expect(view.getAllByText("Active").length).toBeGreaterThan(0);
        expect(view.getAllByText("1").length).toBeGreaterThan(0);
    });

    test("searches Features by name or key", async () => {
        const requested: Array<{ search?: string }> = [];
        const view = renderPage({
            initialSearch: "bill",
            initialStatuses: ["draft", "active"],
            listCommercialFeatures: async (query) => {
                requested.push(query);
                if (query.search === "bill") return successList([billingListItem()]);
                return successList([billingListItem(), unitsListItem]);
            },
        });

        expect(await view.findByText("Billing")).toBeTruthy();
        await waitFor(() => expect(requested.some((query) => query.search === "bill")).toBe(true));
        await waitFor(() => expect(view.queryByText("Units")).toBeNull());
        expect(view.getByLabelText("Search Features by name or key")).toHaveProperty("value", "bill");
    });

    test("creates a Draft Feature with key, display name, and description", async () => {
        let created: CreateCommercialFeatureJSON | null = null;
        const view = renderPage({
            createCommercialFeature: async (data) => {
                created = data;
                return successDetail(billingFeature(), 201);
            },
            getCommercialFeature: async () => successDetail(billingFeature()),
            initialCreateValues: {
                key: "billing",
                displayName: "Billing",
                description: "POS billing workflow",
            },
        });

        await view.findByText("Units");
        fireEvent.click(view.getByRole("button", { name: "Add Feature" }));
        fireEvent.click(view.getByRole("button", { name: "Create Draft Feature" }));

        await waitFor(() => expect(created).toEqual({
            key: "billing",
            displayName: "Billing",
            description: "POS billing workflow",
        }));
        expect(await view.findByRole("heading", { name: "Billing" })).toBeTruthy();
        expect(view.getByText("billing")).toBeTruthy();
        expect(view.getByRole("button", { name: "Publish" })).toBeTruthy();
    });

    test("publishes, retires, discards, and creates a successor revision from Feature detail", async () => {
        window.history.replaceState(null, "", "/plans/features/11111111-1111-4111-8111-111111111111");
        let published = false;
        const draft = billingRevision();
        let feature = billingFeature(draft);
        const view = renderPage({
            getCommercialFeature: async () => successDetail(feature),
            publishCommercialFeatureRevision: async (featureId, revisionId) => {
                published = featureId === draft.featureId && revisionId === draft.id;
                feature = billingFeature(billingRevision({
                    status: "active",
                    publishedBy: ashaActor,
                    publishedAt: "2026-09-04T01:00:00.000Z",
                }));
                return successDetail(feature);
            },
            createCommercialFeatureSuccessor: async () => {
                feature = billingFeature(billingRevision({
                    id: "55555555-5555-4555-8555-555555555555",
                    revisionNumber: 2,
                    status: "draft",
                }));
                return successDetail(feature, 201);
            },
        });

        expect(await view.findByRole("heading", { name: "Billing" })).toBeTruthy();
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

    test("shows revision history and audit metadata", async () => {
        window.history.replaceState(null, "", "/plans/features/11111111-1111-4111-8111-111111111111");
        const first = billingRevision({
            status: "retired",
            publishedBy: ashaActor,
            publishedAt: "2026-09-04T01:00:00.000Z",
            retiredBy: ashaActor,
            retiredAt: "2026-09-04T02:00:00.000Z",
        });
        const second = billingRevision({
            id: "55555555-5555-4555-8555-555555555555",
            revisionNumber: 2,
            status: "active",
            description: "v2",
            publishedBy: ashaActor,
            publishedAt: "2026-09-04T03:00:00.000Z",
        });
        const view = renderPage({
            getCommercialFeature: async () => successDetail({
                id: first.featureId,
                key: "billing",
                currentRevision: second,
                revisions: [second, first],
                referencingModules: [],
                affectedPlans: [],
            }),
        });

        expect(await view.findByRole("button", { name: /revision history/i })).toBeTruthy();
        fireEvent.click(view.getByRole("button", { name: /revision history/i }));
        expect(await view.findByRole("heading", { name: "Revision history" })).toBeTruthy();
        expect(view.getByRole("heading", { name: "Revision 2" })).toBeTruthy();
        expect(view.getByRole("heading", { name: "Revision 1" })).toBeTruthy();
        expect(view.getAllByText(/Created by Asha Shah/).length).toBeGreaterThan(0);
        expect(view.getAllByText(/Published by Asha Shah/).length).toBeGreaterThan(0);
        expect(view.getByText(/Retired by Asha Shah/)).toBeTruthy();
    });

    test("discards an unused Draft after confirmation", async () => {
        window.history.replaceState(null, "", "/plans/features/11111111-1111-4111-8111-111111111111");
        let discardedFor: string | null = null;
        const view = renderPage({
            discardCommercialFeatureRevision: async (_featureId, revisionId) => {
                discardedFor = revisionId;
                return successDetail(billingFeature(billingRevision({
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
        await waitFor(() => expect(discardedFor).toBe("22222222-2222-4222-8222-222222222222"));
    });

    test("returns the operator to sign-in when the Console session is unauthorized", async () => {
        let unauthorized = false;
        renderPage({
            listCommercialFeatures: async () => ({
                status: "error",
                data: null,
                message: "Owner session is no longer active",
                code: 401,
            }),
            onUnauthorized: async () => { unauthorized = true; },
        });

        await waitFor(() => expect(unauthorized).toBe(true));
    });

    test("reviews referencing Modules and indirectly affected Plans", async () => {
        window.history.replaceState(null, "", "/plans/features/11111111-1111-4111-8111-111111111111");
        const view = renderPage({
            getCommercialFeature: async () => successDetail({
                ...billingFeature(billingRevision({ status: "active", publishedBy: ashaActor, publishedAt: "2026-09-04T01:00:00.000Z" })),
                referencingModules: [{
                    id: "aaaa1111-1111-4111-8111-111111111111",
                    key: "core_operations",
                    revisionId: "bbbb2222-2222-4222-8222-222222222222",
                    revisionNumber: 1,
                    status: "active",
                    displayName: "Core Operations",
                }],
                affectedPlans: [{
                    id: "ffff6666-6666-4666-8666-666666666666",
                    key: "trial",
                    revisionId: "eeee5555-5555-4555-8555-555555555555",
                    revisionNumber: 1,
                    status: "active",
                    displayName: "Trial",
                }],
            }),
        });

        expect(await view.findByText("Referencing Modules")).toBeTruthy();
        expect(view.getByText(/Core Operations/)).toBeTruthy();
        expect(view.getByText("Affected Plans")).toBeTruthy();
        expect(view.getByText(/Trial/)).toBeTruthy();
        expect(view.queryByText(/KOT System can be offered on its own/)).toBeNull();
    });

    test("explains that Table Management is offered with KOT System in the initial catalog", async () => {
        window.history.replaceState(null, "", "/plans/features/33333333-3333-4333-8333-333333333333");
        const tableRevision = billingRevision({
            id: "44444444-4444-4444-8444-444444444444",
            featureId: "33333333-3333-4333-8333-333333333333",
            key: "table_management",
            displayName: "Table Management",
            status: "active",
            publishedBy: ashaActor,
            publishedAt: "2026-09-04T01:00:00.000Z",
        });
        const view = renderPage({
            getCommercialFeature: async () => successDetail({
                id: tableRevision.featureId,
                key: "table_management",
                currentRevision: tableRevision,
                revisions: [tableRevision],
                referencingModules: [{
                    id: "cccc3333-3333-4333-8333-333333333333",
                    key: "restaurant_operations",
                    revisionId: "dddd4444-4444-4444-8444-444444444444",
                    revisionNumber: 1,
                    status: "active",
                    displayName: "Restaurant Operations",
                }],
                affectedPlans: [{
                    id: "ffff6666-6666-4666-8666-666666666666",
                    key: "pro",
                    revisionId: "eeee5555-5555-4555-8555-555555555555",
                    revisionNumber: 1,
                    status: "active",
                    displayName: "Pro",
                }],
            }),
        });

        expect(await view.findByRole("heading", { name: "Table Management" })).toBeTruthy();
        expect(view.queryByText(/KOT System can be offered on its own/)).toBeNull();
        expect(view.getAllByText(/Restaurant Operations/).length).toBeGreaterThan(0);
        expect(view.getByText("Affected Plans")).toBeTruthy();
        expect(view.getByText(/Pro/)).toBeTruthy();
    });
});
