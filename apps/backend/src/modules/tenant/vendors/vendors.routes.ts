import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import { z } from "zod";
import { CreateVendorSchema, STATUS_CODES, UpdateVendorSchema } from "@repo/types";
import { handleError, handleServiceResponse } from "@/helpers/service.helper";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { validateSchema } from "@/middlewares/validate";
import type { AppVariables } from "@/types/hono";
import * as vendorsService from "./vendors.service";

const FILE_NAME = "vendors.routes";
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

export const createVendorsRoutes = (
    authenticate: MiddlewareHandler<{ Variables: AppVariables }> = authMiddleware,
) => {
    const router = new Hono<{ Variables: AppVariables }>();
    router.use("*", authenticate);

    router.get("/:organizationId/vendors", async (c) => {
        try {
            const organizationId = c.req.param("organizationId");
            const invalidOrganizationId = validateUuidParam(organizationId, "Invalid organization id");
            if (invalidOrganizationId) {
                return c.json(invalidOrganizationId, invalidOrganizationId.code);
            }

            const serviceResponse = await vendorsService.getVendors(c.get("authUser").id, organizationId);
            return handleServiceResponse(c, serviceResponse);
        } catch (error) {
            return handleError(FILE_NAME, "getVendors", c, error);
        }
    });

    router.post("/:organizationId/vendors", validateSchema("json", CreateVendorSchema), async (c) => {
        try {
            const organizationId = c.req.param("organizationId");
            const invalidOrganizationId = validateUuidParam(organizationId, "Invalid organization id");
            if (invalidOrganizationId) {
                return c.json(invalidOrganizationId, invalidOrganizationId.code);
            }

            const serviceResponse = await vendorsService.createVendor(
                c.get("authUser").id,
                organizationId,
                c.req.valid("json"),
            );
            return handleServiceResponse(c, serviceResponse);
        } catch (error) {
            return handleError(FILE_NAME, "createVendor", c, error);
        }
    });

    router.get("/:organizationId/vendors/:vendorId", async (c) => {
        try {
            const organizationId = c.req.param("organizationId");
            const vendorId = c.req.param("vendorId");
            const invalidOrganizationId = validateUuidParam(organizationId, "Invalid organization id");
            if (invalidOrganizationId) {
                return c.json(invalidOrganizationId, invalidOrganizationId.code);
            }
            const invalidVendorId = validateUuidParam(vendorId, "Invalid vendor id");
            if (invalidVendorId) {
                return c.json(invalidVendorId, invalidVendorId.code);
            }

            const serviceResponse = await vendorsService.getVendorDetails(
                c.get("authUser").id,
                organizationId,
                vendorId,
            );
            return handleServiceResponse(c, serviceResponse);
        } catch (error) {
            return handleError(FILE_NAME, "getVendorDetails", c, error);
        }
    });

    router.patch("/:organizationId/vendors/:vendorId", validateSchema("json", UpdateVendorSchema), async (c) => {
        try {
            const organizationId = c.req.param("organizationId");
            const vendorId = c.req.param("vendorId");
            const invalidOrganizationId = validateUuidParam(organizationId, "Invalid organization id");
            if (invalidOrganizationId) {
                return c.json(invalidOrganizationId, invalidOrganizationId.code);
            }
            const invalidVendorId = validateUuidParam(vendorId, "Invalid vendor id");
            if (invalidVendorId) {
                return c.json(invalidVendorId, invalidVendorId.code);
            }

            const serviceResponse = await vendorsService.updateVendor(
                c.get("authUser").id,
                organizationId,
                vendorId,
                c.req.valid("json"),
            );
            return handleServiceResponse(c, serviceResponse);
        } catch (error) {
            return handleError(FILE_NAME, "updateVendor", c, error);
        }
    });

    return router;
};

export default createVendorsRoutes();
