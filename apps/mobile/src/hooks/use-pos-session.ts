import { useCallback, useEffect, useReducer, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { clearAuthToken, deviceAuthenticate, hydrateAuthToken } from "@repo/services";
import { posStorage } from "../lib/storage";
import {
    initialPosSession,
    transitionPosSession,
    type PosSessionSnapshot,
} from "../lib/pos-session";

const getErrorCode = (error: unknown): number | undefined => {
    if (!error || typeof error !== "object" || !("code" in error)) {
        return undefined;
    }

    const code = (error as { code?: unknown }).code;
    return typeof code === "number" ? code : undefined;
};

const getErrorMessage = (error: unknown) => {
    if (error && typeof error === "object" && "message" in error) {
        const message = (error as { message?: unknown }).message;
        if (typeof message === "string" && message.trim()) {
            return message;
        }
    }

    return "Unable to verify the POS session";
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
    const [snapshot, dispatch] = useReducer(transitionPosSession, initialPosSession);

    useEffect(() => {
        let mounted = true;

        void Promise.all([hydrateAuthToken(), posStorage.getDeviceSession()]).then(([token, session]) => {
            if (!mounted) {
                return;
            }

            setHasToken(Boolean(token));
            setHasStoredSession(Boolean(session));
            setHydrated(true);
            if (!token || !session) {
                dispatch({ type: "NO_SESSION" });
            }
        });

        return () => {
            mounted = false;
        };
    }, []);

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
            void posStorage.setDeviceSession(sessionQuery.data.data.session);
            dispatch({ type: "SESSION_ACTIVE", session: sessionQuery.data.data.session });
            return;
        }

        dispatch({ type: "SESSION_EXPIRED", message: sessionQuery.data.message });
    }, [sessionQuery.data]);

    useEffect(() => {
        if (!sessionQuery.isError) {
            return;
        }

        if (isExpiredSessionError(sessionQuery.error)) {
            void clearAuthToken();
            void posStorage.clearSession();
            dispatch({ type: "SESSION_EXPIRED", message: getErrorMessage(sessionQuery.error) });
            return;
        }

        dispatch({ type: "BOOT_RETRYABLE_FAILURE", message: getErrorMessage(sessionQuery.error) });
    }, [sessionQuery.error, sessionQuery.isError]);

    const retry = useCallback(() => {
        dispatch({ type: "RETRY" });
        void sessionQuery.refetch();
    }, [sessionQuery.refetch]);

    return {
        ...snapshot,
        isPending: snapshot.state === "starting" && !snapshot.canRetry,
        retry,
    } satisfies PosSessionSnapshot & { isPending: boolean; retry: () => void };
};
