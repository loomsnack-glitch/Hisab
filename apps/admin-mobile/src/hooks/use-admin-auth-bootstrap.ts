import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { clearAuthToken, hydrateAuthToken, userAuthenticate } from "@repo/services";
import type { BaseAuthResponse, ServiceResponse } from "@repo/types";
import { adminAuthKeys } from "../lib/auth-keys";
import { useAdminAuthActions, useAdminAuthStatus } from "../store/auth.store";

export const resolveBootstrapUser = (
    response: ServiceResponse<BaseAuthResponse | null> | undefined,
) => response?.status === "success" ? response.data?.user ?? null : null;

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

        if (!hasToken) {
            clearSession();
            return;
        }

        const user = resolveBootstrapUser(authQuery.data);
        if (user) {
            setAuthenticated(user);
            return;
        }

        if (authQuery.isError || authQuery.data?.status === "error") {
            void clearAdminToken();
            clearSession();
        }
    }, [authQuery.data, authQuery.isError, clearSession, hasToken, setAuthenticated, tokenHydrated]);

    return {
        status,
        isPending: status === "checking" || !tokenHydrated || (hasToken && authQuery.isPending),
    };
};
