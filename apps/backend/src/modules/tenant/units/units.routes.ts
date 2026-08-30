import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import { z } from "zod";
import { CreateUnitSchema, STATUS_CODES, UpdateUnitSchema } from "@repo/types";
import { handleError, handleServiceResponse } from "@/helpers/service.helper";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { validateSchema } from "@/middlewares/validate";
import type { AppVariables } from "@/types/hono";
import * as unitsService from "./units.service";

const FILE_NAME = "units.routes";
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

export const createUnitsRoutes = (
    authenticate: MiddlewareHandler<{ Variables: AppVariables }> = authMiddleware,
) => {
    const router = new Hono<{ Variables: AppVariables }>();
    router.use("*", authenticate);

    router.get("/:organizationId/units", async (c) => {
        try {
            const organizationId = c.req.param("organizationId");
            const invalidOrganizationId = validateUuidParam(organizationId, "Invalid organization id");
            if (invalidOrganizationId) {
                return c.json(invalidOrganizationId, invalidOrganizationId.code);
            }

            const serviceResponse = await unitsService.getUnits(c.get("authUser").id, organizationId);
            return handleServiceResponse(c, serviceResponse);
        } catch (error) {
            return handleError(FILE_NAME, "getUnits", c, error);
        }
    });

    router.post("/:organizationId/units", validateSchema("json", CreateUnitSchema), async (c) => {
        try {
            const organizationId = c.req.param("organizationId");
            const invalidOrganizationId = validateUuidParam(organizationId, "Invalid organization id");
            if (invalidOrganizationId) {
                return c.json(invalidOrganizationId, invalidOrganizationId.code);
            }

            const serviceResponse = await unitsService.createUnit(
                c.get("authUser").id,
                organizationId,
                c.req.valid("json"),
            );
            return handleServiceResponse(c, serviceResponse);
        } catch (error) {
            return handleError(FILE_NAME, "createUnit", c, error);
        }
    });

    router.get("/:organizationId/units/:unitId", async (c) => {
        try {
            const organizationId = c.req.param("organizationId");
            const unitId = c.req.param("unitId");
            const invalidOrganizationId = validateUuidParam(organizationId, "Invalid organization id");
            if (invalidOrganizationId) {
                return c.json(invalidOrganizationId, invalidOrganizationId.code);
            }
            const invalidUnitId = validateUuidParam(unitId, "Invalid unit id");
            if (invalidUnitId) {
                return c.json(invalidUnitId, invalidUnitId.code);
            }

            const serviceResponse = await unitsService.getUnitDetails(
                c.get("authUser").id,
                organizationId,
                unitId,
            );
            return handleServiceResponse(c, serviceResponse);
        } catch (error) {
            return handleError(FILE_NAME, "getUnitDetails", c, error);
        }
    });

    router.patch("/:organizationId/units/:unitId", validateSchema("json", UpdateUnitSchema), async (c) => {
        try {
            const organizationId = c.req.param("organizationId");
            const unitId = c.req.param("unitId");
            const invalidOrganizationId = validateUuidParam(organizationId, "Invalid organization id");
            if (invalidOrganizationId) {
                return c.json(invalidOrganizationId, invalidOrganizationId.code);
            }
            const invalidUnitId = validateUuidParam(unitId, "Invalid unit id");
            if (invalidUnitId) {
                return c.json(invalidUnitId, invalidUnitId.code);
            }

            const serviceResponse = await unitsService.updateUnit(
                c.get("authUser").id,
                organizationId,
                unitId,
                c.req.valid("json"),
            );
            return handleServiceResponse(c, serviceResponse);
        } catch (error) {
            return handleError(FILE_NAME, "updateUnit", c, error);
        }
    });

    return router;
};

export default createUnitsRoutes();
