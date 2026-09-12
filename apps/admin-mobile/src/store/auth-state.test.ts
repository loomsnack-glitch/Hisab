import { describe, expect, it } from "bun:test";
import type { AuthenticatedUserDTO } from "@repo/types";
import {
    initialAdminAuthState,
    reduceAdminAuthState,
} from "./auth-state";

const user = { id: "user-1" } as AuthenticatedUserDTO;

describe("Admin auth state", () => {
    it("starts in a checking state without a user", () => {
        expect(initialAdminAuthState).toEqual({ status: "checking", user: null });
    });

    it("only enters signed-in with an authenticated user", () => {
        expect(reduceAdminAuthState(initialAdminAuthState, { type: "authenticated", user })).toEqual({
            status: "signed-in",
            user,
        });
    });

    it("keeps the user visible while logout is in progress", () => {
        const signedIn = reduceAdminAuthState(initialAdminAuthState, { type: "authenticated", user });

        expect(reduceAdminAuthState(signedIn, { type: "start-logout" })).toEqual({
            status: "logging-out",
            user,
        });
    });

    it("clears the user when the session ends", () => {
        const signedIn = reduceAdminAuthState(initialAdminAuthState, { type: "authenticated", user });

        expect(reduceAdminAuthState(signedIn, { type: "signed-out" })).toEqual({
            status: "signed-out",
            user: null,
        });
    });
});
