import { describe, expect, it } from "bun:test";
import {
    initialPosSession,
    POS_SESSION_STATES,
    transitionPosSession,
} from "./pos-session";

const session = {
    device: {
        id: "device-1",
        organizationId: "org-1",
        storeId: "store-1",
        name: "Front counter",
        loginUsername: "counter",
        status: "active",
        lastSeenAt: null,
    },
    store: {
        id: "store-1",
        organizationId: "org-1",
        name: "Main Store",
        address: null,
        kotSystemEnabled: false,
        tableManagementEnabled: false,
        moneyAccountTrackingEnabled: false,
    },
    organization: {
        id: "org-1",
        name: "Ganatri",
        username: "ganatri",
        tagline: null,
    },
} as const;

describe("POS session state", () => {
    it("covers the approved lifecycle states", () => {
        expect(POS_SESSION_STATES).toEqual([
            "starting",
            "locked",
            "unlocking",
            "active",
            "expired",
            "logging-out",
        ]);
    });

    it("moves from boot to locked when no session exists", () => {
        expect(transitionPosSession(initialPosSession, { type: "NO_SESSION" })).toEqual({
            state: "locked",
            session: null,
            message: null,
            canRetry: false,
        });
    });

    it("keeps retryable boot failures in starting state", () => {
        expect(
            transitionPosSession(initialPosSession, {
                type: "BOOT_RETRYABLE_FAILURE",
                message: "Network unavailable",
            }),
        ).toEqual({
            state: "starting",
            session: null,
            message: "Network unavailable",
            canRetry: true,
        });
    });

    it("requires a verified session before becoming active", () => {
        const active = transitionPosSession(initialPosSession, {
            type: "SESSION_ACTIVE",
            session,
        });

        expect(active.state).toBe("active");
        expect(active.session).toEqual(session);
    });

    it("separates expiry and logout from active state", () => {
        const active = transitionPosSession(initialPosSession, { type: "SESSION_ACTIVE", session });
        const expired = transitionPosSession(active, {
            type: "SESSION_EXPIRED",
            message: "Device session is no longer active",
        });
        const loggingOut = transitionPosSession(active, { type: "LOGOUT_STARTED" });
        const locked = transitionPosSession(loggingOut, { type: "LOGOUT_COMPLETED" });

        expect(expired).toMatchObject({ state: "expired", session: null });
        expect(loggingOut.state).toBe("logging-out");
        expect(locked.state).toBe("locked");
    });
});
