import { Hono } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";
import { z } from "zod";
import {
    CreateCommercialFeatureSchema,
    CreateCommercialModuleSchema,
    CreateCommercialPlanSchema,
    CreateOwnerUserSchema,
    CommercialFeatureListQuerySchema,
    CommercialModuleListQuerySchema,
    CommercialPlanListQuerySchema,
    OwnerLoginSchema,
    OwnerUserActiveStateSchema,
    PlatformDashboardQuerySchema,
    PlatformOrganizationDetailQuerySchema,
    PlatformOrganizationListQuerySchema,
    PlatformBillingInspectionQuerySchema,
    PlatformCatalogInspectionQuerySchema,
    PlatformCustomerInspectionQuerySchema,
    PlatformReportInspectionQuerySchema,
    PlatformBillActivityQuerySchema,
    PlatformTableInspectionQuerySchema,
    PlatformStoreInspectionQuerySchema,
    STATUS_CODES,
    UpdateCommercialFeatureDraftSchema,
    UpdateCommercialModuleDraftSchema,
    UpdateCommercialPlanDraftSchema,
    type PlatformEntryResponse,
} from "@repo/types";
import { handleError, handleServiceResponse } from "@/helpers/service.helper";
import { createOwnerAuthMiddleware, OWNER_AUTH_COOKIE } from "@/middlewares/owner-auth.middleware";
import { validateSchema } from "@/middlewares/validate";
import type { AppVariables } from "@/types/hono";
import { getCommercialCatalogService, type CommercialCatalogService } from "./commercial-catalog.service";
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
    commercialCatalogService: CommercialCatalogService = getCommercialCatalogService(),
) => {
    const router = new Hono<{ Variables: AppVariables }>();
    const ownerAuthMiddleware = createOwnerAuthMiddleware(authService);
    const ownerUserIdSchema = z.uuid("Invalid Owner User id");
    const featureIdSchema = z.uuid("Invalid Feature id");
    const revisionIdSchema = z.uuid("Invalid Feature revision id");
    const moduleIdSchema = z.uuid("Invalid Module id");
    const moduleRevisionIdSchema = z.uuid("Invalid Module revision id");
    const planIdSchema = z.uuid("Invalid Plan id");
    const planRevisionIdSchema = z.uuid("Invalid Plan revision id");

    const parseFeatureIds = (c: { req: { param: (name: string) => string } }) => {
        const featureId = featureIdSchema.safeParse(c.req.param("featureId"));
        const revisionId = revisionIdSchema.safeParse(c.req.param("revisionId"));
        return { featureId, revisionId };
    };

    const parseModuleIds = (c: { req: { param: (name: string) => string } }) => {
        const moduleId = moduleIdSchema.safeParse(c.req.param("moduleId"));
        const revisionId = moduleRevisionIdSchema.safeParse(c.req.param("revisionId"));
        return { moduleId, revisionId };
    };

    const parsePlanIds = (c: { req: { param: (name: string) => string } }) => {
        const planId = planIdSchema.safeParse(c.req.param("planId"));
        const revisionId = planRevisionIdSchema.safeParse(c.req.param("revisionId"));
        return { planId, revisionId };
    };

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

    router.get(
        "/organizations/:organizationId/bill-activity",
        validateSchema("query", PlatformBillActivityQuerySchema),
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
                    await reportingService.getOrganizationBillActivity(organizationId.data, c.req.valid("query")),
                );
            } catch (error) {
                return handleError("platform.routes", "getPlatformOrganizationBillActivity", c, error);
            }
        },
    );

    router.get(
        "/organizations/:organizationId/reports",
        validateSchema("query", PlatformReportInspectionQuerySchema),
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
                    await reportingService.getOrganizationReports(organizationId.data, c.req.valid("query")),
                );
            } catch (error) {
                return handleError("platform.routes", "getPlatformOrganizationReports", c, error);
            }
        },
    );

    router.get(
        "/organizations/:organizationId/tables",
        validateSchema("query", PlatformTableInspectionQuerySchema),
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
                    await reportingService.listOrganizationTables(organizationId.data, c.req.valid("query")),
                );
            } catch (error) {
                return handleError("platform.routes", "listPlatformOrganizationTables", c, error);
            }
        },
    );

    router.get("/organizations/:organizationId/tables/:tableId", async (c) => {
        try {
            const organizationId = z.uuid("Invalid organization id").safeParse(c.req.param("organizationId"));
            const tableId = z.uuid("Invalid table id").safeParse(c.req.param("tableId"));
            if (!organizationId.success) {
                return handleServiceResponse(c, {
                    status: "error",
                    message: "Invalid organization id",
                    data: null,
                    code: STATUS_CODES.BAD_REQUEST,
                });
            }
            if (!tableId.success) {
                return handleServiceResponse(c, {
                    status: "error",
                    message: "Invalid table id",
                    data: null,
                    code: STATUS_CODES.BAD_REQUEST,
                });
            }

            return handleServiceResponse(
                c,
                await reportingService.getOrganizationTable(organizationId.data, tableId.data),
            );
        } catch (error) {
            return handleError("platform.routes", "getPlatformOrganizationTable", c, error);
        }
    });

    router.get("/organizations/:organizationId/whatsapp", async (c) => {
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
                await reportingService.getOrganizationWhatsApp(organizationId.data),
            );
        } catch (error) {
            return handleError("platform.routes", "getPlatformOrganizationWhatsApp", c, error);
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

    router.get("/catalog/features", validateSchema("query", CommercialFeatureListQuerySchema), async (c) => {
        try {
            return handleServiceResponse(c, await commercialCatalogService.listFeatures(c.req.valid("query"), c.get("authOwner")));
        } catch (error) {
            return handleError("platform.routes", "listCommercialFeatures", c, error);
        }
    });

    router.post("/catalog/features", validateSchema("json", CreateCommercialFeatureSchema), async (c) => {
        try {
            return handleServiceResponse(
                c,
                await commercialCatalogService.createFeature(c.get("authOwner"), c.req.valid("json")),
            );
        } catch (error) {
            return handleError("platform.routes", "createCommercialFeature", c, error);
        }
    });

    router.get("/catalog/features/:featureId", async (c) => {
        try {
            const featureId = featureIdSchema.safeParse(c.req.param("featureId"));
            if (!featureId.success) {
                return handleServiceResponse(c, {
                    status: "error",
                    message: "Invalid Feature id",
                    data: null,
                    code: STATUS_CODES.BAD_REQUEST,
                });
            }
            return handleServiceResponse(c, await commercialCatalogService.getFeature(featureId.data, c.get("authOwner")));
        } catch (error) {
            return handleError("platform.routes", "getCommercialFeature", c, error);
        }
    });

    router.patch(
        "/catalog/features/:featureId/revisions/:revisionId",
        validateSchema("json", UpdateCommercialFeatureDraftSchema),
        async (c) => {
            try {
                const { featureId, revisionId } = parseFeatureIds(c);
                if (!featureId.success) {
                    return handleServiceResponse(c, {
                        status: "error",
                        message: "Invalid Feature id",
                        data: null,
                        code: STATUS_CODES.BAD_REQUEST,
                    });
                }
                if (!revisionId.success) {
                    return handleServiceResponse(c, {
                        status: "error",
                        message: "Invalid Feature revision id",
                        data: null,
                        code: STATUS_CODES.BAD_REQUEST,
                    });
                }
                return handleServiceResponse(
                    c,
                    await commercialCatalogService.updateDraft(featureId.data, revisionId.data, c.req.valid("json")),
                );
            } catch (error) {
                return handleError("platform.routes", "updateCommercialFeatureDraft", c, error);
            }
        },
    );

    router.post("/catalog/features/:featureId/revisions/:revisionId/publish", async (c) => {
        try {
            const { featureId, revisionId } = parseFeatureIds(c);
            if (!featureId.success || !revisionId.success) {
                return handleServiceResponse(c, {
                    status: "error",
                    message: !featureId.success ? "Invalid Feature id" : "Invalid Feature revision id",
                    data: null,
                    code: STATUS_CODES.BAD_REQUEST,
                });
            }
            return handleServiceResponse(
                c,
                await commercialCatalogService.publishRevision(c.get("authOwner"), featureId.data, revisionId.data),
            );
        } catch (error) {
            return handleError("platform.routes", "publishCommercialFeatureRevision", c, error);
        }
    });

    router.post("/catalog/features/:featureId/revisions/:revisionId/retire", async (c) => {
        try {
            const { featureId, revisionId } = parseFeatureIds(c);
            if (!featureId.success || !revisionId.success) {
                return handleServiceResponse(c, {
                    status: "error",
                    message: !featureId.success ? "Invalid Feature id" : "Invalid Feature revision id",
                    data: null,
                    code: STATUS_CODES.BAD_REQUEST,
                });
            }
            return handleServiceResponse(
                c,
                await commercialCatalogService.retireRevision(c.get("authOwner"), featureId.data, revisionId.data),
            );
        } catch (error) {
            return handleError("platform.routes", "retireCommercialFeatureRevision", c, error);
        }
    });

    router.post("/catalog/features/:featureId/revisions/:revisionId/discard", async (c) => {
        try {
            const { featureId, revisionId } = parseFeatureIds(c);
            if (!featureId.success || !revisionId.success) {
                return handleServiceResponse(c, {
                    status: "error",
                    message: !featureId.success ? "Invalid Feature id" : "Invalid Feature revision id",
                    data: null,
                    code: STATUS_CODES.BAD_REQUEST,
                });
            }
            return handleServiceResponse(
                c,
                await commercialCatalogService.discardRevision(c.get("authOwner"), featureId.data, revisionId.data),
            );
        } catch (error) {
            return handleError("platform.routes", "discardCommercialFeatureRevision", c, error);
        }
    });

    router.post("/catalog/features/:featureId/revisions/:revisionId/successor", async (c) => {
        try {
            const { featureId, revisionId } = parseFeatureIds(c);
            if (!featureId.success || !revisionId.success) {
                return handleServiceResponse(c, {
                    status: "error",
                    message: !featureId.success ? "Invalid Feature id" : "Invalid Feature revision id",
                    data: null,
                    code: STATUS_CODES.BAD_REQUEST,
                });
            }
            return handleServiceResponse(
                c,
                await commercialCatalogService.createSuccessor(c.get("authOwner"), featureId.data, revisionId.data),
            );
        } catch (error) {
            return handleError("platform.routes", "createCommercialFeatureSuccessor", c, error);
        }
    });

    router.get("/catalog/modules", validateSchema("query", CommercialModuleListQuerySchema), async (c) => {
        try {
            return handleServiceResponse(c, await commercialCatalogService.listModules(c.req.valid("query"), c.get("authOwner")));
        } catch (error) {
            return handleError("platform.routes", "listCommercialModules", c, error);
        }
    });

    router.post("/catalog/modules", validateSchema("json", CreateCommercialModuleSchema), async (c) => {
        try {
            return handleServiceResponse(
                c,
                await commercialCatalogService.createModule(c.get("authOwner"), c.req.valid("json")),
            );
        } catch (error) {
            return handleError("platform.routes", "createCommercialModule", c, error);
        }
    });

    router.get("/catalog/modules/:moduleId", async (c) => {
        try {
            const moduleId = moduleIdSchema.safeParse(c.req.param("moduleId"));
            if (!moduleId.success) {
                return handleServiceResponse(c, {
                    status: "error",
                    message: "Invalid Module id",
                    data: null,
                    code: STATUS_CODES.BAD_REQUEST,
                });
            }
            return handleServiceResponse(c, await commercialCatalogService.getModule(moduleId.data, c.get("authOwner")));
        } catch (error) {
            return handleError("platform.routes", "getCommercialModule", c, error);
        }
    });

    router.patch(
        "/catalog/modules/:moduleId/revisions/:revisionId",
        validateSchema("json", UpdateCommercialModuleDraftSchema),
        async (c) => {
            try {
                const { moduleId, revisionId } = parseModuleIds(c);
                if (!moduleId.success) {
                    return handleServiceResponse(c, {
                        status: "error",
                        message: "Invalid Module id",
                        data: null,
                        code: STATUS_CODES.BAD_REQUEST,
                    });
                }
                if (!revisionId.success) {
                    return handleServiceResponse(c, {
                        status: "error",
                        message: "Invalid Module revision id",
                        data: null,
                        code: STATUS_CODES.BAD_REQUEST,
                    });
                }
                return handleServiceResponse(
                    c,
                    await commercialCatalogService.updateModuleDraft(moduleId.data, revisionId.data, c.req.valid("json")),
                );
            } catch (error) {
                return handleError("platform.routes", "updateCommercialModuleDraft", c, error);
            }
        },
    );

    router.post("/catalog/modules/:moduleId/revisions/:revisionId/publish", async (c) => {
        try {
            const { moduleId, revisionId } = parseModuleIds(c);
            if (!moduleId.success || !revisionId.success) {
                return handleServiceResponse(c, {
                    status: "error",
                    message: !moduleId.success ? "Invalid Module id" : "Invalid Module revision id",
                    data: null,
                    code: STATUS_CODES.BAD_REQUEST,
                });
            }
            return handleServiceResponse(
                c,
                await commercialCatalogService.publishModuleRevision(c.get("authOwner"), moduleId.data, revisionId.data),
            );
        } catch (error) {
            return handleError("platform.routes", "publishCommercialModuleRevision", c, error);
        }
    });

    router.post("/catalog/modules/:moduleId/revisions/:revisionId/retire", async (c) => {
        try {
            const { moduleId, revisionId } = parseModuleIds(c);
            if (!moduleId.success || !revisionId.success) {
                return handleServiceResponse(c, {
                    status: "error",
                    message: !moduleId.success ? "Invalid Module id" : "Invalid Module revision id",
                    data: null,
                    code: STATUS_CODES.BAD_REQUEST,
                });
            }
            return handleServiceResponse(
                c,
                await commercialCatalogService.retireModuleRevision(c.get("authOwner"), moduleId.data, revisionId.data),
            );
        } catch (error) {
            return handleError("platform.routes", "retireCommercialModuleRevision", c, error);
        }
    });

    router.post("/catalog/modules/:moduleId/revisions/:revisionId/discard", async (c) => {
        try {
            const { moduleId, revisionId } = parseModuleIds(c);
            if (!moduleId.success || !revisionId.success) {
                return handleServiceResponse(c, {
                    status: "error",
                    message: !moduleId.success ? "Invalid Module id" : "Invalid Module revision id",
                    data: null,
                    code: STATUS_CODES.BAD_REQUEST,
                });
            }
            return handleServiceResponse(
                c,
                await commercialCatalogService.discardModuleRevision(c.get("authOwner"), moduleId.data, revisionId.data),
            );
        } catch (error) {
            return handleError("platform.routes", "discardCommercialModuleRevision", c, error);
        }
    });

    router.post("/catalog/modules/:moduleId/revisions/:revisionId/successor", async (c) => {
        try {
            const { moduleId, revisionId } = parseModuleIds(c);
            if (!moduleId.success || !revisionId.success) {
                return handleServiceResponse(c, {
                    status: "error",
                    message: !moduleId.success ? "Invalid Module id" : "Invalid Module revision id",
                    data: null,
                    code: STATUS_CODES.BAD_REQUEST,
                });
            }
            return handleServiceResponse(
                c,
                await commercialCatalogService.createModuleSuccessor(c.get("authOwner"), moduleId.data, revisionId.data),
            );
        } catch (error) {
            return handleError("platform.routes", "createCommercialModuleSuccessor", c, error);
        }
    });

    router.get("/catalog/plans", validateSchema("query", CommercialPlanListQuerySchema), async (c) => {
        try {
            return handleServiceResponse(c, await commercialCatalogService.listPlans(c.req.valid("query"), c.get("authOwner")));
        } catch (error) {
            return handleError("platform.routes", "listCommercialPlans", c, error);
        }
    });

    router.post("/catalog/plans", validateSchema("json", CreateCommercialPlanSchema), async (c) => {
        try {
            return handleServiceResponse(
                c,
                await commercialCatalogService.createPlan(c.get("authOwner"), c.req.valid("json")),
            );
        } catch (error) {
            return handleError("platform.routes", "createCommercialPlan", c, error);
        }
    });

    router.get("/catalog/plans/:planId", async (c) => {
        try {
            const planId = planIdSchema.safeParse(c.req.param("planId"));
            if (!planId.success) {
                return handleServiceResponse(c, {
                    status: "error",
                    message: "Invalid Plan id",
                    data: null,
                    code: STATUS_CODES.BAD_REQUEST,
                });
            }
            return handleServiceResponse(c, await commercialCatalogService.getPlan(planId.data, c.get("authOwner")));
        } catch (error) {
            return handleError("platform.routes", "getCommercialPlan", c, error);
        }
    });

    router.patch(
        "/catalog/plans/:planId/revisions/:revisionId",
        validateSchema("json", UpdateCommercialPlanDraftSchema),
        async (c) => {
            try {
                const { planId, revisionId } = parsePlanIds(c);
                if (!planId.success) {
                    return handleServiceResponse(c, {
                        status: "error",
                        message: "Invalid Plan id",
                        data: null,
                        code: STATUS_CODES.BAD_REQUEST,
                    });
                }
                if (!revisionId.success) {
                    return handleServiceResponse(c, {
                        status: "error",
                        message: "Invalid Plan revision id",
                        data: null,
                        code: STATUS_CODES.BAD_REQUEST,
                    });
                }
                return handleServiceResponse(
                    c,
                    await commercialCatalogService.updatePlanDraft(planId.data, revisionId.data, c.req.valid("json")),
                );
            } catch (error) {
                return handleError("platform.routes", "updateCommercialPlanDraft", c, error);
            }
        },
    );

    router.post("/catalog/plans/:planId/revisions/:revisionId/publish", async (c) => {
        try {
            const { planId, revisionId } = parsePlanIds(c);
            if (!planId.success || !revisionId.success) {
                return handleServiceResponse(c, {
                    status: "error",
                    message: !planId.success ? "Invalid Plan id" : "Invalid Plan revision id",
                    data: null,
                    code: STATUS_CODES.BAD_REQUEST,
                });
            }
            return handleServiceResponse(
                c,
                await commercialCatalogService.publishPlanRevision(c.get("authOwner"), planId.data, revisionId.data),
            );
        } catch (error) {
            return handleError("platform.routes", "publishCommercialPlanRevision", c, error);
        }
    });

    router.post("/catalog/plans/:planId/revisions/:revisionId/retire", async (c) => {
        try {
            const { planId, revisionId } = parsePlanIds(c);
            if (!planId.success || !revisionId.success) {
                return handleServiceResponse(c, {
                    status: "error",
                    message: !planId.success ? "Invalid Plan id" : "Invalid Plan revision id",
                    data: null,
                    code: STATUS_CODES.BAD_REQUEST,
                });
            }
            return handleServiceResponse(
                c,
                await commercialCatalogService.retirePlanRevision(c.get("authOwner"), planId.data, revisionId.data),
            );
        } catch (error) {
            return handleError("platform.routes", "retireCommercialPlanRevision", c, error);
        }
    });

    router.post("/catalog/plans/:planId/revisions/:revisionId/discard", async (c) => {
        try {
            const { planId, revisionId } = parsePlanIds(c);
            if (!planId.success || !revisionId.success) {
                return handleServiceResponse(c, {
                    status: "error",
                    message: !planId.success ? "Invalid Plan id" : "Invalid Plan revision id",
                    data: null,
                    code: STATUS_CODES.BAD_REQUEST,
                });
            }
            return handleServiceResponse(
                c,
                await commercialCatalogService.discardPlanRevision(c.get("authOwner"), planId.data, revisionId.data),
            );
        } catch (error) {
            return handleError("platform.routes", "discardCommercialPlanRevision", c, error);
        }
    });

    router.post("/catalog/plans/:planId/revisions/:revisionId/successor", async (c) => {
        try {
            const { planId, revisionId } = parsePlanIds(c);
            if (!planId.success || !revisionId.success) {
                return handleServiceResponse(c, {
                    status: "error",
                    message: !planId.success ? "Invalid Plan id" : "Invalid Plan revision id",
                    data: null,
                    code: STATUS_CODES.BAD_REQUEST,
                });
            }
            return handleServiceResponse(
                c,
                await commercialCatalogService.createPlanSuccessor(c.get("authOwner"), planId.data, revisionId.data),
            );
        } catch (error) {
            return handleError("platform.routes", "createCommercialPlanSuccessor", c, error);
        }
    });

    return router;
};
