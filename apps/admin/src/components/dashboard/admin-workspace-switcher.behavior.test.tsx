import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, createMemoryRouter, RouterProvider } from "react-router-dom";

import { AdminWorkspaceSwitcher, AdminWorkspaceSwitcherPanel } from "@/components/dashboard/admin-workspace-switcher";
import { getOrganizationWorkspacePath } from "@/lib/default-org-path";
import { getStoreDetailPath } from "@/lib/store-routes";
import { getStoreWorkspacePath } from "@/lib/store-workspace-routes";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const adajanId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const vesuId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

const stores = [
    { id: adajanId, name: "Adajan" },
    { id: vesuId, name: "Vesu" },
];

const renderSwitcher = (selectedStoreId: string | null) =>
    renderToStaticMarkup(
        <MemoryRouter>
            <AdminWorkspaceSwitcherPanel
                organizationId={organizationId}
                organizationName="Panini House"
                stores={stores}
                selectedStoreId={selectedStoreId}
            />
        </MemoryRouter>,
    );

describe("Admin workspace switcher", () => {
    test("lets an administrator enter any Store workspace from the Organization workspace", () => {
        const markup = renderSwitcher(null);

        expect(markup).toContain("Organization workspace");
        expect(markup).toContain("Panini House");
        expect(markup).toContain(`href="${getStoreWorkspacePath(organizationId, adajanId)}"`);
        expect(markup).toContain(`href="${getStoreWorkspacePath(organizationId, vesuId)}"`);
        expect(markup).toContain("Adajan");
        expect(markup).toContain("Vesu");
        expect(markup).toContain("Add store");
        expect(markup).not.toContain(`href="${getStoreDetailPath(organizationId, adajanId)}"`);
        expect(markup).not.toContain("Ahmedabad");
    });

    test("identifies the selected Store and provides a way back to the Organization workspace", () => {
        const markup = renderSwitcher(adajanId);

        expect(markup).toContain("Store workspace");
        expect(markup).toContain("Adajan");
        expect(markup).toContain(`href="${getOrganizationWorkspacePath(organizationId)}"`);
        expect(markup).toContain("Organization workspace");
        expect(markup).toContain(`href="${getStoreWorkspacePath(organizationId, vesuId)}"`);
        expect(markup).toContain("Add store");
        expect(markup).not.toContain(`href="${getStoreDetailPath(organizationId, adajanId)}"`);
    });

    test("keeps Add store available when the Organization has no Stores yet", () => {
        const markup = renderToStaticMarkup(
            <MemoryRouter>
                <AdminWorkspaceSwitcherPanel
                    organizationId={organizationId}
                    organizationName="Panini House"
                    stores={[]}
                    selectedStoreId={null}
                />
            </MemoryRouter>,
        );

        expect(markup).toContain("Store workspaces");
        expect(markup).toContain("Add store");
        expect(markup).toContain("Organization workspace");
    });

    test("places the Store workspace control in the sidebar footer", () => {
        const queryClient = new QueryClient();
        const router = createMemoryRouter(
            [
                {
                    path: "/",
                    element: (
                        <AdminWorkspaceSwitcher
                            organizationId={organizationId}
                            organizationName="Panini House"
                            stores={stores}
                            selectedStoreId={adajanId}
                            variant="sidebar"
                        />
                    ),
                },
            ],
            { initialEntries: ["/"] },
        );
        const markup = renderToStaticMarkup(
            <QueryClientProvider client={queryClient}>
                <RouterProvider router={router} />
            </QueryClientProvider>,
        );

        expect(markup).toContain('aria-label="Adajan store workspace"');
        expect(markup).toContain("Store workspace");
        expect(markup).toContain("Adajan");
    });

    test("pins the switcher to the sidebar footer instead of the desktop header", () => {
        const sidebarSource = readFileSync(join(import.meta.dir, "app-sidebar.tsx"), "utf8");
        const switcherSource = readFileSync(join(import.meta.dir, "admin-workspace-switcher.tsx"), "utf8");
        const layoutSource = readFileSync(join(import.meta.dir, "dashboard-layout.tsx"), "utf8");

        expect(sidebarSource).toContain('variant="sidebar"');
        expect(sidebarSource).toContain("AdminWorkspaceSwitcherFromRoute");
        expect(switcherSource).toContain("CreateStoreDialog");
        expect(layoutSource).toContain("<div className=\"lg:hidden\">");
        expect(layoutSource).toContain("AdminWorkspaceSwitcherFromRoute");
    });
});
