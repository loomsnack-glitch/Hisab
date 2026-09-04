import type { DeviceSessionDTO } from "@repo/types";

export const POS_SESSION_STATES = [
    "starting",
    "locked",
    "unlocking",
    "active",
    "expired",
    "logging-out",
] as const;

export type PosSessionState = (typeof POS_SESSION_STATES)[number];

export type PosSessionSnapshot = {
    state: PosSessionState;
    session: DeviceSessionDTO | null;
    message: string | null;
    canRetry: boolean;
};

export type PosSessionEvent =
    | { type: "BOOT_STARTED" }
    | { type: "NO_SESSION" }
    | { type: "BOOT_RETRYABLE_FAILURE"; message: string }
    | { type: "SESSION_ACTIVE"; session: DeviceSessionDTO }
    | { type: "SESSION_EXPIRED"; message?: string }
    | { type: "UNLOCK_STARTED" }
    | { type: "UNLOCK_SUCCEEDED"; session: DeviceSessionDTO }
    | { type: "LOGOUT_STARTED" }
    | { type: "LOGOUT_COMPLETED" }
    | { type: "LOGOUT_FAILED"; message: string }
    | { type: "RETRY" };

export const initialPosSession: PosSessionSnapshot = {
    state: "starting",
    session: null,
    message: null,
    canRetry: false,
};

export const transitionPosSession = (
    snapshot: PosSessionSnapshot,
    event: PosSessionEvent,
): PosSessionSnapshot => {
    switch (event.type) {
        case "BOOT_STARTED":
        case "RETRY":
            return { ...snapshot, state: "starting", message: null, canRetry: false };
        case "NO_SESSION":
            return { state: "locked", session: null, message: null, canRetry: false };
        case "BOOT_RETRYABLE_FAILURE":
            return { ...snapshot, state: "starting", message: event.message, canRetry: true };
        case "SESSION_ACTIVE":
        case "UNLOCK_SUCCEEDED":
            return { state: "active", session: event.session, message: null, canRetry: false };
        case "SESSION_EXPIRED":
            return { state: "expired", session: null, message: event.message ?? null, canRetry: false };
        case "UNLOCK_STARTED":
            return { ...snapshot, state: "unlocking", message: null, canRetry: false };
        case "LOGOUT_STARTED":
            return { ...snapshot, state: "logging-out", message: null, canRetry: false };
        case "LOGOUT_COMPLETED":
            return { state: "locked", session: null, message: null, canRetry: false };
        case "LOGOUT_FAILED":
            return { ...snapshot, state: "active", message: event.message, canRetry: false };
    }
};
