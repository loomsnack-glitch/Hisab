import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import { STATUS_CODES } from "@repo/types";
import { handleError } from "@/helpers/service.helper";
import type { OwnerAuthService } from "@/modules/platform/owner-auth.service";

export const OWNER_AUTH_COOKIE = "owner_token";

export const createOwnerAuthMiddleware = (authService: OwnerAuthService) => async (c: Context, next: Next) => {
    try {
        const token = getCookie(c, OWNER_AUTH_COOKIE) || c.req.header("Authorization");
        if (!token) {
            return c.json(
                {
                    status: "error",
                    message: "Owner authentication is required",
                    code: STATUS_CODES.UNAUTHORIZED,
                },
                STATUS_CODES.UNAUTHORIZED,
            );
        }

        const response = await authService.authenticate(token);
        if (response.status === "error" || !response.data?.ownerUser) {
            return c.json(response, STATUS_CODES.UNAUTHORIZED);
        }

        c.set("authOwner", response.data.ownerUser);
        await next();
    } catch (error) {
        return handleError("owner-auth.middleware", "authenticate", c, error);
    }
};
