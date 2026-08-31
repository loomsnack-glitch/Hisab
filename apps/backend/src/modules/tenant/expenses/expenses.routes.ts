import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import { z } from "zod";
import { CreateDraftExpenseSchema, CreateOutgoingPaymentSchema, RecordExpenseSchema, ReverseOutgoingPaymentSchema, STATUS_CODES, UpdateDraftExpenseSchema, VoidExpenseSchema } from "@repo/types";
import { handleError, handleServiceResponse } from "@/helpers/service.helper";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { validateSchema } from "@/middlewares/validate";
import type { AppVariables } from "@/types/hono";
import * as expensesService from "./expenses.service";

const FILE_NAME = "expenses.routes";
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

export const createExpensesRoutes = (
    authenticate: MiddlewareHandler<{ Variables: AppVariables }> = authMiddleware,
) => {
    const router = new Hono<{ Variables: AppVariables }>();
    router.use("*", authenticate);

    router.get("/:organizationId/expenses", async (c) => {
        try {
            const organizationId = c.req.param("organizationId");
            const invalidOrganizationId = validateUuidParam(organizationId, "Invalid organization id");
            if (invalidOrganizationId) {
                return c.json(invalidOrganizationId, invalidOrganizationId.code);
            }

            const serviceResponse = await expensesService.getExpenses(
                c.get("authUser").id,
                organizationId,
            );
            return handleServiceResponse(c, serviceResponse);
        } catch (error) {
            return handleError(FILE_NAME, "getExpenses", c, error);
        }
    });

    router.post(
        "/:organizationId/expenses",
        validateSchema("json", CreateDraftExpenseSchema),
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

                const serviceResponse = await expensesService.createDraftExpense(
                    c.get("authUser").id,
                    organizationId,
                    c.req.valid("json"),
                );
                return handleServiceResponse(c, serviceResponse);
            } catch (error) {
                return handleError(FILE_NAME, "createDraftExpense", c, error);
            }
        },
    );

    router.get("/:organizationId/expenses/:expenseId", async (c) => {
        try {
            const organizationId = c.req.param("organizationId");
            const expenseId = c.req.param("expenseId");
            const invalidOrganizationId = validateUuidParam(organizationId, "Invalid organization id");
            if (invalidOrganizationId) {
                return c.json(invalidOrganizationId, invalidOrganizationId.code);
            }
            const invalidExpenseId = validateUuidParam(expenseId, "Invalid expense id");
            if (invalidExpenseId) {
                return c.json(invalidExpenseId, invalidExpenseId.code);
            }

            const serviceResponse = await expensesService.getExpenseDetails(
                c.get("authUser").id,
                organizationId,
                expenseId,
            );
            return handleServiceResponse(c, serviceResponse);
        } catch (error) {
            return handleError(FILE_NAME, "getExpenseDetails", c, error);
        }
    });

    router.patch(
        "/:organizationId/expenses/:expenseId",
        validateSchema("json", UpdateDraftExpenseSchema),
        async (c) => {
            try {
                const organizationId = c.req.param("organizationId");
                const expenseId = c.req.param("expenseId");
                const invalidOrganizationId = validateUuidParam(
                    organizationId,
                    "Invalid organization id",
                );
                if (invalidOrganizationId) {
                    return c.json(invalidOrganizationId, invalidOrganizationId.code);
                }
                const invalidExpenseId = validateUuidParam(expenseId, "Invalid expense id");
                if (invalidExpenseId) {
                    return c.json(invalidExpenseId, invalidExpenseId.code);
                }

                const serviceResponse = await expensesService.updateDraftExpense(
                    c.get("authUser").id,
                    organizationId,
                    expenseId,
                    c.req.valid("json"),
                );
                return handleServiceResponse(c, serviceResponse);
            } catch (error) {
                return handleError(FILE_NAME, "updateDraftExpense", c, error);
            }
        },
    );

    router.delete("/:organizationId/expenses/:expenseId", async (c) => {
        try {
            const organizationId = c.req.param("organizationId");
            const expenseId = c.req.param("expenseId");
            const invalidOrganizationId = validateUuidParam(organizationId, "Invalid organization id");
            if (invalidOrganizationId) {
                return c.json(invalidOrganizationId, invalidOrganizationId.code);
            }
            const invalidExpenseId = validateUuidParam(expenseId, "Invalid expense id");
            if (invalidExpenseId) {
                return c.json(invalidExpenseId, invalidExpenseId.code);
            }

            const serviceResponse = await expensesService.discardDraftExpense(
                c.get("authUser").id,
                organizationId,
                expenseId,
            );
            return handleServiceResponse(c, serviceResponse);
        } catch (error) {
            return handleError(FILE_NAME, "discardDraftExpense", c, error);
        }
    });

    router.post("/:organizationId/expenses/:expenseId/record", async (c) => {
        try {
            const organizationId = c.req.param("organizationId");
            const expenseId = c.req.param("expenseId");
            const invalidOrganizationId = validateUuidParam(organizationId, "Invalid organization id");
            if (invalidOrganizationId) {
                return c.json(invalidOrganizationId, invalidOrganizationId.code);
            }
            const invalidExpenseId = validateUuidParam(expenseId, "Invalid expense id");
            if (invalidExpenseId) {
                return c.json(invalidExpenseId, invalidExpenseId.code);
            }

            let recordBody: unknown = {};
            try {
                recordBody = await c.req.json();
            } catch {
                recordBody = {};
            }
            const parsed = RecordExpenseSchema.safeParse(recordBody ?? {});
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

            const serviceResponse = await expensesService.recordExpense(
                c.get("authUser").id,
                organizationId,
                expenseId,
                parsed.data,
            );
            return handleServiceResponse(c, serviceResponse);
        } catch (error) {
            return handleError(FILE_NAME, "recordExpense", c, error);
        }
    });

    router.post(
        "/:organizationId/expenses/:expenseId/payments",
        validateSchema("json", CreateOutgoingPaymentSchema),
        async (c) => {
            try {
                const organizationId = c.req.param("organizationId");
                const expenseId = c.req.param("expenseId");
                const invalidOrganizationId = validateUuidParam(
                    organizationId,
                    "Invalid organization id",
                );
                if (invalidOrganizationId) {
                    return c.json(invalidOrganizationId, invalidOrganizationId.code);
                }
                const invalidExpenseId = validateUuidParam(expenseId, "Invalid expense id");
                if (invalidExpenseId) {
                    return c.json(invalidExpenseId, invalidExpenseId.code);
                }

                const serviceResponse = await expensesService.createOutgoingExpensePayment(
                    c.get("authUser").id,
                    organizationId,
                    expenseId,
                    c.req.valid("json"),
                );
                return handleServiceResponse(c, serviceResponse);
            } catch (error) {
                return handleError(FILE_NAME, "createOutgoingExpensePayment", c, error);
            }
        },
    );

    router.post(
        "/:organizationId/expenses/:expenseId/payments/:paymentId/reverse",
        validateSchema("json", ReverseOutgoingPaymentSchema),
        async (c) => {
            try {
                const organizationId = c.req.param("organizationId");
                const expenseId = c.req.param("expenseId");
                const paymentId = c.req.param("paymentId");
                const invalidOrganizationId = validateUuidParam(
                    organizationId,
                    "Invalid organization id",
                );
                if (invalidOrganizationId) {
                    return c.json(invalidOrganizationId, invalidOrganizationId.code);
                }
                const invalidExpenseId = validateUuidParam(expenseId, "Invalid expense id");
                if (invalidExpenseId) {
                    return c.json(invalidExpenseId, invalidExpenseId.code);
                }
                const invalidPaymentId = validateUuidParam(paymentId, "Invalid outgoing payment id");
                if (invalidPaymentId) {
                    return c.json(invalidPaymentId, invalidPaymentId.code);
                }

                const serviceResponse = await expensesService.reverseOutgoingExpensePayment(
                    c.get("authUser").id,
                    organizationId,
                    expenseId,
                    paymentId,
                    c.req.valid("json"),
                );
                return handleServiceResponse(c, serviceResponse);
            } catch (error) {
                return handleError(FILE_NAME, "reverseOutgoingExpensePayment", c, error);
            }
        },
    );

    router.post(
        "/:organizationId/expenses/:expenseId/void",
        validateSchema("json", VoidExpenseSchema),
        async (c) => {
            try {
                const organizationId = c.req.param("organizationId");
                const expenseId = c.req.param("expenseId");
                const invalidOrganizationId = validateUuidParam(
                    organizationId,
                    "Invalid organization id",
                );
                if (invalidOrganizationId) {
                    return c.json(invalidOrganizationId, invalidOrganizationId.code);
                }
                const invalidExpenseId = validateUuidParam(expenseId, "Invalid expense id");
                if (invalidExpenseId) {
                    return c.json(invalidExpenseId, invalidExpenseId.code);
                }

                const serviceResponse = await expensesService.voidExpense(
                    c.get("authUser").id,
                    organizationId,
                    expenseId,
                    c.req.valid("json"),
                );
                return handleServiceResponse(c, serviceResponse);
            } catch (error) {
                return handleError(FILE_NAME, "voidExpense", c, error);
            }
        },
    );

    return router;
};

export default createExpensesRoutes();
