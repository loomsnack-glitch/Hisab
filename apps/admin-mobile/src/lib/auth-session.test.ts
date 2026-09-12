import { describe, expect, test } from "bun:test";
import type { AuthenticatedUserDTO, BaseAuthResponse, ServiceResponse } from "@repo/types";
import { resolveAuthSession } from "./auth-session";

const user = { id: "user-1" } as AuthenticatedUserDTO;

const success = (data: BaseAuthResponse | null): ServiceResponse<BaseAuthResponse | null> => ({
    status: "success",
    data,
    message: "ok",
    code: 200,
});

describe("Admin auth session response", () => {
    test("accepts a successful response with user and token", () => {
        expect(resolveAuthSession(success({ user, token: "jwt-token" }))).toEqual({
            user,
            token: "jwt-token",
        });
    });

    test("rejects errors and incomplete successful responses", () => {
        expect(resolveAuthSession({ status: "error", message: "failed", code: 401 })).toBeNull();
        expect(resolveAuthSession(success({ user }))).toBeNull();
        expect(resolveAuthSession(success({ token: "jwt-token" }))).toBeNull();
    });
});
