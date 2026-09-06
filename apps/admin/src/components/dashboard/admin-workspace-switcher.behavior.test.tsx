import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { AdminWorkspaceSwitcherPanel } from "@/components/dashboard/admin-workspace-switcher";
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
        expect(markup).not.toContain(`href="${getStoreDetailPath(organizationId, adajanId)}"`);
    });
});
