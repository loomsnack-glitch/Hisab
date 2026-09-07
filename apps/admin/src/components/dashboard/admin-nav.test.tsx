import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import AdminMobileBottomNav from "@/components/dashboard/admin-mobile-bottom-nav";
import {
    getGroupedAdminMainDestinations,
    getVisibleAdminMainDestinations,
    getVisibleAdminPrimaryMobileDestinations,
    getVisibleAdminWorkspaceDestinations,
    isAdminMoreDestinationActive,
} from "@/components/dashboard/admin-nav-items";

const organizationId = "org-1";
const withOrg = { organizationId, hasOrganization: true };
const withoutOrg = { organizationId: "", hasOrganization: false };

describe("Admin mobile navigation", () => {
    test("orders main sidebar destinations grouped by Organization, Catalog, Sales, Reports, Finance, Integrations", () => {
        const mainIds = getVisibleAdminMainDestinations(withOrg).map((destination) => destination.id);

        expect(mainIds).toEqual([
            "stores",
            "products",
            "add-ons",
            "categories",
            "units",
            "billing",
            "tables",
            "customers",
            "reports",
            "money-accounts",
            "vendors",
            "purchases",
            "expenses",
            "whatsapp",
            "google-contacts",
        ]);
    });

    test("groups destinations into six named sections", () => {
        const sections = getGroupedAdminMainDestinations(withOrg);

        expect(sections.map((s) => s.group)).toEqual([
            "organization",
            "catalog",
            "sales",
            "reports",
            "finance",
            "integrations",
        ]);

        expect(sections.map((s) => s.label)).toEqual([
            "Organization",
            "Catalog",
            "Sales & Service",
            "Reports",
            "Finance",
            "Integrations",
        ]);
    });

    test("includes Units as an Organization-scoped workspace destination", () => {
        const workspaceIds = getVisibleAdminWorkspaceDestinations(withOrg).map((destination) => destination.id);
        const units = getVisibleAdminWorkspaceDestinations(withOrg).find((destination) => destination.id === "units");

        expect(workspaceIds).toContain("units");
        expect(units?.path).toBe(`/organizations/${organizationId}/units`);
        expect(units?.isActive(`/organizations/${organizationId}/units`)).toBe(true);
        expect(isAdminMoreDestinationActive(`/organizations/${organizationId}/units`, withOrg)).toBe(true);
    });

    test("does not include Expense Categories as a separate sidebar destination", () => {
        const workspaceIds = getVisibleAdminWorkspaceDestinations(withOrg).map((destination) => destination.id);

        expect(workspaceIds).not.toContain("expense-categories");
        expect(workspaceIds).toContain("expenses");
    });

    test("includes Vendors as an Organization-scoped workspace destination", () => {
        const workspaceIds = getVisibleAdminWorkspaceDestinations(withOrg).map((destination) => destination.id);
        const vendors = getVisibleAdminWorkspaceDestinations(withOrg).find((destination) => destination.id === "vendors");

        expect(workspaceIds).toContain("vendors");
        expect(vendors?.path).toBe(`/organizations/${organizationId}/vendors`);
        expect(vendors?.isActive(`/organizations/${organizationId}/vendors`)).toBe(true);
        expect(isAdminMoreDestinationActive(`/organizations/${organizationId}/vendors`, withOrg)).toBe(true);
    });

    test("includes Purchases as an Organization-scoped workspace destination", () => {
        const workspaceIds = getVisibleAdminWorkspaceDestinations(withOrg).map((destination) => destination.id);
        const purchases = getVisibleAdminWorkspaceDestinations(withOrg).find(
            (destination) => destination.id === "purchases",
        );

        expect(workspaceIds).toContain("purchases");
        expect(purchases?.path).toBe(`/organizations/${organizationId}/purchases`);
        expect(purchases?.isActive(`/organizations/${organizationId}/purchases`)).toBe(true);
        expect(isAdminMoreDestinationActive(`/organizations/${organizationId}/purchases`, withOrg)).toBe(true);
    });

    test("includes Expenses as an Organization-scoped workspace destination", () => {
        const workspaceIds = getVisibleAdminWorkspaceDestinations(withOrg).map((destination) => destination.id);
        const expenses = getVisibleAdminWorkspaceDestinations(withOrg).find(
            (destination) => destination.id === "expenses",
        );

        expect(workspaceIds).toContain("expenses");
        expect(expenses?.path).toBe(`/organizations/${organizationId}/expenses`);
        expect(expenses?.isActive(`/organizations/${organizationId}/expenses`)).toBe(true);
        expect(isAdminMoreDestinationActive(`/organizations/${organizationId}/expenses`, withOrg)).toBe(true);
    });

    test("includes Money Accounts as an Organization-scoped workspace destination", () => {
        const workspaceIds = getVisibleAdminWorkspaceDestinations(withOrg).map((destination) => destination.id);
        const moneyAccounts = getVisibleAdminWorkspaceDestinations(withOrg).find(
            (destination) => destination.id === "money-accounts",
        );

        expect(workspaceIds).toContain("money-accounts");
        expect(moneyAccounts?.path).toBe(`/organizations/${organizationId}/money-accounts`);
        expect(moneyAccounts?.isActive(`/organizations/${organizationId}/money-accounts`)).toBe(true);
        expect(isAdminMoreDestinationActive(`/organizations/${organizationId}/money-accounts`, withOrg)).toBe(true);
    });

    test("pins Stores, Product, and Billing as the primary tabs when an organization is selected", () => {
        const primaryIds = getVisibleAdminPrimaryMobileDestinations(withOrg).map((destination) => destination.id);

        expect(primaryIds).toEqual(["stores", "products", "billing"]);
    });

    test("shows only global destinations when no organization is available", () => {
        const primary = getVisibleAdminPrimaryMobileDestinations(withoutOrg);
        const workspaceIds = getVisibleAdminWorkspaceDestinations(withoutOrg).map((destination) => destination.id);

        expect(primary).toEqual([]);
        expect(workspaceIds).toEqual(["appearance"]);
    });

    test("marks More as active on secondary pages, not on primary tabs", () => {
        expect(isAdminMoreDestinationActive(`/organizations/${organizationId}/stores`, withOrg)).toBe(false);
        expect(isAdminMoreDestinationActive(`/organizations/${organizationId}/billing`, withOrg)).toBe(false);
        expect(isAdminMoreDestinationActive(`/organizations/${organizationId}/reports`, withOrg)).toBe(true);
        expect(isAdminMoreDestinationActive(`/organizations/${organizationId}/settings`, withOrg)).toBe(true);
        expect(isAdminMoreDestinationActive("/appearance", withOrg)).toBe(true);
    });

    test("keeps Organization destinations on Organization routes, including while a Store workspace URL exists", () => {
        const products = getVisibleAdminWorkspaceDestinations(withOrg).find((destination) => destination.id === "products");
        const billing = getVisibleAdminWorkspaceDestinations(withOrg).find((destination) => destination.id === "billing");
        const stores = getVisibleAdminWorkspaceDestinations(withOrg).find((destination) => destination.id === "stores");

        expect(products?.path).toBe(`/organizations/${organizationId}/products`);
        expect(billing?.path).toBe(`/organizations/${organizationId}/billing`);
        expect(stores?.path).toBe(`/organizations/${organizationId}/stores`);
        expect(stores?.isActive(`/organizations/${organizationId}/workspaces/${organizationId}`)).toBe(false);
        expect(products?.isActive(`/organizations/${organizationId}/workspaces/${organizationId}`)).toBe(false);
    });

    test("shows only Store-scoped destinations when a Store workspace is selected", () => {
        const storeId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
        const withStore = { ...withOrg, storeId };
        const products = getVisibleAdminWorkspaceDestinations(withStore).find(
            (destination) => destination.id === "products",
        );
        const storeDestinationIds = getVisibleAdminWorkspaceDestinations(withStore).map((destination) => destination.id);

        expect(products?.path).toBe(`/organizations/${organizationId}/workspaces/${storeId}/products`);
        expect(products?.isActive(`/organizations/${organizationId}/workspaces/${storeId}/products`)).toBe(true);
        expect(products?.isActive(`/organizations/${organizationId}/products`)).toBe(false);
        const vendors = getVisibleAdminWorkspaceDestinations(withStore).find(
            (destination) => destination.id === "vendors",
        );
        expect(vendors?.path).toBe(`/organizations/${organizationId}/workspaces/${storeId}/vendors`);
        expect(vendors?.isActive(`/organizations/${organizationId}/workspaces/${storeId}/vendors`)).toBe(true);
        expect(vendors?.isActive(`/organizations/${organizationId}/vendors`)).toBe(false);
        expect(storeDestinationIds).toEqual(["products", "add-ons", "categories", "vendors"]);
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

        expect(markup).toContain('aria-label="Organization and more pages"');
        expect(markup).not.toContain("/stores");
        expect(markup).not.toContain("/billing");
        expect(markup).not.toContain("/products");
    });
});
