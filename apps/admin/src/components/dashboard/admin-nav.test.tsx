import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import AdminMobileBottomNav from "@/components/dashboard/admin-mobile-bottom-nav";
import {
    getVisibleAdminPrimaryMobileDestinations,
    getVisibleAdminWorkspaceDestinations,
    isAdminMoreDestinationActive,
} from "@/components/dashboard/admin-nav-items";

const organizationId = "org-1";
const withOrg = { organizationId, hasOrganization: true };
const withoutOrg = { organizationId: "", hasOrganization: false };

describe("Admin mobile navigation", () => {
    test("pins Stores, Product, and Billing as the primary tabs when an organization is selected", () => {
        const primaryIds = getVisibleAdminPrimaryMobileDestinations(withOrg).map((destination) => destination.id);

        expect(primaryIds).toEqual(["stores", "products", "billing"]);
    });

    test("falls back to Organizations when no organization is available", () => {
        const primary = getVisibleAdminPrimaryMobileDestinations(withoutOrg);
        const workspaceIds = getVisibleAdminWorkspaceDestinations(withoutOrg).map((destination) => destination.id);

        expect(primary.map((destination) => destination.id)).toEqual(["organizations"]);
        expect(workspaceIds).toEqual(["organizations", "appearance"]);
    });

    test("marks More as active on secondary pages, not on primary tabs", () => {
        expect(isAdminMoreDestinationActive(`/organizations/${organizationId}/stores`, withOrg)).toBe(false);
        expect(isAdminMoreDestinationActive(`/organizations/${organizationId}/billing`, withOrg)).toBe(false);
        expect(isAdminMoreDestinationActive(`/organizations/${organizationId}/reports`, withOrg)).toBe(true);
        expect(isAdminMoreDestinationActive("/appearance", withOrg)).toBe(true);
        expect(isAdminMoreDestinationActive("/organizations", withOrg)).toBe(true);
    });

    test("renders the primary tabs and organization avatar on the More tab", () => {
        const markup = renderToStaticMarkup(
            <MemoryRouter initialEntries={[`/organizations/${organizationId}/stores`]}>
                <AdminMobileBottomNav
                    organizationId={organizationId}
                    hasOrganization
                    activeOrgName="Panini House"
                />
            </MemoryRouter>,
        );

        expect(markup).toContain('aria-label="Admin mobile navigation"');
        expect(markup).toContain(`href="/organizations/${organizationId}/stores"`);
        expect(markup).toContain(`href="/organizations/${organizationId}/products"`);
        expect(markup).toContain(`href="/organizations/${organizationId}/billing"`);
        expect(markup).toContain("Stores");
        expect(markup).toContain("Product");
        expect(markup).toContain("Billing");
        expect(markup).toContain("PH");
        expect(markup).not.toMatch(/<span[^>]*>More<\/span>/);
    });

    test("omits organization-scoped links when no organization is selected", () => {
        const markup = renderToStaticMarkup(
            <MemoryRouter initialEntries={["/organizations"]}>
                <AdminMobileBottomNav hasOrganization={false} />
            </MemoryRouter>,
        );

        expect(markup).toContain('href="/organizations"');
        expect(markup).not.toContain("/stores");
        expect(markup).not.toContain("/billing");
        expect(markup).not.toContain("/products");
    });
});
