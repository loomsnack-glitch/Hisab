import { Hono } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";
import { OwnerLoginSchema, STATUS_CODES, type PlatformEntryResponse } from "@repo/types";
import { handleError, handleServiceResponse } from "@/helpers/service.helper";
import { createOwnerAuthMiddleware, OWNER_AUTH_COOKIE } from "@/middlewares/owner-auth.middleware";
import { validateSchema } from "@/middlewares/validate";
import type { AppVariables } from "@/types/hono";
import { getOwnerAuthService, OWNER_SESSION_SECONDS, type OwnerAuthService } from "./owner-auth.service";

const setOwnerCookie = (c: Parameters<typeof setCookie>[0], token: string) => {
    setCookie(c, OWNER_AUTH_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "None" : "lax",
        path: "/",
        maxAge: OWNER_SESSION_SECONDS,
    });
};

export const createPlatformRoutes = (authService: OwnerAuthService = getOwnerAuthService()) => {
    const router = new Hono<{ Variables: AppVariables }>();
    const ownerAuthMiddleware = createOwnerAuthMiddleware(authService);

    router.post("/auth/login", validateSchema("json", OwnerLoginSchema), async (c) => {
        try {
            const serviceResponse = await authService.login(c.req.valid("json"), {
                deviceId: c.get("deviceId") ?? c.req.header("x-device-id") ?? "platform-browser",
            });
            if (serviceResponse.data?.token) {
                setOwnerCookie(c, serviceResponse.data.token);
            }
            return handleServiceResponse(c, serviceResponse);
        } catch (error) {
            return handleError("platform.routes", "ownerLogin", c, error);
        }
    });

    router.post("/auth/logout", async (c) => {
        try {
            deleteCookie(c, OWNER_AUTH_COOKIE, { path: "/" });
            return handleServiceResponse(c, {
                status: "success",
                message: "Owner logout successful",
                data: null,
                code: STATUS_CODES.SUCCESS,
            });
        } catch (error) {
            return handleError("platform.routes", "ownerLogout", c, error);
        }
    });

    router.all("/auth/register", (c) => c.notFound());

    router.get("/auth", ownerAuthMiddleware, async (c) =>
        handleServiceResponse(c, {
            status: "success",
            message: "Owner authenticated successfully",
            data: { ownerUser: c.get("authOwner") },
            code: STATUS_CODES.SUCCESS,
        }),
    );

    router.use("*", ownerAuthMiddleware);
    router.get("/entry", async (c) =>
        handleServiceResponse<PlatformEntryResponse>(c, {
            status: "success",
            message: "Platform Operations Console ready",
            data: { ownerUser: c.get("authOwner") },
            code: STATUS_CODES.SUCCESS,
        }),
    );

    return router;
};
