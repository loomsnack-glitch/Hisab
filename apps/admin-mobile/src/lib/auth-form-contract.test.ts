import { describe, expect, test } from "bun:test";
import { LoginFormSchema, RegisterFormSchema } from "@repo/types";

const registrationValues = {
    requestType: "user-info" as const,
    salutation: "mr." as const,
    firstName: "Ada",
    lastName: "Lovelace",
    phone: "+919876543210",
    email: "",
    password: "SecurePass1",
    confirmPassword: "SecurePass1",
};

describe("Admin auth form contracts", () => {
    test("requires password for password login and six digits for OTP login", () => {
        expect(
            LoginFormSchema.safeParse({
                requestType: "user-info",
                phone: "+919876543210",
                password: "",
            }).success,
        ).toBe(false);
        expect(
            LoginFormSchema.safeParse({
                requestType: "otp-verification",
                phone: "+919876543210",
                otp: "12345",
            }).success,
        ).toBe(false);
        expect(
            LoginFormSchema.safeParse({
                requestType: "otp-verification",
                phone: "+919876543210",
                otp: "123123",
            }).success,
        ).toBe(true);
    });

    test("validates registration password confirmation through the shared schema", () => {
        expect(RegisterFormSchema.safeParse(registrationValues).success).toBe(true);
        expect(
            RegisterFormSchema.safeParse({
                ...registrationValues,
                confirmPassword: "DifferentPass1",
            }).success,
        ).toBe(false);
    });
});
