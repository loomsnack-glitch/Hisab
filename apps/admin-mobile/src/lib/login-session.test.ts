import { describe, expect, it } from "bun:test";
import type { AuthenticatedUserDTO, ServiceResponse } from "@repo/types";
import { resolveLoginSession } from "./login-session";

const user = { id: "user-1" } as AuthenticatedUserDTO;

describe("Admin login session response", () => {
    it("accepts a successful response with user and token", () => {
        const response = {
            status: "success",
            message: "Signed in",
            code: 200,
            data: { user, token: "jwt-token" },
        } satisfies ServiceResponse<{ user: AuthenticatedUserDTO; token: string }>;

        expect(resolveLoginSession(response)).toEqual({ user, token: "jwt-token" });
    });

    it("rejects an error response", () => {
        const response = {
            status: "error",
            message: "Invalid credentials",
            code: 401,
        } satisfies ServiceResponse<null>;

        expect(resolveLoginSession(response)).toBeNull();
    });

    it("does not enter protected state without a complete session payload", () => {
        const response = {
            status: "success",
            message: "Incomplete",
            code: 200,
            data: { user },
        } satisfies ServiceResponse<{ user: AuthenticatedUserDTO }>;

        expect(resolveLoginSession(response)).toBeNull();
    });
});
