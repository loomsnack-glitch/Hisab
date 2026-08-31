import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import { z } from "zod";
import { CreateMoneyAccountSchema, MoneyAccountHistoryQuerySchema, MoneyAccountPaymentRouteMethodSchema, RecordBalanceAdjustmentSchema, RecordManualMoneyMovementSchema, RecordMoneyAccountTransferSchema, STATUS_CODES, UpdateMoneyAccountSchema, UpsertMoneyAccountPaymentRouteSchema } from "@repo/types";
import { handleError, handleServiceResponse } from "@/helpers/service.helper";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { validateSchema } from "@/middlewares/validate";
import type { AppVariables } from "@/types/hono";
import * as moneyAccountsService from "./money-accounts.service";

const FILE_NAME = "money-accounts.routes";
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

export const createMoneyAccountsRoutes = (
    authenticate: MiddlewareHandler<{ Variables: AppVariables }> = authMiddleware,
) => {
    const router = new Hono<{ Variables: AppVariables }>();
    router.use("*", authenticate);

    router.get("/:organizationId/money-accounts", async (c) => {
        try {
            const organizationId = c.req.param("organizationId");
            const invalidOrganizationId = validateUuidParam(organizationId, "Invalid organization id");
            if (invalidOrganizationId) {
                return c.json(invalidOrganizationId, invalidOrganizationId.code);
            }

            const serviceResponse = await moneyAccountsService.getMoneyAccounts(
                c.get("authUser").id,
                organizationId,
            );
            return handleServiceResponse(c, serviceResponse);
        } catch (error) {
            return handleError(FILE_NAME, "getMoneyAccounts", c, error);
        }
    });

    router.post(
        "/:organizationId/money-accounts",
        validateSchema("json", CreateMoneyAccountSchema),
        async (c) => {
            try {
                const organizationId = c.req.param("organizationId");
                const invalidOrganizationId = validateUuidParam(organizationId, "Invalid organization id");
                if (invalidOrganizationId) {
                    return c.json(invalidOrganizationId, invalidOrganizationId.code);
                }

                const serviceResponse = await moneyAccountsService.createMoneyAccount(
                    c.get("authUser").id,
                    organizationId,
                    c.req.valid("json"),
                );
                return handleServiceResponse(c, serviceResponse);
            } catch (error) {
                return handleError(FILE_NAME, "createMoneyAccount", c, error);
            }
        },
    );

    router.get("/:organizationId/money-accounts/:moneyAccountId", async (c) => {
        try {
            const organizationId = c.req.param("organizationId");
            const moneyAccountId = c.req.param("moneyAccountId");
            const invalidOrganizationId = validateUuidParam(organizationId, "Invalid organization id");
            if (invalidOrganizationId) {
                return c.json(invalidOrganizationId, invalidOrganizationId.code);
            }
            const invalidMoneyAccountId = validateUuidParam(moneyAccountId, "Invalid money account id");
            if (invalidMoneyAccountId) {
                return c.json(invalidMoneyAccountId, invalidMoneyAccountId.code);
            }

            const serviceResponse = await moneyAccountsService.getMoneyAccountDetails(
                c.get("authUser").id,
                organizationId,
                moneyAccountId,
            );
            return handleServiceResponse(c, serviceResponse);
        } catch (error) {
            return handleError(FILE_NAME, "getMoneyAccountDetails", c, error);
        }
    });

    router.patch(
        "/:organizationId/money-accounts/:moneyAccountId",
        validateSchema("json", UpdateMoneyAccountSchema),
        async (c) => {
            try {
                const organizationId = c.req.param("organizationId");
                const moneyAccountId = c.req.param("moneyAccountId");
                const invalidOrganizationId = validateUuidParam(organizationId, "Invalid organization id");
                if (invalidOrganizationId) {
                    return c.json(invalidOrganizationId, invalidOrganizationId.code);
                }
                const invalidMoneyAccountId = validateUuidParam(moneyAccountId, "Invalid money account id");
                if (invalidMoneyAccountId) {
                    return c.json(invalidMoneyAccountId, invalidMoneyAccountId.code);
                }

                const serviceResponse = await moneyAccountsService.updateMoneyAccount(
                    c.get("authUser").id,
                    organizationId,
                    moneyAccountId,
                    c.req.valid("json"),
                );
                return handleServiceResponse(c, serviceResponse);
            } catch (error) {
                return handleError(FILE_NAME, "updateMoneyAccount", c, error);
            }
        },
    );

    router.get(
        "/:organizationId/money-accounts/:moneyAccountId/history",
        validateSchema("query", MoneyAccountHistoryQuerySchema),
        async (c) => {
        try {
            const organizationId = c.req.param("organizationId");
            const moneyAccountId = c.req.param("moneyAccountId");
            const invalidOrganizationId = validateUuidParam(organizationId, "Invalid organization id");
            if (invalidOrganizationId) {
                return c.json(invalidOrganizationId, invalidOrganizationId.code);
            }
            const invalidMoneyAccountId = validateUuidParam(moneyAccountId, "Invalid money account id");
            if (invalidMoneyAccountId) {
                return c.json(invalidMoneyAccountId, invalidMoneyAccountId.code);
            }

            const serviceResponse = await moneyAccountsService.getMoneyAccountHistory(
                c.get("authUser").id,
                organizationId,
                moneyAccountId,
                c.req.valid("query"),
            );
            return handleServiceResponse(c, serviceResponse);
        } catch (error) {
            return handleError(FILE_NAME, "getMoneyAccountHistory", c, error);
        }
    },
    );

    router.post(
        "/:organizationId/money-accounts/:moneyAccountId/deposits",
        validateSchema("json", RecordManualMoneyMovementSchema),
        async (c) => {
            try {
                const organizationId = c.req.param("organizationId");
                const moneyAccountId = c.req.param("moneyAccountId");
                const invalidOrganizationId = validateUuidParam(organizationId, "Invalid organization id");
                if (invalidOrganizationId) {
                    return c.json(invalidOrganizationId, invalidOrganizationId.code);
                }
                const invalidMoneyAccountId = validateUuidParam(moneyAccountId, "Invalid money account id");
                if (invalidMoneyAccountId) {
                    return c.json(invalidMoneyAccountId, invalidMoneyAccountId.code);
                }

                const serviceResponse = await moneyAccountsService.recordMoneyAccountDeposit(
                    c.get("authUser").id,
                    organizationId,
                    moneyAccountId,
                    c.req.valid("json"),
                );
                return handleServiceResponse(c, serviceResponse);
            } catch (error) {
                return handleError(FILE_NAME, "recordMoneyAccountDeposit", c, error);
            }
        },
    );

    router.post(
        "/:organizationId/money-accounts/:moneyAccountId/withdrawals",
        validateSchema("json", RecordManualMoneyMovementSchema),
        async (c) => {
            try {
                const organizationId = c.req.param("organizationId");
                const moneyAccountId = c.req.param("moneyAccountId");
                const invalidOrganizationId = validateUuidParam(organizationId, "Invalid organization id");
                if (invalidOrganizationId) {
                    return c.json(invalidOrganizationId, invalidOrganizationId.code);
                }
                const invalidMoneyAccountId = validateUuidParam(moneyAccountId, "Invalid money account id");
                if (invalidMoneyAccountId) {
                    return c.json(invalidMoneyAccountId, invalidMoneyAccountId.code);
                }

                const serviceResponse = await moneyAccountsService.recordMoneyAccountWithdrawal(
                    c.get("authUser").id,
                    organizationId,
                    moneyAccountId,
                    c.req.valid("json"),
                );
                return handleServiceResponse(c, serviceResponse);
            } catch (error) {
                return handleError(FILE_NAME, "recordMoneyAccountWithdrawal", c, error);
            }
        },
    );

    router.post(
        "/:organizationId/money-accounts/:moneyAccountId/balance-adjustments",
        validateSchema("json", RecordBalanceAdjustmentSchema),
        async (c) => {
            try {
                const organizationId = c.req.param("organizationId");
                const moneyAccountId = c.req.param("moneyAccountId");
                const invalidOrganizationId = validateUuidParam(organizationId, "Invalid organization id");
                if (invalidOrganizationId) {
                    return c.json(invalidOrganizationId, invalidOrganizationId.code);
                }
                const invalidMoneyAccountId = validateUuidParam(moneyAccountId, "Invalid money account id");
                if (invalidMoneyAccountId) {
                    return c.json(invalidMoneyAccountId, invalidMoneyAccountId.code);
                }

                const serviceResponse = await moneyAccountsService.recordMoneyAccountBalanceAdjustment(
                    c.get("authUser").id,
                    organizationId,
                    moneyAccountId,
                    c.req.valid("json"),
                );
                return handleServiceResponse(c, serviceResponse);
            } catch (error) {
                return handleError(FILE_NAME, "recordMoneyAccountBalanceAdjustment", c, error);
            }
        },
    );

    router.post(
        "/:organizationId/money-accounts/:moneyAccountId/transfers",
        validateSchema("json", RecordMoneyAccountTransferSchema),
        async (c) => {
            try {
                const organizationId = c.req.param("organizationId");
                const moneyAccountId = c.req.param("moneyAccountId");
                const invalidOrganizationId = validateUuidParam(organizationId, "Invalid organization id");
                if (invalidOrganizationId) {
                    return c.json(invalidOrganizationId, invalidOrganizationId.code);
                }
                const invalidMoneyAccountId = validateUuidParam(moneyAccountId, "Invalid money account id");
                if (invalidMoneyAccountId) {
                    return c.json(invalidMoneyAccountId, invalidMoneyAccountId.code);
                }

                const serviceResponse = await moneyAccountsService.recordMoneyAccountTransfer(
                    c.get("authUser").id,
                    organizationId,
                    moneyAccountId,
                    c.req.valid("json"),
                );
                return handleServiceResponse(c, serviceResponse);
            } catch (error) {
                return handleError(FILE_NAME, "recordMoneyAccountTransfer", c, error);
            }
        },
    );

    router.get("/:organizationId/stores/:storeId/money-account-payment-routes", async (c) => {
        try {
            const organizationId = c.req.param("organizationId");
            const storeId = c.req.param("storeId");
            const invalidOrganizationId = validateUuidParam(organizationId, "Invalid organization id");
            if (invalidOrganizationId) {
                return c.json(invalidOrganizationId, invalidOrganizationId.code);
            }
            const invalidStoreId = validateUuidParam(storeId, "Invalid store id");
            if (invalidStoreId) {
                return c.json(invalidStoreId, invalidStoreId.code);
            }

            const serviceResponse = await moneyAccountsService.getMoneyAccountPaymentRoutes(
                c.get("authUser").id,
                organizationId,
                storeId,
            );
            return handleServiceResponse(c, serviceResponse);
        } catch (error) {
            return handleError(FILE_NAME, "getMoneyAccountPaymentRoutes", c, error);
        }
    });

    router.put(
        "/:organizationId/stores/:storeId/money-account-payment-routes",
        validateSchema("json", UpsertMoneyAccountPaymentRouteSchema),
        async (c) => {
            try {
                const organizationId = c.req.param("organizationId");
                const storeId = c.req.param("storeId");
                const invalidOrganizationId = validateUuidParam(organizationId, "Invalid organization id");
                if (invalidOrganizationId) {
                    return c.json(invalidOrganizationId, invalidOrganizationId.code);
                }
                const invalidStoreId = validateUuidParam(storeId, "Invalid store id");
                if (invalidStoreId) {
                    return c.json(invalidStoreId, invalidStoreId.code);
                }

                const serviceResponse = await moneyAccountsService.upsertMoneyAccountPaymentRoute(
                    c.get("authUser").id,
                    organizationId,
                    storeId,
                    c.req.valid("json"),
                );
                return handleServiceResponse(c, serviceResponse);
            } catch (error) {
                return handleError(FILE_NAME, "upsertMoneyAccountPaymentRoute", c, error);
            }
        },
    );

    router.delete(
        "/:organizationId/stores/:storeId/money-account-payment-routes/:paymentMethod",
        async (c) => {
            try {
                const organizationId = c.req.param("organizationId");
                const storeId = c.req.param("storeId");
                const paymentMethod = c.req.param("paymentMethod");
                const invalidOrganizationId = validateUuidParam(organizationId, "Invalid organization id");
                if (invalidOrganizationId) {
                    return c.json(invalidOrganizationId, invalidOrganizationId.code);
                }
                const invalidStoreId = validateUuidParam(storeId, "Invalid store id");
                if (invalidStoreId) {
                    return c.json(invalidStoreId, invalidStoreId.code);
                }
                const parsedMethod = MoneyAccountPaymentRouteMethodSchema.safeParse(paymentMethod);
                if (!parsedMethod.success) {
                    return c.json(
                        {
                            status: "error" as const,
                            message: "Payment method must be UPI or Card",
                            code: STATUS_CODES.BAD_REQUEST,
                        },
                        STATUS_CODES.BAD_REQUEST,
                    );
                }

                const serviceResponse = await moneyAccountsService.clearMoneyAccountPaymentRoute(
                    c.get("authUser").id,
                    organizationId,
                    storeId,
                    parsedMethod.data,
                );
                return handleServiceResponse(c, serviceResponse);
            } catch (error) {
                return handleError(FILE_NAME, "clearMoneyAccountPaymentRoute", c, error);
            }
        },
    );

    return router;
};

export default createMoneyAccountsRoutes();
