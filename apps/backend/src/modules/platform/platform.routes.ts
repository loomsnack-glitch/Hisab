import { Hono } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";
import { z } from "zod";
import {
    CreateOwnerUserSchema,
    OwnerLoginSchema,
    OwnerUserActiveStateSchema,
    PlatformDashboardQuerySchema,
    PlatformOrganizationListQuerySchema,
    STATUS_CODES,
    type PlatformEntryResponse,
} from "@repo/types";
import { handleError, handleServiceResponse } from "@/helpers/service.helper";
import { createOwnerAuthMiddleware, OWNER_AUTH_COOKIE } from "@/middlewares/owner-auth.middleware";
import { validateSchema } from "@/middlewares/validate";
import type { AppVariables } from "@/types/hono";
import { getOwnerAuthService, OWNER_SESSION_SECONDS, type OwnerAuthService } from "./owner-auth.service";
import { getOwnerUserService, type OwnerUserService } from "./owner-user.service";
import { getPlatformReportingService, type PlatformReportingService } from "./platform-reporting.service";

const setOwnerCookie = (c: Parameters<typeof setCookie>[0], token: string) => {
    setCookie(c, OWNER_AUTH_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "None" : "lax",
        path: "/",
        maxAge: OWNER_SESSION_SECONDS,
    });
};

export const createPlatformRoutes = (
    authService: OwnerAuthService = getOwnerAuthService(),
    ownerUserService: OwnerUserService = getOwnerUserService(),
    reportingService: PlatformReportingService = getPlatformReportingService(),
) => {
    const router = new Hono<{ Variables: AppVariables }>();
    const ownerAuthMiddleware = createOwnerAuthMiddleware(authService);
    const ownerUserIdSchema = z.uuid("Invalid Owner User id");

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

    router.get("/dashboard", validateSchema("query", PlatformDashboardQuerySchema), async (c) => {
        try {
            return handleServiceResponse(c, await reportingService.getDashboard(c.req.valid("query")));
        } catch (error) {
            return handleError("platform.routes", "getPlatformDashboard", c, error);
        }
    });

    router.get("/organizations", validateSchema("query", PlatformOrganizationListQuerySchema), async (c) => {
        try {
            return handleServiceResponse(c, await reportingService.listOrganizations(c.req.valid("query")));
        } catch (error) {
            return handleError("platform.routes", "listPlatformOrganizations", c, error);
        }
    });

    router.get("/owner-users", async (c) => {
        try {
            return handleServiceResponse(c, await ownerUserService.list());
        } catch (error) {
            return handleError("platform.routes", "listOwnerUsers", c, error);
        }
    });

    router.post("/owner-users", validateSchema("json", CreateOwnerUserSchema), async (c) => {
        try {
            return handleServiceResponse(c, await ownerUserService.create(c.req.valid("json")));
        } catch (error) {
            return handleError("platform.routes", "createOwnerUser", c, error);
        }
    });

    router.patch(
        "/owner-users/:ownerUserId/active-state",
        validateSchema("json", OwnerUserActiveStateSchema),
        async (c) => {
            try {
                const ownerUserId = ownerUserIdSchema.safeParse(c.req.param("ownerUserId"));
                if (!ownerUserId.success) {
                    return handleServiceResponse(c, {
                        status: "error",
                        message: "Invalid Owner User id",
                        data: null,
                        code: STATUS_CODES.BAD_REQUEST,
                    });
                }

                return handleServiceResponse(
                    c,
                    await ownerUserService.setActiveState(
                        c.get("authOwner").id,
                        ownerUserId.data,
                        c.req.valid("json"),
                    ),
                );
            } catch (error) {
                return handleError("platform.routes", "setOwnerUserActiveState", c, error);
            }
        },
    );

    return router;
};
