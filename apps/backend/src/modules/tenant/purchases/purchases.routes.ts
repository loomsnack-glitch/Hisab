import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import { z } from "zod";
import { CreateDraftPurchaseSchema, CreateOutgoingPaymentSchema, RecordPurchaseSchema, ReverseOutgoingPaymentSchema, STATUS_CODES, UpdateDraftPurchaseSchema, VoidPurchaseSchema } from "@repo/types";
import { handleError, handleServiceResponse } from "@/helpers/service.helper";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { validateSchema } from "@/middlewares/validate";
import type { AppVariables } from "@/types/hono";
import * as purchasesService from "./purchases.service";

const FILE_NAME = "purchases.routes";
const uuidSchema = z.uuid("Invalid id");

const validateUuidParam = (value: string, message: string) => {
    const result = uuidSchema.safeParse(value);
    if (!result.success) {
        return {
            status: "error" as const,
            message,
            code: STATUS_CODES.BAD_REQUEST,
        };
    }
    return null;
};

export const createPurchasesRoutes = (
    authenticate: MiddlewareHandler<{ Variables: AppVariables }> = authMiddleware,
) => {
    const router = new Hono<{ Variables: AppVariables }>();
    router.use("*", authenticate);

    router.get("/:organizationId/purchases", async (c) => {
        try {
            const organizationId = c.req.param("organizationId");
            const invalidOrganizationId = validateUuidParam(organizationId, "Invalid organization id");
            if (invalidOrganizationId) {
                return c.json(invalidOrganizationId, invalidOrganizationId.code);
            }

            const serviceResponse = await purchasesService.getPurchases(
                c.get("authUser").id,
                organizationId,
            );
            return handleServiceResponse(c, serviceResponse);
        } catch (error) {
            return handleError(FILE_NAME, "getPurchases", c, error);
        }
    });

    router.post(
        "/:organizationId/purchases",
        validateSchema("json", CreateDraftPurchaseSchema),
        async (c) => {
            try {
                const organizationId = c.req.param("organizationId");
                const invalidOrganizationId = validateUuidParam(
                    organizationId,
                    "Invalid organization id",
                );
                if (invalidOrganizationId) {
                    return c.json(invalidOrganizationId, invalidOrganizationId.code);
                }

                const serviceResponse = await purchasesService.createDraftPurchase(
                    c.get("authUser").id,
                    organizationId,
                    c.req.valid("json"),
                );
                return handleServiceResponse(c, serviceResponse);
            } catch (error) {
                return handleError(FILE_NAME, "createDraftPurchase", c, error);
            }
        },
    );

    router.get("/:organizationId/purchases/:purchaseId", async (c) => {
        try {
            const organizationId = c.req.param("organizationId");
            const purchaseId = c.req.param("purchaseId");
            const invalidOrganizationId = validateUuidParam(organizationId, "Invalid organization id");
            if (invalidOrganizationId) {
                return c.json(invalidOrganizationId, invalidOrganizationId.code);
            }
            const invalidPurchaseId = validateUuidParam(purchaseId, "Invalid purchase id");
            if (invalidPurchaseId) {
                return c.json(invalidPurchaseId, invalidPurchaseId.code);
            }

            const serviceResponse = await purchasesService.getPurchaseDetails(
                c.get("authUser").id,
                organizationId,
                purchaseId,
            );
            return handleServiceResponse(c, serviceResponse);
        } catch (error) {
            return handleError(FILE_NAME, "getPurchaseDetails", c, error);
        }
    });

    router.patch(
        "/:organizationId/purchases/:purchaseId",
        validateSchema("json", UpdateDraftPurchaseSchema),
        async (c) => {
            try {
                const organizationId = c.req.param("organizationId");
                const purchaseId = c.req.param("purchaseId");
                const invalidOrganizationId = validateUuidParam(
                    organizationId,
                    "Invalid organization id",
                );
                if (invalidOrganizationId) {
                    return c.json(invalidOrganizationId, invalidOrganizationId.code);
                }
                const invalidPurchaseId = validateUuidParam(purchaseId, "Invalid purchase id");
                if (invalidPurchaseId) {
                    return c.json(invalidPurchaseId, invalidPurchaseId.code);
                }

                const serviceResponse = await purchasesService.updateDraftPurchase(
                    c.get("authUser").id,
                    organizationId,
                    purchaseId,
                    c.req.valid("json"),
                );
                return handleServiceResponse(c, serviceResponse);
            } catch (error) {
                return handleError(FILE_NAME, "updateDraftPurchase", c, error);
            }
        },
    );

    router.delete("/:organizationId/purchases/:purchaseId", async (c) => {
        try {
            const organizationId = c.req.param("organizationId");
            const purchaseId = c.req.param("purchaseId");
            const invalidOrganizationId = validateUuidParam(organizationId, "Invalid organization id");
            if (invalidOrganizationId) {
                return c.json(invalidOrganizationId, invalidOrganizationId.code);
            }
            const invalidPurchaseId = validateUuidParam(purchaseId, "Invalid purchase id");
            if (invalidPurchaseId) {
                return c.json(invalidPurchaseId, invalidPurchaseId.code);
            }

            const serviceResponse = await purchasesService.discardDraftPurchase(
                c.get("authUser").id,
                organizationId,
                purchaseId,
            );
            return handleServiceResponse(c, serviceResponse);
        } catch (error) {
            return handleError(FILE_NAME, "discardDraftPurchase", c, error);
        }
    });

    router.post("/:organizationId/purchases/:purchaseId/record", async (c) => {
        try {
            const organizationId = c.req.param("organizationId");
            const purchaseId = c.req.param("purchaseId");
            const invalidOrganizationId = validateUuidParam(organizationId, "Invalid organization id");
            if (invalidOrganizationId) {
                return c.json(invalidOrganizationId, invalidOrganizationId.code);
            }
            const invalidPurchaseId = validateUuidParam(purchaseId, "Invalid purchase id");
            if (invalidPurchaseId) {
                return c.json(invalidPurchaseId, invalidPurchaseId.code);
            }

            let recordBody: unknown = {};
            try {
                recordBody = await c.req.json();
            } catch {
                recordBody = {};
            }
            const parsed = RecordPurchaseSchema.safeParse(recordBody ?? {});
            if (!parsed.success) {
                return c.json(
                    {
                        status: "error",
                        message: "Validation error",
                        code: STATUS_CODES.BAD_REQUEST,
                        errors: parsed.error.issues,
                    },
                    STATUS_CODES.BAD_REQUEST,
                );
            }

            const serviceResponse = await purchasesService.recordPurchase(
                c.get("authUser").id,
                organizationId,
                purchaseId,
                parsed.data,
            );
            return handleServiceResponse(c, serviceResponse);
        } catch (error) {
            return handleError(FILE_NAME, "recordPurchase", c, error);
        }
    });

    router.post(
        "/:organizationId/purchases/:purchaseId/payments",
        validateSchema("json", CreateOutgoingPaymentSchema),
        async (c) => {
            try {
                const organizationId = c.req.param("organizationId");
                const purchaseId = c.req.param("purchaseId");
                const invalidOrganizationId = validateUuidParam(
                    organizationId,
                    "Invalid organization id",
                );
                if (invalidOrganizationId) {
                    return c.json(invalidOrganizationId, invalidOrganizationId.code);
                }
                const invalidPurchaseId = validateUuidParam(purchaseId, "Invalid purchase id");
                if (invalidPurchaseId) {
                    return c.json(invalidPurchaseId, invalidPurchaseId.code);
                }

                const serviceResponse = await purchasesService.createOutgoingPurchasePayment(
                    c.get("authUser").id,
                    organizationId,
                    purchaseId,
                    c.req.valid("json"),
                );
                return handleServiceResponse(c, serviceResponse);
            } catch (error) {
                return handleError(FILE_NAME, "createOutgoingPurchasePayment", c, error);
            }
        },
    );

    router.post(
        "/:organizationId/purchases/:purchaseId/payments/:paymentId/reverse",
        validateSchema("json", ReverseOutgoingPaymentSchema),
        async (c) => {
            try {
                const organizationId = c.req.param("organizationId");
                const purchaseId = c.req.param("purchaseId");
                const paymentId = c.req.param("paymentId");
                const invalidOrganizationId = validateUuidParam(
                    organizationId,
                    "Invalid organization id",
                );
                if (invalidOrganizationId) {
                    return c.json(invalidOrganizationId, invalidOrganizationId.code);
                }
                const invalidPurchaseId = validateUuidParam(purchaseId, "Invalid purchase id");
                if (invalidPurchaseId) {
                    return c.json(invalidPurchaseId, invalidPurchaseId.code);
                }
                const invalidPaymentId = validateUuidParam(paymentId, "Invalid outgoing payment id");
                if (invalidPaymentId) {
                    return c.json(invalidPaymentId, invalidPaymentId.code);
                }

                const serviceResponse = await purchasesService.reverseOutgoingPurchasePayment(
                    c.get("authUser").id,
                    organizationId,
                    purchaseId,
                    paymentId,
                    c.req.valid("json"),
                );
                return handleServiceResponse(c, serviceResponse);
            } catch (error) {
                return handleError(FILE_NAME, "reverseOutgoingPurchasePayment", c, error);
            }
        },
    );

    router.post(
        "/:organizationId/purchases/:purchaseId/void",
        validateSchema("json", VoidPurchaseSchema),
        async (c) => {
            try {
                const organizationId = c.req.param("organizationId");
                const purchaseId = c.req.param("purchaseId");
                const invalidOrganizationId = validateUuidParam(
                    organizationId,
                    "Invalid organization id",
                );
                if (invalidOrganizationId) {
                    return c.json(invalidOrganizationId, invalidOrganizationId.code);
                }
                const invalidPurchaseId = validateUuidParam(purchaseId, "Invalid purchase id");
                if (invalidPurchaseId) {
                    return c.json(invalidPurchaseId, invalidPurchaseId.code);
                }

                const serviceResponse = await purchasesService.voidPurchase(
                    c.get("authUser").id,
                    organizationId,
                    purchaseId,
                    c.req.valid("json"),
                );
                return handleServiceResponse(c, serviceResponse);
            } catch (error) {
                return handleError(FILE_NAME, "voidPurchase", c, error);
            }
        },
    );

    return router;
};

export default createPurchasesRoutes();
