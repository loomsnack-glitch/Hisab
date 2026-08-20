import { describe, expect, test } from "bun:test";

import { CreateOwnerUserSchema, OwnerLoginSchema, OwnerUserActiveStateSchema, OwnerUserSeedSchema } from "./platform.schema";

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

    test("creates an Owner User with the same identity contract as the seed command", () => {
        const result = CreateOwnerUserSchema.parse({
            firstName: "  Ravi ",
            lastName: "  Mehta ",
            phone: "91111 11111",
            password: "another horse battery",
        });

        expect(result).toEqual({
            firstName: "Ravi",
            lastName: "Mehta",
            phone: "+919111111111",
            password: "another horse battery",
        });
        expect(CreateOwnerUserSchema.safeParse({
            firstName: "Ravi",
            lastName: "Mehta",
            phone: "+919111111111",
            password: "short",
        }).success).toBe(false);
    });

    test("accepts only an explicit active-state boolean", () => {
        expect(OwnerUserActiveStateSchema.parse({ isActive: false })).toEqual({ isActive: false });
        expect(OwnerUserActiveStateSchema.safeParse({ isActive: "false" }).success).toBe(false);
        expect(OwnerUserActiveStateSchema.safeParse({}).success).toBe(false);
    });
});
