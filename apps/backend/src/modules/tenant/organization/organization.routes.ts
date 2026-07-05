import { Hono } from "hono";
import { z } from "zod";
import {
    CreateOrganizationSchema,
    CreateStoreDeviceSchema,
    CreateStoreSchema,
    STATUS_CODES,
    UpdateOrganizationSchema,
    UpdateStoreDeviceSchema,
    UpdateStoreSchema,
} from "@repo/types";
import { handleError, handleServiceResponse } from "@/helpers/service.helper";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { validateSchema } from "@/middlewares/validate";
import type { AppVariables } from "@/types/hono";
import * as organizationService from "./organization.service";

const FILE_NAME = "organization.routes";
const uuidSchema = z.uuid("Invalid id");

const router = new Hono<{ Variables: AppVariables }>();

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

router.use("*", authMiddleware);

router.get("/", async (c) => {
    try {
        const authUser = c.get("authUser");
        const serviceResponse = await organizationService.getOrganizations(authUser.id);
        return handleServiceResponse(c, serviceResponse);
    } catch (error) {
        return handleError(FILE_NAME, "getOrganizations", c, error);
    }
});

router.post("/", validateSchema("json", CreateOrganizationSchema), async (c) => {
    try {
        const authUser = c.get("authUser");
        const body = c.req.valid("json");
        const serviceResponse = await organizationService.createOrganization(authUser.id, body);
        return handleServiceResponse(c, serviceResponse);
    } catch (error) {
        return handleError(FILE_NAME, "createOrganization", c, error);
    }
});

router.patch("/:organizationId", validateSchema("json", UpdateOrganizationSchema), async (c) => {
    try {
        const organizationId = c.req.param("organizationId");
        const invalidParam = validateUuidParam(organizationId, "Invalid organization id");
        if (invalidParam) {
            return c.json(invalidParam, invalidParam.code);
        }

        const authUser = c.get("authUser");
        const body = c.req.valid("json");
        const serviceResponse = await organizationService.updateOrganization(authUser.id, organizationId, body);
        return handleServiceResponse(c, serviceResponse);
    } catch (error) {
        return handleError(FILE_NAME, "updateOrganization", c, error);
    }
});

router.get("/:organizationId", async (c) => {
    try {
        const organizationId = c.req.param("organizationId");
        const invalidParam = validateUuidParam(organizationId, "Invalid organization id");
        if (invalidParam) {
            return c.json(invalidParam, invalidParam.code);
        }

        const authUser = c.get("authUser");
        const serviceResponse = await organizationService.getOrganizationDetails(authUser.id, organizationId);
        return handleServiceResponse(c, serviceResponse);
    } catch (error) {
        return handleError(FILE_NAME, "getOrganizationDetails", c, error);
    }
});

router.get("/:organizationId/stores", async (c) => {
    try {
        const organizationId = c.req.param("organizationId");
        const invalidParam = validateUuidParam(organizationId, "Invalid organization id");
        if (invalidParam) {
            return c.json(invalidParam, invalidParam.code);
        }

        const authUser = c.get("authUser");
        const serviceResponse = await organizationService.getStores(authUser.id, organizationId);
        return handleServiceResponse(c, serviceResponse);
    } catch (error) {
        return handleError(FILE_NAME, "getStores", c, error);
    }
});

router.post("/:organizationId/stores", validateSchema("json", CreateStoreSchema), async (c) => {
    try {
        const organizationId = c.req.param("organizationId");
        const invalidParam = validateUuidParam(organizationId, "Invalid organization id");
        if (invalidParam) {
            return c.json(invalidParam, invalidParam.code);
        }

        const authUser = c.get("authUser");
        const body = c.req.valid("json");
        const serviceResponse = await organizationService.createStore(authUser.id, organizationId, body);
        return handleServiceResponse(c, serviceResponse);
    } catch (error) {
        return handleError(FILE_NAME, "createStore", c, error);
    }
});

