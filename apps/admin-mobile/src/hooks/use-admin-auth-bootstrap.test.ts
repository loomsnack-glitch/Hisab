import { describe, expect, it } from "bun:test";
import type { AuthenticatedUserDTO, ServiceResponse } from "@repo/types";
import { resolveBootstrapUser } from "./use-admin-auth-bootstrap";

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
});
