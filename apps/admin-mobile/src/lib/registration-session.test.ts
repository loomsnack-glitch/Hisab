import { describe, expect, test } from "bun:test";
import type { RegisterAuthResponse, ServiceResponse } from "@repo/types";
import { resolveRegistrationSession } from "./registration-session";

const response = (data: RegisterAuthResponse | null): ServiceResponse<RegisterAuthResponse | null> => ({
    status: "success",
    data,
    message: "ok",
    code: 200,
});

describe("Admin registration session response", () => {
    test("accepts a successful response with user and token", () => {
        const result = resolveRegistrationSession(
            response({
                user: { id: "user-id" } as RegisterAuthResponse["user"],
                token: "token",
            }),
        );

        expect(result?.token).toBe("token");
        expect(result?.user.id).toBe("user-id");
    });

    test("rejects a response without a complete session", () => {
        expect(resolveRegistrationSession(response({ user: undefined, token: "token" }))).toBeNull();
        expect(
            resolveRegistrationSession({
                status: "error",
                data: null,
                message: "failed",
                code: 400,
            }),
        ).toBeNull();
    });
});