router.patch(
    "/:organizationId/stores/:storeId",
    validateSchema("json", UpdateStoreSchema),
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

            const authUser = c.get("authUser");
            const body = c.req.valid("json");
            const serviceResponse = await organizationService.updateStore(
                authUser.id,
                organizationId,
                storeId,
                body,
            );
            return handleServiceResponse(c, serviceResponse);
        } catch (error) {
            return handleError(FILE_NAME, "updateStore", c, error);
        }
    },
);

router.get("/:organizationId/stores/:storeId/devices", async (c) => {
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

        const authUser = c.get("authUser");
        const serviceResponse = await organizationService.getStoreDevices(authUser.id, organizationId, storeId);
        return handleServiceResponse(c, serviceResponse);
    } catch (error) {
        return handleError(FILE_NAME, "getStoreDevices", c, error);
    }
});

router.get("/:organizationId/stores/:storeId/devices/:deviceId/secret", async (c) => {
    try {
        const organizationId = c.req.param("organizationId");
        const storeId = c.req.param("storeId");
        const deviceId = c.req.param("deviceId");
        const invalidOrganizationId = validateUuidParam(organizationId, "Invalid organization id");
        if (invalidOrganizationId) {
            return c.json(invalidOrganizationId, invalidOrganizationId.code);
        }

        const invalidStoreId = validateUuidParam(storeId, "Invalid store id");
        if (invalidStoreId) {
            return c.json(invalidStoreId, invalidStoreId.code);
        }

        const invalidDeviceId = validateUuidParam(deviceId, "Invalid device id");
        if (invalidDeviceId) {
            return c.json(invalidDeviceId, invalidDeviceId.code);
        }

        const authUser = c.get("authUser");
        const serviceResponse = await organizationService.getStoreDeviceSecret(
            authUser.id,
            organizationId,
            storeId,
            deviceId,
        );
        return handleServiceResponse(c, serviceResponse);
    } catch (error) {
        return handleError(FILE_NAME, "getStoreDeviceSecret", c, error);
    }
});

router.post(
    "/:organizationId/stores/:storeId/devices",
    validateSchema("json", CreateStoreDeviceSchema),
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

            const authUser = c.get("authUser");
            const body = c.req.valid("json");
            const serviceResponse = await organizationService.createStoreDevice(
                authUser.id,
                organizationId,
                storeId,
                body,
            );
            return handleServiceResponse(c, serviceResponse);
        } catch (error) {
            return handleError(FILE_NAME, "createStoreDevice", c, error);
        }
    },
);

router.patch(
    "/:organizationId/stores/:storeId/devices/:deviceId",
    validateSchema("json", UpdateStoreDeviceSchema),
    async (c) => {
        try {
            const organizationId = c.req.param("organizationId");
            const storeId = c.req.param("storeId");
            const deviceId = c.req.param("deviceId");
            const invalidOrganizationId = validateUuidParam(organizationId, "Invalid organization id");
            if (invalidOrganizationId) {
                return c.json(invalidOrganizationId, invalidOrganizationId.code);
            }

            const invalidStoreId = validateUuidParam(storeId, "Invalid store id");
            if (invalidStoreId) {
                return c.json(invalidStoreId, invalidStoreId.code);
            }

            const invalidDeviceId = validateUuidParam(deviceId, "Invalid device id");
            if (invalidDeviceId) {
                return c.json(invalidDeviceId, invalidDeviceId.code);
            }

            const authUser = c.get("authUser");
            const body = c.req.valid("json");
            const serviceResponse = await organizationService.updateStoreDevice(
                authUser.id,
                organizationId,
                storeId,
                deviceId,
                body,
            );
            return handleServiceResponse(c, serviceResponse);
        } catch (error) {
            return handleError(FILE_NAME, "updateStoreDevice", c, error);
        }
    },
);

export default router;
