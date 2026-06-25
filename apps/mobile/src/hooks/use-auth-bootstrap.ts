import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { clearAuthToken, hydrateAuthToken, userAuthenticate } from "@repo/services";
import { useAuthActions } from "../store/auth.store";

export const AUTH_QUERY_KEY = ["auth", "me"] as const;

export const useAuthBootstrap = () => {
    const { setUser, clearUser } = useAuthActions();
    const [hydrated, setHydrated] = useState(false);
    const [hasToken, setHasToken] = useState(false);

    useEffect(() => {
        hydrateAuthToken()
            .then((token) => {
                setHasToken(Boolean(token));
            })
            .finally(() => {
                setHydrated(true);
            });
    }, []);

    const authQuery = useQuery({
        queryKey: AUTH_QUERY_KEY,
        queryFn: userAuthenticate,
        enabled: hydrated && hasToken,
        retry: false,
    });

    useEffect(() => {
        if (authQuery.data?.status === "success" && authQuery.data.data?.user) {
            setUser(authQuery.data.data.user);
            return;
        }

        if (authQuery.data?.status === "error" || authQuery.isError) {
            clearUser();
            void clearAuthToken();
        }
    }, [authQuery.data, authQuery.isError, clearUser, setUser]);

    const isPending = !hydrated || (hasToken && authQuery.isPending);

    return { isPending };
};
