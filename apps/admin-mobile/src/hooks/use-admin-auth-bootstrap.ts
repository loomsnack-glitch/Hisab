import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { clearAuthToken, hydrateAuthToken, userAuthenticate } from "@repo/services";
import type { BaseAuthResponse, ServiceResponse } from "@repo/types";
import { adminAuthKeys } from "../lib/auth-keys";
import { useAdminAuthActions, useAdminAuthStatus } from "../store/auth.store";
import type { AdminAuthStatus } from "../store/auth-state";

export const resolveBootstrapUser = (
    response: ServiceResponse<BaseAuthResponse | null> | undefined,
) => response?.status === "success" ? response.data?.user ?? null : null;

export const shouldClearBootstrapSession = (
    response: ServiceResponse<BaseAuthResponse | null> | undefined,
    isSettled: boolean,
    isError = false,
) => isSettled && (isError || response?.status !== "success" || !response.data?.user);

export const shouldClearMissingBootstrapToken = (
    hasToken: boolean,
    status: AdminAuthStatus,
) => !hasToken && status !== "signed-in" && status !== "logging-out";

const clearAdminToken = async () => {
    try {
        await clearAuthToken();
    } catch {
        // The in-memory auth state still needs to be cleared if native cleanup fails.
    }
};

export const useAdminAuthBootstrap = () => {
    const status = useAdminAuthStatus();
    const { startChecking, setAuthenticated, clearSession } = useAdminAuthActions();
    const [tokenHydrated, setTokenHydrated] = useState(false);
    const [hasToken, setHasToken] = useState(false);

    useEffect(() => {
        let mounted = true;
        startChecking();

        hydrateAuthToken()
            .then((token) => {
                if (!mounted) return;
                setHasToken(Boolean(token));
                setTokenHydrated(true);
            })
            .catch(async () => {
                if (!mounted) return;
                await clearAdminToken();
                clearSession();
                setHasToken(false);
                setTokenHydrated(true);
            });

        return () => {
            mounted = false;
        };
    }, [clearSession, startChecking]);

    const authQuery = useQuery({
        queryKey: adminAuthKeys.me,
        queryFn: userAuthenticate,
        enabled: tokenHydrated && hasToken,
        retry: false,
    });

    useEffect(() => {
        if (!tokenHydrated) return;

        if (shouldClearMissingBootstrapToken(hasToken, status)) {
            clearSession();
            return;
        }

        if (!hasToken) return;

        if (
            shouldClearBootstrapSession(
                authQuery.data,
                authQuery.isError || authQuery.isSuccess,
                authQuery.isError,
            )
        ) {
            void clearAdminToken();
            clearSession();
            return;
        }

        const user = resolveBootstrapUser(authQuery.data);
        if (user) {
            setAuthenticated(user);
        }
    }, [authQuery.data, authQuery.isError, authQuery.isSuccess, clearSession, hasToken, setAuthenticated, status, tokenHydrated]);

    return {
        status,
        isPending: status === "checking" || !tokenHydrated || (hasToken && authQuery.isPending),
    };
};
