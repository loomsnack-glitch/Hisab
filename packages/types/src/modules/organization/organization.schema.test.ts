import { describe, expect, test } from "bun:test";

import { OrganizationDTOSchema, UpdateOrganizationSchema } from "./organization.schema";

describe("Organization branding contracts", () => {
    test("accepts an optional tagline and preserves trimmed text", () => {
        const result = UpdateOrganizationSchema.safeParse({
            name: "Hisab Foods",
            username: "hisab-foods",
            tagline: "  Fresh taste, every day  ",
        });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.tagline).toBe("Fresh taste, every day");
        }
    });

    test("accepts a blank tagline so it can be cleared", () => {
        const result = UpdateOrganizationSchema.safeParse({
            name: "Hisab Foods",
            username: "hisab-foods",
            tagline: "",
        });

        expect(result.success).toBe(true);
    });

    test("rejects a tagline longer than 255 characters", () => {
        const result = UpdateOrganizationSchema.safeParse({
            name: "Hisab Foods",
            username: "hisab-foods",
            tagline: "a".repeat(256),
        });

        expect(result.success).toBe(false);
    });

    test("keeps the DTO tagline contract capped at 255 characters", () => {
        expect(OrganizationDTOSchema.shape.tagline.safeParse("a".repeat(255)).success).toBe(true);
        expect(OrganizationDTOSchema.shape.tagline.safeParse("a".repeat(256)).success).toBe(false);
    });
});
