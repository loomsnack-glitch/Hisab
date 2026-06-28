import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import { STATUS_CODES } from "@repo/types";
import * as deviceAuthService from "@/modules/access-control/device-auth/device-auth.service";

const DEVICE_AUTH_COOKIE = "device_token";

export const deviceAuthMiddleware = async (c: Context, next: Next) => {
    try {
        const token = getCookie(c, DEVICE_AUTH_COOKIE) || c.req.header("Authorization");
        if (!token) {
            return c.json(
                {
                    status: "error",
                    message: "Device authentication is required",
                    code: STATUS_CODES.UNAUTHORIZED,
                },
                STATUS_CODES.UNAUTHORIZED,
            );
        }

        const authResponse = await deviceAuthService.authenticate(token);
        if (authResponse.status === "error" || !authResponse.data?.session) {
            c.status(STATUS_CODES.UNAUTHORIZED);
            return c.json(authResponse);
        }

        c.set("authDevice", authResponse.data.session);
        await next();

        if (c.res.status < 400) {
            await deviceAuthService.touchLastSeen(authResponse.data.session.device.id);
        }
    } catch {
        return c.json(
            {
                status: "error",
                message: "Invalid device token",
                code: STATUS_CODES.UNAUTHORIZED,
            },
            STATUS_CODES.UNAUTHORIZED,
        );
    }
};
