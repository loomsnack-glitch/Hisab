import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { clearAuthToken, deviceAuthenticate, hydrateAuthToken } from "@repo/services";
import { posStorage } from "../lib/storage";
import { usePosSessionDispatch, usePosSessionSnapshot } from "../store/pos-session.store";

const getErrorCode = (error: unknown): number | undefined => {
    if (!error || typeof error !== "object" || !("code" in error)) {
        return undefined;
    }

    const code = (error as { code?: unknown }).code;
    return typeof code === "number" ? code : undefined;
};

const isExpiredSessionError = (error: unknown) => {
    const code = getErrorCode(error);
    return code === 401 || code === 403;
};

export const POS_SESSION_QUERY_KEY = ["pos", "session"] as const;

export const usePosSession = () => {
    const [hydrated, setHydrated] = useState(false);
    const [hasToken, setHasToken] = useState(false);
    const [hasStoredSession, setHasStoredSession] = useState(false);
    const [hydrationAttempt, setHydrationAttempt] = useState(0);
    const { t } = useTranslation("pos");
    const snapshot = usePosSessionSnapshot();
    const dispatch = usePosSessionDispatch();

    useEffect(() => {
        let mounted = true;

        setHydrated(false);
        void Promise.all([hydrateAuthToken(), posStorage.getDeviceSession()])
            .then(([token, session]) => {
                if (!mounted) {
                    return;
                }

                setHasToken(Boolean(token));
                setHasStoredSession(Boolean(session));
                setHydrated(true);
                if (!token || !session) {
                    dispatch({ type: "NO_SESSION" });
                }
            })
            .catch(() => {
                if (!mounted) {
                    return;
                }

                setHasToken(false);
                setHasStoredSession(false);
                setHydrated(true);
                dispatch({
                    type: "BOOT_RETRYABLE_FAILURE",
                    message: t("storageUnavailable"),
                });
            });

        return () => {
            mounted = false;
        };
    }, [dispatch, hydrationAttempt, t]);

    const sessionQuery = useQuery({
        queryKey: POS_SESSION_QUERY_KEY,
        queryFn: deviceAuthenticate,
        enabled: hydrated && hasToken && hasStoredSession,
        retry: false,
    });

    useEffect(() => {
        if (!sessionQuery.data) {
            return;
        }

        if (sessionQuery.data.status === "success" && sessionQuery.data.data?.session) {
            const session = sessionQuery.data.data.session;
            void posStorage.setDeviceSession(session)
                .then(() => {
                    dispatch({ type: "SESSION_ACTIVE", session });
                })
                .catch(() => {
                    dispatch({
                        type: "BOOT_RETRYABLE_FAILURE",
                        message: t("storageUnavailable"),
                    });
                });
            return;
        }

        dispatch({ type: "SESSION_EXPIRED", message: t("sessionVerificationFailed") });
    }, [dispatch, sessionQuery.data, t]);

    useEffect(() => {
        if (!sessionQuery.isError) {
            return;
        }

        if (isExpiredSessionError(sessionQuery.error)) {
            void Promise.allSettled([clearAuthToken(), posStorage.clearSession()]).then(() => {
                dispatch({ type: "SESSION_EXPIRED", message: t("sessionVerificationFailed") });
            });
            return;
        }

        dispatch({ type: "BOOT_RETRYABLE_FAILURE", message: t("sessionVerificationFailed") });
    }, [dispatch, sessionQuery.error, sessionQuery.isError, t]);

    const retry = useCallback(() => {
        dispatch({ type: "RETRY" });
        setHydrationAttempt((attempt) => attempt + 1);
        if (hydrated && hasToken && hasStoredSession) {
            void sessionQuery.refetch();
        }
    }, [dispatch, hasStoredSession, hasToken, hydrated, sessionQuery.refetch]);

    return {
        ...snapshot,
        isPending: snapshot.state === "starting" && !snapshot.canRetry,
        retry,
    };
};
