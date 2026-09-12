import { describe, expect, it } from "bun:test";
import type { AuthenticatedUserDTO, ServiceResponse } from "@repo/types";
import {
    resolveBootstrapUser,
    shouldClearBootstrapSession,
    shouldClearMissingBootstrapToken,
} from "./use-admin-auth-bootstrap";

const user = { id: "user-1" } as AuthenticatedUserDTO;

describe("Admin auth bootstrap response", () => {
    it("accepts only a successful response containing a user", () => {
        const response = {
            status: "success",
            message: "Authenticated",
            code: 200,
            data: { user },
        } satisfies ServiceResponse<{ user: AuthenticatedUserDTO }>;

        expect(resolveBootstrapUser(response)).toBe(user);
    });

    it("rejects an error response", () => {
        const response = {
            status: "error",
            message: "Unauthorized",
            code: 401,
        } satisfies ServiceResponse<null>;

        expect(resolveBootstrapUser(response)).toBeNull();
    });

    it("rejects a successful response without a user", () => {
        const response = {
            status: "success",
            message: "No session",
            code: 200,
            data: null,
        } satisfies ServiceResponse<null>;

        expect(resolveBootstrapUser(response)).toBeNull();
    });

    it("clears a settled successful response without a user", () => {
        const response = {
            status: "success",
            message: "No session",
            code: 200,
            data: null,
        } satisfies ServiceResponse<null>;

        expect(shouldClearBootstrapSession(response, true)).toBe(true);
        expect(shouldClearBootstrapSession(response, false)).toBe(false);
    });

    it("clears a rejected response even when stale data is present", () => {
        const response = {
            status: "success",
            message: "Stale data",
            code: 200,
            data: { user },
        } satisfies ServiceResponse<{ user: AuthenticatedUserDTO }>;

        expect(shouldClearBootstrapSession(response, true, true)).toBe(true);
    });

    it("does not clear a session after login when bootstrap still has its startup token state", () => {
        expect(shouldClearMissingBootstrapToken(false, "signed-in")).toBe(false);
    });
});
