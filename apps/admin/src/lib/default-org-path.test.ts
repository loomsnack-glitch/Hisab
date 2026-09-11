import { afterEach, describe, expect, test } from "bun:test";
import { Window } from "happy-dom";

const testWindow = new Window({ url: "http://localhost" });
Object.assign(globalThis, {
    window: testWindow,
    localStorage: testWindow.localStorage,
});

const {
    clearStarredOrgId,
    getAppearanceRedirectPath,
    getAuthenticatedHomePath,
    getOrganizationAppearancePath,
    getSidebarHomePath,
    isOrganizationPickerPath,
    persistStarredOrgId,
    readStarredOrgId,
    resolveDefaultOrgId,
} = await import("./default-org-path");

const panini = { id: "org-panini" };
const adajan = { id: "org-adajan" };

describe("default organization path", () => {
    afterEach(() => {
        testWindow.localStorage.clear();
    });

    test("opens the starred organization and otherwise stays on the picker", () => {
        expect(resolveDefaultOrgId([panini, adajan])).toBeNull();
        expect(getAuthenticatedHomePath([panini, adajan])).toBe("/organizations");

        persistStarredOrgId(adajan.id);

        expect(readStarredOrgId()).toBe(adajan.id);
        expect(resolveDefaultOrgId([panini, adajan])).toBe(adajan.id);
        expect(getAuthenticatedHomePath([panini, adajan])).toBe(
            "/organizations/org-adajan/products",
        );
    });

    test("ignores a starred organization that is no longer in the list", () => {
        persistStarredOrgId("org-missing");

        expect(resolveDefaultOrgId([panini])).toBeNull();
        expect(getAuthenticatedHomePath([panini])).toBe("/organizations");
    });

    test("sidebar home prefers the current organization over the picker", () => {
        expect(getSidebarHomePath([panini, adajan])).toBe("/organizations");
        expect(getSidebarHomePath([panini, adajan], panini.id)).toBe(
            "/organizations/org-panini/products",
        );
    });

    test("sidebar home stays in the current store workspace", () => {
        const organizationId = "d7f01334-b691-48e2-8bed-c531fb484dc5";
        const storeId = "a9350bec-7b83-4181-8c9f-1b23958abc23";
        const storePath = `/organizations/${organizationId}/workspaces/${storeId}/devices`;

        expect(getSidebarHomePath([panini], organizationId, storePath)).toBe(
            `/organizations/${organizationId}/workspaces/${storeId}/products`,
        );
    });

    test("treats only the organizations list route as the picker", () => {
        expect(isOrganizationPickerPath("/organizations")).toBe(true);
        expect(isOrganizationPickerPath("/organizations/org-panini/products")).toBe(false);
        expect(isOrganizationPickerPath("/appearance")).toBe(false);
        expect(isOrganizationPickerPath("/organizations/org-panini/appearance")).toBe(false);
    });

    test("builds organization-scoped appearance paths and redirects legacy routes", () => {
        expect(getOrganizationAppearancePath(panini.id)).toBe("/organizations/org-panini/appearance");

        testWindow.localStorage.setItem("hisab_recent_org_id", panini.id);
        expect(getAppearanceRedirectPath([panini, adajan])).toBe("/organizations/org-panini/appearance");

        testWindow.localStorage.clear();
        persistStarredOrgId(adajan.id);
        expect(getAppearanceRedirectPath([panini, adajan])).toBe("/organizations/org-adajan/appearance");

        clearStarredOrgId();
        expect(getAppearanceRedirectPath([panini, adajan])).toBe("/organizations");
    });

    test("clears the starred organization preference on logout", () => {
        persistStarredOrgId(adajan.id);

        clearStarredOrgId();

        expect(readStarredOrgId()).toBe("");
        expect(resolveDefaultOrgId([panini, adajan])).toBeNull();
    });
});
