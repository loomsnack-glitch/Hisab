import { create } from "zustand";
import type { AuthenticatedUserDTO } from "@repo/types";
import {
    initialAdminAuthState,
    reduceAdminAuthState,
    type AdminAuthSnapshot,
} from "./auth-state";

type AdminAuthStore = AdminAuthSnapshot & {
    actions: {
        startChecking: () => void;
        setAuthenticated: (user: AuthenticatedUserDTO) => void;
        startLogout: () => void;
        clearSession: () => void;
    };
};

const useAdminAuthStore = create<AdminAuthStore>()((set) => ({
    ...initialAdminAuthState,
    actions: {
        startChecking: () => set((state) => reduceAdminAuthState(state, { type: "start-checking" })),
        setAuthenticated: (user) => set((state) => reduceAdminAuthState(state, { type: "authenticated", user })),
        startLogout: () => set((state) => reduceAdminAuthState(state, { type: "start-logout" })),
        clearSession: () => set((state) => reduceAdminAuthState(state, { type: "signed-out" })),
    },
}));

export const useAdminAuthStatus = () => useAdminAuthStore((state) => state.status);
export const useAdminAuthUser = () => useAdminAuthStore((state) => state.user);
export const useAdminAuthActions = () => useAdminAuthStore((state) => state.actions);

export { useAdminAuthStore };
