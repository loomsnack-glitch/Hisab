import { afterEach, describe, expect, test } from "bun:test";
import { Window } from "happy-dom";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const testWindow = new Window({ url: "http://localhost" });
Object.assign(globalThis, {
    window: testWindow,
    localStorage: testWindow.localStorage,
});

const { persistStarredOrgId } = await import("@/lib/default-org-path");
const { resolveAuthenticatedHomeRedirect } = await import(
    "@/components/dashboard/authenticated-home-redirect"
);

const portronics = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" };
const zebronics = { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" };
const organizations = [portronics, zebronics];

describe("Authenticated home redirect", () => {
    afterEach(() => {
        testWindow.localStorage.clear();
    });

    test("opens the starred organization when visiting app home", () => {
        persistStarredOrgId(portronics.id);

        expect(resolveAuthenticatedHomeRedirect(false, organizations)).toBe(
            `/organizations/${portronics.id}/products`,
        );
    });

    test("opens the picker when no organization is starred", () => {
        expect(resolveAuthenticatedHomeRedirect(false, organizations)).toBe("/organizations");
    });

    test("waits for organizations before choosing a home path", () => {
        persistStarredOrgId(portronics.id);

        expect(resolveAuthenticatedHomeRedirect(true, organizations)).toBeNull();
    });

    test("sends authenticated visitors from / to the starred-organization redirect", () => {
        const appSource = readFileSync(join(import.meta.dir, "../../App.tsx"), "utf8");

        expect(appSource).toContain('path="/" element={authenticatedUser ? <AuthenticatedHomeRedirect />');
        expect(appSource).not.toContain('path="/" element={authenticatedUser ? <Navigate to="/organizations"');
    });
});
