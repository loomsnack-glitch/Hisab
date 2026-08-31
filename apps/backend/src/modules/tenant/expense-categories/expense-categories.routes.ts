import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import { z } from "zod";
import {
    CreateExpenseCategorySchema,
    STATUS_CODES,
    UpdateExpenseCategorySchema,
} from "@repo/types";
import { handleError, handleServiceResponse } from "@/helpers/service.helper";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { validateSchema } from "@/middlewares/validate";
import type { AppVariables } from "@/types/hono";
import * as expenseCategoriesService from "./expense-categories.service";

const FILE_NAME = "expense-categories.routes";
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

export const createExpenseCategoriesRoutes = (
    authenticate: MiddlewareHandler<{ Variables: AppVariables }> = authMiddleware,
) => {
    const router = new Hono<{ Variables: AppVariables }>();
    router.use("*", authenticate);

    router.get("/:organizationId/expense-categories", async (c) => {
        try {
            const organizationId = c.req.param("organizationId");
            const invalidOrganizationId = validateUuidParam(organizationId, "Invalid organization id");
            if (invalidOrganizationId) {
                return c.json(invalidOrganizationId, invalidOrganizationId.code);
            }

            const serviceResponse = await expenseCategoriesService.getExpenseCategories(
                c.get("authUser").id,
                organizationId,
            );
            return handleServiceResponse(c, serviceResponse);
        } catch (error) {
            return handleError(FILE_NAME, "getExpenseCategories", c, error);
        }
    });

    router.post(
        "/:organizationId/expense-categories",
        validateSchema("json", CreateExpenseCategorySchema),
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

                const serviceResponse = await expenseCategoriesService.createExpenseCategory(
                    c.get("authUser").id,
                    organizationId,
                    c.req.valid("json"),
                );
                return handleServiceResponse(c, serviceResponse);
            } catch (error) {
                return handleError(FILE_NAME, "createExpenseCategory", c, error);
            }
        },
    );

    router.get("/:organizationId/expense-categories/:expenseCategoryId", async (c) => {
        try {
            const organizationId = c.req.param("organizationId");
            const expenseCategoryId = c.req.param("expenseCategoryId");
            const invalidOrganizationId = validateUuidParam(organizationId, "Invalid organization id");
            if (invalidOrganizationId) {
                return c.json(invalidOrganizationId, invalidOrganizationId.code);
            }
            const invalidExpenseCategoryId = validateUuidParam(
                expenseCategoryId,
                "Invalid expense category id",
            );
            if (invalidExpenseCategoryId) {
                return c.json(invalidExpenseCategoryId, invalidExpenseCategoryId.code);
            }

            const serviceResponse = await expenseCategoriesService.getExpenseCategoryDetails(
                c.get("authUser").id,
                organizationId,
                expenseCategoryId,
            );
            return handleServiceResponse(c, serviceResponse);
        } catch (error) {
            return handleError(FILE_NAME, "getExpenseCategoryDetails", c, error);
        }
    });

    router.patch(
        "/:organizationId/expense-categories/:expenseCategoryId",
        validateSchema("json", UpdateExpenseCategorySchema),
        async (c) => {
            try {
                const organizationId = c.req.param("organizationId");
                const expenseCategoryId = c.req.param("expenseCategoryId");
                const invalidOrganizationId = validateUuidParam(
                    organizationId,
                    "Invalid organization id",
                );
                if (invalidOrganizationId) {
                    return c.json(invalidOrganizationId, invalidOrganizationId.code);
                }
                const invalidExpenseCategoryId = validateUuidParam(
                    expenseCategoryId,
                    "Invalid expense category id",
                );
                if (invalidExpenseCategoryId) {
                    return c.json(invalidExpenseCategoryId, invalidExpenseCategoryId.code);
                }

                const serviceResponse = await expenseCategoriesService.updateExpenseCategory(
                    c.get("authUser").id,
                    organizationId,
                    expenseCategoryId,
                    c.req.valid("json"),
                );
                return handleServiceResponse(c, serviceResponse);
            } catch (error) {
                return handleError(FILE_NAME, "updateExpenseCategory", c, error);
            }
        },
    );

    return router;
};

export default createExpenseCategoriesRoutes();
