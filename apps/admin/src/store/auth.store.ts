import { create } from "zustand";
import type { AuthenticatedUserDTO } from "@repo/types";

type AuthState = {
    user: AuthenticatedUserDTO | null;
    actions: {
        setUser: (user: AuthenticatedUserDTO | null) => void;
        clearUser: () => void;
    };
};

const useAuthStore = create<AuthState>()((set) => ({
    user: null,
    actions: {
        setUser: (user) => set({ user }),
        clearUser: () => set({ user: null }),
    },
}));

export const useAuthUser = () => useAuthStore((state) => state.user);
export const useAuthActions = () => useAuthStore((state) => state.actions);
