import { describe, expect, test } from "bun:test";

import { getOrgBgColor, getOrgInitials } from "@/lib/organization-avatar";

describe("organization avatar fallback", () => {
    test("uses the first letters of a two-word business name", () => {
        expect(getOrgInitials("Panini House")).toBe("PH");
    });

    test("uses the first two letters of a single-word name", () => {
        expect(getOrgInitials("Adajan")).toBe("AD");
    });

    test("keeps a stable color for the same organization id", () => {
        expect(getOrgBgColor("org-1")).toBe(getOrgBgColor("org-1"));
        expect(getOrgBgColor("org-1")).not.toBe(getOrgBgColor("org-2"));
    });
});
