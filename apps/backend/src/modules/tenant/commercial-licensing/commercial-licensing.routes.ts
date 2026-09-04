import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import { z } from "zod";
import { STATUS_CODES } from "@repo/types";
import { handleError, handleServiceResponse } from "@/helpers/service.helper";
import { authMiddleware } from "@/middlewares/auth.middleware";
import type { AppVariables } from "@/types/hono";
import {
    getCommercialLicensingService,
    type CommercialLicensingService,
} from "./commercial-licensing.service";

const FILE_NAME = "commercial-licensing.routes";
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

export const createCommercialLicensingRoutes = (
    authenticate: MiddlewareHandler<{ Variables: AppVariables }> = authMiddleware,
    licensingService: CommercialLicensingService = getCommercialLicensingService(),
) => {
    const router = new Hono<{ Variables: AppVariables }>();
    router.use("*", authenticate);

    router.get("/:organizationId/stores/:storeId/commercial", async (c) => {
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

            return handleServiceResponse(
                c,
                await licensingService.getStoreCommercialStatus(
                    c.get("authUser").id,
                    organizationId,
                    storeId,
                ),
            );
        } catch (error) {
            return handleError(FILE_NAME, "getStoreCommercialStatus", c, error);
        }
    });

    router.post("/:organizationId/stores/:storeId/commercial/trial", async (c) => {
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

            return handleServiceResponse(
                c,
                await licensingService.startStandardTrial(
                    c.get("authUser").id,
                    organizationId,
                    storeId,
                ),
            );
        } catch (error) {
            return handleError(FILE_NAME, "startStandardTrial", c, error);
        }
    });

    return router;
};

export default createCommercialLicensingRoutes();
