import { describe, expect, test } from "bun:test";

import { isOrganizationInScope, shouldRedirectUnknownOrganization } from "./organization-scope";

const portronics = { id: "org-portronics" };
const zebronics = { id: "org-zebronics" };
const organizations = [portronics, zebronics];

describe("organization scope", () => {
    test("recognizes organizations available to the signed-in user", () => {
        expect(isOrganizationInScope(portronics.id, organizations)).toBe(true);
        expect(isOrganizationInScope("org-missing", organizations)).toBe(false);
    });

    test("redirects unknown organization routes back to the picker", () => {
        expect(
            shouldRedirectUnknownOrganization({
                organizationId: "org-missing",
                isOrganizationsPending: false,
                organizations,
                isPickerPage: false,
            }),
        ).toBe(true);
    });

    test("waits for organizations to load before redirecting", () => {
        expect(
            shouldRedirectUnknownOrganization({
                organizationId: "org-missing",
                isOrganizationsPending: true,
                organizations,
                isPickerPage: false,
            }),
        ).toBe(false);
    });

    test("does not redirect valid organization routes or the picker", () => {
        expect(
            shouldRedirectUnknownOrganization({
                organizationId: portronics.id,
                isOrganizationsPending: false,
                organizations,
                isPickerPage: false,
            }),
        ).toBe(false);

        expect(
            shouldRedirectUnknownOrganization({
                organizationId: undefined,
                isOrganizationsPending: false,
                organizations,
                isPickerPage: true,
            }),
        ).toBe(false);
    });
});
