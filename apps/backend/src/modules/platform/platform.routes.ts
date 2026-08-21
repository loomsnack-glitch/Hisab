import { Hono } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";
import { z } from "zod";
import {
    CreateOwnerUserSchema,
    OwnerLoginSchema,
    OwnerUserActiveStateSchema,
    PlatformDashboardQuerySchema,
    PlatformOrganizationDetailQuerySchema,
    PlatformOrganizationListQuerySchema,
    PlatformBillingInspectionQuerySchema,
    PlatformCatalogInspectionQuerySchema,
    PlatformCustomerInspectionQuerySchema,
    PlatformStoreInspectionQuerySchema,
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
            message: "Ganatri Console ready",
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

    router.get(
        "/organizations/:organizationId",
        validateSchema("query", PlatformOrganizationDetailQuerySchema),
        async (c) => {
            try {
                const organizationId = z.uuid("Invalid organization id").safeParse(c.req.param("organizationId"));
                if (!organizationId.success) {
                    return handleServiceResponse(c, {
                        status: "error",
                        message: "Invalid organization id",
                        data: null,
                        code: STATUS_CODES.BAD_REQUEST,
                    });
                }

                return handleServiceResponse(
                    c,
                    await reportingService.getOrganization(organizationId.data, c.req.valid("query")),
                );
            } catch (error) {
                return handleError("platform.routes", "getPlatformOrganization", c, error);
            }
        },
    );

    router.get(
        "/organizations/:organizationId/stores",
        validateSchema("query", PlatformStoreInspectionQuerySchema),
        async (c) => {
            try {
                const organizationId = z.uuid("Invalid organization id").safeParse(c.req.param("organizationId"));
                if (!organizationId.success) {
                    return handleServiceResponse(c, {
                        status: "error",
                        message: "Invalid organization id",
                        data: null,
                        code: STATUS_CODES.BAD_REQUEST,
                    });
                }

                return handleServiceResponse(
                    c,
                    await reportingService.listOrganizationStores(organizationId.data, c.req.valid("query")),
                );
            } catch (error) {
                return handleError("platform.routes", "listPlatformOrganizationStores", c, error);
            }
        },
    );

    router.get(
        "/organizations/:organizationId/stores/:storeId",
        validateSchema("query", PlatformStoreInspectionQuerySchema),
        async (c) => {
            try {
                const organizationId = z.uuid("Invalid organization id").safeParse(c.req.param("organizationId"));
                const storeId = z.uuid("Invalid store id").safeParse(c.req.param("storeId"));
                if (!organizationId.success) {
                    return handleServiceResponse(c, {
                        status: "error",
                        message: "Invalid organization id",
                        data: null,
                        code: STATUS_CODES.BAD_REQUEST,
                    });
                }
                if (!storeId.success) {
                    return handleServiceResponse(c, {
                        status: "error",
                        message: "Invalid store id",
                        data: null,
                        code: STATUS_CODES.BAD_REQUEST,
                    });
                }

                return handleServiceResponse(
                    c,
                    await reportingService.getStore(organizationId.data, storeId.data, c.req.valid("query")),
                );
            } catch (error) {
                return handleError("platform.routes", "getPlatformStore", c, error);
            }
        },
    );

    router.get(
        "/organizations/:organizationId/catalog",
        validateSchema("query", PlatformCatalogInspectionQuerySchema),
        async (c) => {
            try {
                const organizationId = z.uuid("Invalid organization id").safeParse(c.req.param("organizationId"));
                if (!organizationId.success) {
                    return handleServiceResponse(c, {
                        status: "error",
                        message: "Invalid organization id",
                        data: null,
                        code: STATUS_CODES.BAD_REQUEST,
                    });
                }

                return handleServiceResponse(
                    c,
                    await reportingService.listOrganizationCatalog(organizationId.data, c.req.valid("query")),
                );
            } catch (error) {
                return handleError("platform.routes", "listPlatformOrganizationCatalog", c, error);
            }
        },
    );

    router.get("/organizations/:organizationId/catalog/products/:productId", async (c) => {
        try {
            const organizationId = z.uuid("Invalid organization id").safeParse(c.req.param("organizationId"));
            const productId = z.uuid("Invalid product id").safeParse(c.req.param("productId"));
            if (!organizationId.success) {
                return handleServiceResponse(c, {
                    status: "error",
                    message: "Invalid organization id",
                    data: null,
                    code: STATUS_CODES.BAD_REQUEST,
                });
            }
            if (!productId.success) {
                return handleServiceResponse(c, {
                    status: "error",
                    message: "Invalid product id",
                    data: null,
                    code: STATUS_CODES.BAD_REQUEST,
                });
            }

            return handleServiceResponse(
                c,
                await reportingService.getOrganizationCatalogProduct(organizationId.data, productId.data),
            );
        } catch (error) {
            return handleError("platform.routes", "getPlatformOrganizationCatalogProduct", c, error);
        }
    });

    router.get("/organizations/:organizationId/catalog/categories/:categoryId", async (c) => {
        try {
            const organizationId = z.uuid("Invalid organization id").safeParse(c.req.param("organizationId"));
            const categoryId = z.uuid("Invalid category id").safeParse(c.req.param("categoryId"));
            if (!organizationId.success) {
                return handleServiceResponse(c, {
                    status: "error",
                    message: "Invalid organization id",
                    data: null,
                    code: STATUS_CODES.BAD_REQUEST,
                });
            }
            if (!categoryId.success) {
                return handleServiceResponse(c, {
                    status: "error",
                    message: "Invalid category id",
                    data: null,
                    code: STATUS_CODES.BAD_REQUEST,
                });
            }

            return handleServiceResponse(
                c,
                await reportingService.getOrganizationCatalogCategory(organizationId.data, categoryId.data),
            );
        } catch (error) {
            return handleError("platform.routes", "getPlatformOrganizationCatalogCategory", c, error);
        }
    });

    router.get("/organizations/:organizationId/catalog/add-ons/:addOnId", async (c) => {
        try {
            const organizationId = z.uuid("Invalid organization id").safeParse(c.req.param("organizationId"));
            const addOnId = z.uuid("Invalid add-on id").safeParse(c.req.param("addOnId"));
            if (!organizationId.success) {
                return handleServiceResponse(c, {
                    status: "error",
                    message: "Invalid organization id",
                    data: null,
                    code: STATUS_CODES.BAD_REQUEST,
                });
            }
            if (!addOnId.success) {
                return handleServiceResponse(c, {
                    status: "error",
                    message: "Invalid add-on id",
                    data: null,
                    code: STATUS_CODES.BAD_REQUEST,
                });
            }

            return handleServiceResponse(
                c,
                await reportingService.getOrganizationCatalogAddOn(organizationId.data, addOnId.data),
            );
        } catch (error) {
            return handleError("platform.routes", "getPlatformOrganizationCatalogAddOn", c, error);
        }
    });

    router.get(
        "/organizations/:organizationId/sales",
        validateSchema("query", PlatformBillingInspectionQuerySchema),
        async (c) => {
            try {
                const organizationId = z.uuid("Invalid organization id").safeParse(c.req.param("organizationId"));
                if (!organizationId.success) {
                    return handleServiceResponse(c, {
                        status: "error",
                        message: "Invalid organization id",
                        data: null,
                        code: STATUS_CODES.BAD_REQUEST,
                    });
                }

                return handleServiceResponse(
                    c,
                    await reportingService.listOrganizationSales(organizationId.data, c.req.valid("query")),
                );
            } catch (error) {
                return handleError("platform.routes", "listPlatformOrganizationSales", c, error);
            }
        },
    );

    router.get("/organizations/:organizationId/sales/:saleId", async (c) => {
        try {
            const organizationId = z.uuid("Invalid organization id").safeParse(c.req.param("organizationId"));
            const saleId = z.uuid("Invalid sale id").safeParse(c.req.param("saleId"));
            if (!organizationId.success) {
                return handleServiceResponse(c, {
                    status: "error",
                    message: "Invalid organization id",
                    data: null,
                    code: STATUS_CODES.BAD_REQUEST,
                });
            }
            if (!saleId.success) {
                return handleServiceResponse(c, {
                    status: "error",
                    message: "Invalid sale id",
                    data: null,
                    code: STATUS_CODES.BAD_REQUEST,
                });
            }

            return handleServiceResponse(
                c,
                await reportingService.getOrganizationSale(organizationId.data, saleId.data),
            );
        } catch (error) {
            return handleError("platform.routes", "getPlatformOrganizationSale", c, error);
        }
    });

    router.get(
        "/organizations/:organizationId/customers",
        validateSchema("query", PlatformCustomerInspectionQuerySchema),
        async (c) => {
            try {
                const organizationId = z.uuid("Invalid organization id").safeParse(c.req.param("organizationId"));
                if (!organizationId.success) {
                    return handleServiceResponse(c, {
                        status: "error",
                        message: "Invalid organization id",
                        data: null,
                        code: STATUS_CODES.BAD_REQUEST,
                    });
                }

                return handleServiceResponse(
                    c,
                    await reportingService.listOrganizationCustomers(organizationId.data, c.req.valid("query")),
                );
            } catch (error) {
                return handleError("platform.routes", "listPlatformOrganizationCustomers", c, error);
            }
        },
    );

    router.get("/organizations/:organizationId/customers/:customerId", async (c) => {
        try {
            const organizationId = z.uuid("Invalid organization id").safeParse(c.req.param("organizationId"));
            const customerId = z.uuid("Invalid customer id").safeParse(c.req.param("customerId"));
            if (!organizationId.success) {
                return handleServiceResponse(c, {
                    status: "error",
                    message: "Invalid organization id",
                    data: null,
                    code: STATUS_CODES.BAD_REQUEST,
                });
            }
            if (!customerId.success) {
                return handleServiceResponse(c, {
                    status: "error",
                    message: "Invalid customer id",
                    data: null,
                    code: STATUS_CODES.BAD_REQUEST,
                });
            }

            return handleServiceResponse(
                c,
                await reportingService.getOrganizationCustomer(organizationId.data, customerId.data),
            );
        } catch (error) {
            return handleError("platform.routes", "getPlatformOrganizationCustomer", c, error);
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
