import { describe, expect, test } from "bun:test";
import { resolveOrganizationLanding } from "./organization-routing";

describe("Admin organization landing", () => {
    test("routes an empty list to first-organization setup", () => {
        expect(resolveOrganizationLanding([])).toEqual({ mode: "setup" });
    });

    test("opens a singleton directly", () => {
        const organization = { id: "org-1", name: "Acme" };
        expect(resolveOrganizationLanding([organization])).toEqual({
            mode: "workspace",
            organization,
        });
    });

    test("uses a picker for multiple Organizations", () => {
        const organizations = [
            { id: "org-1", name: "Acme" },
            { id: "org-2", name: "Northwind" },
        ];
        expect(resolveOrganizationLanding(organizations)).toEqual({
            mode: "picker",
            organizations,
        });
    });
});
