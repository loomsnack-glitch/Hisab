import type { AuthenticatedUserDTO } from "@repo/types";

export type AdminAuthStatus = "checking" | "signed-out" | "signed-in" | "logging-out";

export type AdminAuthSnapshot = {
    status: AdminAuthStatus;
    user: AuthenticatedUserDTO | null;
};

export type AdminAuthAction =
    | { type: "start-checking" }
    | { type: "authenticated"; user: AuthenticatedUserDTO }
    | { type: "start-logout" }
    | { type: "signed-out" };

export const initialAdminAuthState: AdminAuthSnapshot = {
    status: "checking",
    user: null,
};

export const reduceAdminAuthState = (
    state: AdminAuthSnapshot,
    action: AdminAuthAction,
): AdminAuthSnapshot => {
    switch (action.type) {
        case "start-checking":
            return { status: "checking", user: null };
        case "authenticated":
            return { status: "signed-in", user: action.user };
        case "start-logout":
            return state.user ? { status: "logging-out", user: state.user } : { status: "signed-out", user: null };
        case "signed-out":
            return { status: "signed-out", user: null };
    }
};
