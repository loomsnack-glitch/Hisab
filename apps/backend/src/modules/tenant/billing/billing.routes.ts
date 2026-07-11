import { Hono } from "hono";
import { z } from "zod";
import {
    CreateCustomerSchema,
    CustomerListQuerySchema,
    STATUS_CODES,
    SalesListQuerySchema,
    UpdateCustomerSchema,
} from "@repo/types";
import { handleError, handleServiceResponse } from "@/helpers/service.helper";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { validateSchema } from "@/middlewares/validate";
import type { AppVariables } from "@/types/hono";
import * as billingService from "./billing.service";

const FILE_NAME = "billing.routes";
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

const validateOrgAndStoreParams = (organizationId: string, storeId?: string) => {
    const invalidOrganizationId = validateUuidParam(organizationId, "Invalid organization id");
    if (invalidOrganizationId) {
        return invalidOrganizationId;
    }

    if (storeId) {
        const invalidStoreId = validateUuidParam(storeId, "Invalid store id");
        if (invalidStoreId) {
            return invalidStoreId;
        }
    }

    return null;
};

router.use("*", authMiddleware);

router.get("/:organizationId/customers", validateSchema("query", CustomerListQuerySchema), async (c) => {
    try {
        const organizationId = c.req.param("organizationId");
        const invalidParams = validateOrgAndStoreParams(organizationId);
        if (invalidParams) {
            return c.json(invalidParams, invalidParams.code);
        }

        const authUser = c.get("authUser");
        const query = c.req.valid("query");
        const serviceResponse = await billingService.getCustomers(authUser.id, organizationId, query);
        return handleServiceResponse(c, serviceResponse);
    } catch (error) {
        return handleError(FILE_NAME, "getCustomers", c, error);
    }
});

router.post("/:organizationId/customers", validateSchema("json", CreateCustomerSchema), async (c) => {
    try {
        const organizationId = c.req.param("organizationId");
        const invalidParams = validateOrgAndStoreParams(organizationId);
        if (invalidParams) {
            return c.json(invalidParams, invalidParams.code);
        }

        const authUser = c.get("authUser");
        const body = c.req.valid("json");
        const serviceResponse = await billingService.createCustomer(authUser.id, organizationId, body);
        return handleServiceResponse(c, serviceResponse);
    } catch (error) {
        return handleError(FILE_NAME, "createCustomer", c, error);
    }
});

router.get("/:organizationId/customers/:customerId", async (c) => {
    try {
        const organizationId = c.req.param("organizationId");
        const customerId = c.req.param("customerId");
        const invalidParams = validateOrgAndStoreParams(organizationId)
            ?? validateUuidParam(customerId, "Invalid customer id");
        if (invalidParams) {
            return c.json(invalidParams, invalidParams.code);
        }

        const authUser = c.get("authUser");
        const serviceResponse = await billingService.getCustomerDetails(authUser.id, organizationId, customerId);
        return handleServiceResponse(c, serviceResponse);
    } catch (error) {
        return handleError(FILE_NAME, "getCustomerDetails", c, error);
    }
});

router.patch("/:organizationId/customers/:customerId", validateSchema("json", UpdateCustomerSchema), async (c) => {
    try {
        const organizationId = c.req.param("organizationId");
        const customerId = c.req.param("customerId");
        const invalidParams = validateOrgAndStoreParams(organizationId)
            ?? validateUuidParam(customerId, "Invalid customer id");
        if (invalidParams) {
            return c.json(invalidParams, invalidParams.code);
        }

        const authUser = c.get("authUser");
        const body = c.req.valid("json");
        const serviceResponse = await billingService.updateCustomer(authUser.id, organizationId, customerId, body);
        return handleServiceResponse(c, serviceResponse);
    } catch (error) {
        return handleError(FILE_NAME, "updateCustomer", c, error);
    }
});

router.get("/:organizationId/customers/:customerId/ledger", async (c) => {
    try {
        const organizationId = c.req.param("organizationId");
        const customerId = c.req.param("customerId");
        const invalidParams = validateOrgAndStoreParams(organizationId)
            ?? validateUuidParam(customerId, "Invalid customer id");
        if (invalidParams) {
            return c.json(invalidParams, invalidParams.code);
        }

        const authUser = c.get("authUser");
        const serviceResponse = await billingService.getCustomerLedger(authUser.id, organizationId, customerId);
        return handleServiceResponse(c, serviceResponse);
    } catch (error) {
        return handleError(FILE_NAME, "getCustomerLedger", c, error);
    }
});

router.get(
    "/:organizationId/stores/:storeId/sales",
    validateSchema("query", SalesListQuerySchema),
    async (c) => {
        try {
            const organizationId = c.req.param("organizationId");
            const storeId = c.req.param("storeId");
            const invalidParams = validateOrgAndStoreParams(organizationId, storeId);
            if (invalidParams) {
                return c.json(invalidParams, invalidParams.code);
            }

            const authUser = c.get("authUser");
            const query = c.req.valid("query");
            const serviceResponse = await billingService.getSales(authUser.id, organizationId, storeId, query);
            return handleServiceResponse(c, serviceResponse);
        } catch (error) {
            return handleError(FILE_NAME, "getSales", c, error);
        }
    },
);

router.get("/:organizationId/stores/:storeId/sales/:saleId", async (c) => {
    try {
        const organizationId = c.req.param("organizationId");
        const storeId = c.req.param("storeId");
        const saleId = c.req.param("saleId");
        const invalidParams = validateOrgAndStoreParams(organizationId, storeId)
            ?? validateUuidParam(saleId, "Invalid sale id");
        if (invalidParams) {
            return c.json(invalidParams, invalidParams.code);
        }

        const authUser = c.get("authUser");
        const serviceResponse = await billingService.getSaleDetails(authUser.id, organizationId, storeId, saleId);
        return handleServiceResponse(c, serviceResponse);
    } catch (error) {
        return handleError(FILE_NAME, "getSaleDetails", c, error);
    }
});

router.get("/:organizationId/stores/:storeId/add-on-sales-rollups", async (c) => {
    try {
        const organizationId = c.req.param("organizationId");
        const storeId = c.req.param("storeId");
        const invalidParams = validateOrgAndStoreParams(organizationId, storeId);
        if (invalidParams) {
            return c.json(invalidParams, invalidParams.code);
        }

        const authUser = c.get("authUser");
        const serviceResponse = await billingService.getAddOnSalesRollups(
            authUser.id,
            organizationId,
            storeId,
        );
        return handleServiceResponse(c, serviceResponse);
    } catch (error) {
        return handleError(FILE_NAME, "getAddOnSalesRollups", c, error);
    }
});

export default router;
