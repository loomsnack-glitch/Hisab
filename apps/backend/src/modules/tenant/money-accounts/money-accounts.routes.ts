import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import { z } from "zod";
import { CreateMoneyAccountSchema, STATUS_CODES, UpdateMoneyAccountSchema } from "@repo/types";
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

    return router;
};

export default createMoneyAccountsRoutes();
