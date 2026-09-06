import { afterEach, describe, expect, test } from "bun:test";
import { Window } from "happy-dom";

const testWindow = new Window({ url: "http://localhost" });
Object.assign(globalThis, {
    window: testWindow,
    localStorage: testWindow.localStorage,
});

const {
    clearStarredOrgId,
    getAuthenticatedHomePath,
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
            "/organizations/org-adajan/stores",
        );
    });

    test("ignores a starred organization that is no longer in the list", () => {
        persistStarredOrgId("org-missing");

        expect(resolveDefaultOrgId([panini])).toBeNull();
        expect(getAuthenticatedHomePath([panini])).toBe("/organizations");
    });

    test("treats only the organizations list route as the picker", () => {
        expect(isOrganizationPickerPath("/organizations")).toBe(true);
        expect(isOrganizationPickerPath("/organizations/org-panini/stores")).toBe(false);
        expect(isOrganizationPickerPath("/appearance")).toBe(false);
    });

    test("clears the starred organization preference on logout", () => {
        persistStarredOrgId(adajan.id);

        clearStarredOrgId();

        expect(readStarredOrgId()).toBe("");
        expect(resolveDefaultOrgId([panini, adajan])).toBeNull();
    });
});
