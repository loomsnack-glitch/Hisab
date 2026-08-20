import { describe, expect, test } from "bun:test";

import { OwnerLoginSchema, OwnerUserSeedSchema } from "./platform.schema";

describe("Owner User authentication contracts", () => {
    test("normalizes Owner User phones before authentication", () => {
        const result = OwnerLoginSchema.parse({
            requestType: "user-info",
            phone: "98765 43210",
            password: "correct horse battery staple",
        });

        expect(result.phone).toBe("+919876543210");
    });

    test("requires the credential for the selected owner login mode", () => {
        expect(
            OwnerLoginSchema.safeParse({
                requestType: "user-info",
                phone: "+919876543210",
            }).success,
        ).toBe(false);
        expect(
            OwnerLoginSchema.safeParse({
                requestType: "otp-verification",
                phone: "+919876543210",
                otp: "12345",
            }).success,
        ).toBe(false);
    });

    test("normalizes and validates the Seed Owner User identity", () => {
        const result = OwnerUserSeedSchema.parse({
            firstName: "  Asha ",
            lastName: "  Shah ",
            phone: "+91 98765 43210",
            password: "correct horse battery staple",
        });

        expect(result).toEqual({
            firstName: "Asha",
            lastName: "Shah",
            phone: "+919876543210",
            password: "correct horse battery staple",
        });
    });
});
