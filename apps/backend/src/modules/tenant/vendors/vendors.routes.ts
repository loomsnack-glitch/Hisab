import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import { z } from "zod";
import { CreateVendorItemSchema, CreateVendorSchema, STATUS_CODES, UpdateStoreVendorAvailabilitySchema, UpdateStoreVendorItemOfferingSchema, UpdateVendorItemSchema, UpdateVendorSchema } from "@repo/types";
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

    router.get("/:organizationId/vendor-items", async (c) => {
        try {
            const organizationId = c.req.param("organizationId");
            const invalidOrganizationId = validateUuidParam(organizationId, "Invalid organization id");
            if (invalidOrganizationId) {
                return c.json(invalidOrganizationId, invalidOrganizationId.code);
            }

            const serviceResponse = await vendorsService.getVendorItems(c.get("authUser").id, organizationId);
            return handleServiceResponse(c, serviceResponse);
        } catch (error) {
            return handleError(FILE_NAME, "getVendorItems", c, error);
        }
    });

    router.post(
        "/:organizationId/vendor-items",
        validateSchema("json", CreateVendorItemSchema),
        async (c) => {
            try {
                const organizationId = c.req.param("organizationId");
                const invalidOrganizationId = validateUuidParam(organizationId, "Invalid organization id");
                if (invalidOrganizationId) {
                    return c.json(invalidOrganizationId, invalidOrganizationId.code);
                }

                const serviceResponse = await vendorsService.createVendorItem(
                    c.get("authUser").id,
                    organizationId,
                    c.req.valid("json"),
                );
                return handleServiceResponse(c, serviceResponse);
            } catch (error) {
                return handleError(FILE_NAME, "createVendorItem", c, error);
            }
        },
    );

    router.get("/:organizationId/vendor-items/:vendorItemId", async (c) => {
        try {
            const organizationId = c.req.param("organizationId");
            const vendorItemId = c.req.param("vendorItemId");
            const invalidOrganizationId = validateUuidParam(organizationId, "Invalid organization id");
            if (invalidOrganizationId) {
                return c.json(invalidOrganizationId, invalidOrganizationId.code);
            }
            const invalidVendorItemId = validateUuidParam(vendorItemId, "Invalid vendor item id");
            if (invalidVendorItemId) {
                return c.json(invalidVendorItemId, invalidVendorItemId.code);
            }

            const serviceResponse = await vendorsService.getVendorItemDetails(
                c.get("authUser").id,
                organizationId,
                vendorItemId,
            );
            return handleServiceResponse(c, serviceResponse);
        } catch (error) {
            return handleError(FILE_NAME, "getVendorItemDetails", c, error);
        }
    });

    router.patch(
        "/:organizationId/vendor-items/:vendorItemId",
        validateSchema("json", UpdateVendorItemSchema),
        async (c) => {
            try {
                const organizationId = c.req.param("organizationId");
                const vendorItemId = c.req.param("vendorItemId");
                const invalidOrganizationId = validateUuidParam(organizationId, "Invalid organization id");
                if (invalidOrganizationId) {
                    return c.json(invalidOrganizationId, invalidOrganizationId.code);
                }
                const invalidVendorItemId = validateUuidParam(vendorItemId, "Invalid vendor item id");
                if (invalidVendorItemId) {
                    return c.json(invalidVendorItemId, invalidVendorItemId.code);
                }

                const serviceResponse = await vendorsService.updateVendorItem(
                    c.get("authUser").id,
                    organizationId,
                    vendorItemId,
                    c.req.valid("json"),
                );
                return handleServiceResponse(c, serviceResponse);
            } catch (error) {
                return handleError(FILE_NAME, "updateVendorItem", c, error);
            }
        },
    );

    router.get("/:organizationId/stores/:storeId/vendor-availabilities", async (c) => {
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

            const serviceResponse = await vendorsService.getStoreVendorAvailabilities(
                c.get("authUser").id,
                organizationId,
                storeId,
            );
            return handleServiceResponse(c, serviceResponse);
        } catch (error) {
            return handleError(FILE_NAME, "getStoreVendorAvailabilities", c, error);
        }
    });

    router.patch(
        "/:organizationId/stores/:storeId/vendor-availabilities/:availabilityId",
        validateSchema("json", UpdateStoreVendorAvailabilitySchema),
        async (c) => {
            try {
                const organizationId = c.req.param("organizationId");
                const storeId = c.req.param("storeId");
                const availabilityId = c.req.param("availabilityId");
                const invalidOrganizationId = validateUuidParam(organizationId, "Invalid organization id");
                if (invalidOrganizationId) {
                    return c.json(invalidOrganizationId, invalidOrganizationId.code);
                }
                const invalidStoreId = validateUuidParam(storeId, "Invalid store id");
                if (invalidStoreId) {
                    return c.json(invalidStoreId, invalidStoreId.code);
                }
                const invalidAvailabilityId = validateUuidParam(availabilityId, "Invalid availability id");
                if (invalidAvailabilityId) {
                    return c.json(invalidAvailabilityId, invalidAvailabilityId.code);
                }

                const serviceResponse = await vendorsService.updateStoreVendorAvailability(
                    c.get("authUser").id,
                    organizationId,
                    storeId,
                    availabilityId,
                    c.req.valid("json"),
                );
                return handleServiceResponse(c, serviceResponse);
            } catch (error) {
                return handleError(FILE_NAME, "updateStoreVendorAvailability", c, error);
            }
        },
    );

    router.get("/:organizationId/stores/:storeId/vendor-item-offerings", async (c) => {
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

            const serviceResponse = await vendorsService.getStoreVendorItemOfferings(
                c.get("authUser").id,
                organizationId,
                storeId,
            );
            return handleServiceResponse(c, serviceResponse);
        } catch (error) {
            return handleError(FILE_NAME, "getStoreVendorItemOfferings", c, error);
        }
    });

    router.patch(
        "/:organizationId/stores/:storeId/vendor-item-offerings/:offeringId",
        validateSchema("json", UpdateStoreVendorItemOfferingSchema),
        async (c) => {
            try {
                const organizationId = c.req.param("organizationId");
                const storeId = c.req.param("storeId");
                const offeringId = c.req.param("offeringId");
                const invalidOrganizationId = validateUuidParam(organizationId, "Invalid organization id");
                if (invalidOrganizationId) {
                    return c.json(invalidOrganizationId, invalidOrganizationId.code);
                }
                const invalidStoreId = validateUuidParam(storeId, "Invalid store id");
                if (invalidStoreId) {
                    return c.json(invalidStoreId, invalidStoreId.code);
                }
                const invalidOfferingId = validateUuidParam(offeringId, "Invalid offering id");
                if (invalidOfferingId) {
                    return c.json(invalidOfferingId, invalidOfferingId.code);
                }

                const serviceResponse = await vendorsService.updateStoreVendorItemOffering(
                    c.get("authUser").id,
                    organizationId,
                    storeId,
                    offeringId,
                    c.req.valid("json"),
                );
                return handleServiceResponse(c, serviceResponse);
            } catch (error) {
                return handleError(FILE_NAME, "updateStoreVendorItemOffering", c, error);
            }
        },
    );

    return router;
};

export default createVendorsRoutes();
