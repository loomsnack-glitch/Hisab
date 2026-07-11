import { Hono } from "hono";
import { z } from "zod";
import {
    CommitSaleSchema,
    CreateCustomerSchema,
    CreateDraftSaleSchema,
    CreatePaymentSchema,
    CustomerListQuerySchema,
    SalesListQuerySchema,
    STATUS_CODES,
    UpdateDraftSaleSchema,
    VoidSaleSchema,
} from "@repo/types";
import { handleError, handleServiceResponse } from "@/helpers/service.helper";
import { deviceAuthMiddleware } from "@/middlewares/device-auth.middleware";
import { validateSchema } from "@/middlewares/validate";
import type { AppVariables } from "@/types/hono";
import * as billingService from "@/modules/tenant/billing/billing.service";
import * as catalogService from "@/modules/tenant/catalog/catalog.service";

const FILE_NAME = "pos.routes";
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

router.use("*", deviceAuthMiddleware);

router.get("/categories", async (c) => {
    try {
        const authDevice = c.get("authDevice");
        const serviceResponse = await catalogService.getCategoriesForDevice(authDevice);
        return handleServiceResponse(c, serviceResponse);
    } catch (error) {
        return handleError(FILE_NAME, "getCategoriesForDevice", c, error);
    }
});

router.get("/products", async (c) => {
    try {
        const authDevice = c.get("authDevice");
        const serviceResponse = await catalogService.getProductsForDevice(authDevice);
        return handleServiceResponse(c, serviceResponse);
    } catch (error) {
        return handleError(FILE_NAME, "getProductsForDevice", c, error);
    }
});

router.get("/add-ons", async (c) => {
    try {
        const authDevice = c.get("authDevice");
        const serviceResponse = await catalogService.getAddOnsForDevice(authDevice);
        return handleServiceResponse(c, serviceResponse);
    } catch (error) {
        return handleError(FILE_NAME, "getAddOnsForDevice", c, error);
    }
});

router.get("/product-add-on-attachments", async (c) => {
    try {
        const authDevice = c.get("authDevice");
        const serviceResponse = await catalogService.getSelectableProductAddOnAttachmentsForDevice(authDevice);
        return handleServiceResponse(c, serviceResponse);
    } catch (error) {
        return handleError(FILE_NAME, "getSelectableProductAddOnAttachmentsForDevice", c, error);
    }
});

router.get("/customers", validateSchema("query", CustomerListQuerySchema), async (c) => {
    try {
        const authDevice = c.get("authDevice");
        const query = c.req.valid("query");
        const serviceResponse = await billingService.getCustomersForDevice(authDevice, query);
        return handleServiceResponse(c, serviceResponse);
    } catch (error) {
        return handleError(FILE_NAME, "getCustomersForDevice", c, error);
    }
});

router.post("/customers", validateSchema("json", CreateCustomerSchema), async (c) => {
    try {
        const authDevice = c.get("authDevice");
        const body = c.req.valid("json");
        const serviceResponse = await billingService.createCustomerForDevice(authDevice, body);
        return handleServiceResponse(c, serviceResponse);
    } catch (error) {
        return handleError(FILE_NAME, "createCustomerForDevice", c, error);
    }
});

router.get("/sales", validateSchema("query", SalesListQuerySchema), async (c) => {
    try {
        const authDevice = c.get("authDevice");
        const query = c.req.valid("query");
        const serviceResponse = await billingService.getSalesForDevice(authDevice, query);
        return handleServiceResponse(c, serviceResponse);
    } catch (error) {
        return handleError(FILE_NAME, "getSalesForDevice", c, error);
    }
});

router.post("/sales", validateSchema("json", CreateDraftSaleSchema), async (c) => {
    try {
        const authDevice = c.get("authDevice");
        const body = c.req.valid("json");
        const serviceResponse = await billingService.createDraftSaleForDevice(authDevice, body);
        return handleServiceResponse(c, serviceResponse);
    } catch (error) {
        return handleError(FILE_NAME, "createDraftSaleForDevice", c, error);
    }
});

router.get("/sales/:saleId", async (c) => {
    try {
        const saleId = c.req.param("saleId");
        const invalidSaleId = validateUuidParam(saleId, "Invalid sale id");
        if (invalidSaleId) {
            return c.json(invalidSaleId, invalidSaleId.code);
        }

        const authDevice = c.get("authDevice");
        const serviceResponse = await billingService.getSaleDetailsForDevice(authDevice, saleId);
        return handleServiceResponse(c, serviceResponse);
    } catch (error) {
        return handleError(FILE_NAME, "getSaleDetailsForDevice", c, error);
    }
});

router.patch("/sales/:saleId", validateSchema("json", UpdateDraftSaleSchema), async (c) => {
    try {
        const saleId = c.req.param("saleId");
        const invalidSaleId = validateUuidParam(saleId, "Invalid sale id");
        if (invalidSaleId) {
            return c.json(invalidSaleId, invalidSaleId.code);
        }

        const authDevice = c.get("authDevice");
        const body = c.req.valid("json");
        const serviceResponse = await billingService.updateDraftSaleForDevice(authDevice, saleId, body);
        return handleServiceResponse(c, serviceResponse);
    } catch (error) {
        return handleError(FILE_NAME, "updateDraftSaleForDevice", c, error);
    }
});

router.post("/sales/:saleId/commit", validateSchema("json", CommitSaleSchema), async (c) => {
    try {
        const saleId = c.req.param("saleId");
        const invalidSaleId = validateUuidParam(saleId, "Invalid sale id");
        if (invalidSaleId) {
            return c.json(invalidSaleId, invalidSaleId.code);
        }

        const authDevice = c.get("authDevice");
        const body = c.req.valid("json");
        const serviceResponse = await billingService.commitSaleForDevice(authDevice, saleId, body);
        return handleServiceResponse(c, serviceResponse);
    } catch (error) {
        return handleError(FILE_NAME, "commitSaleForDevice", c, error);
    }
});

router.post("/sales/:saleId/payments", validateSchema("json", CreatePaymentSchema), async (c) => {
    try {
        const saleId = c.req.param("saleId");
        const invalidSaleId = validateUuidParam(saleId, "Invalid sale id");
        if (invalidSaleId) {
            return c.json(invalidSaleId, invalidSaleId.code);
        }

        const authDevice = c.get("authDevice");
        const body = c.req.valid("json");
        const serviceResponse = await billingService.collectPaymentForDevice(authDevice, saleId, body);
        return handleServiceResponse(c, serviceResponse);
    } catch (error) {
        return handleError(FILE_NAME, "collectPaymentForDevice", c, error);
    }
});

router.post("/sales/:saleId/void", validateSchema("json", VoidSaleSchema), async (c) => {
    try {
        const saleId = c.req.param("saleId");
        const invalidSaleId = validateUuidParam(saleId, "Invalid sale id");
        if (invalidSaleId) {
            return c.json(invalidSaleId, invalidSaleId.code);
        }

        const authDevice = c.get("authDevice");
        const body = c.req.valid("json");
        const serviceResponse = await billingService.voidSaleForDevice(authDevice, saleId, body);
        return handleServiceResponse(c, serviceResponse);
    } catch (error) {
        return handleError(FILE_NAME, "voidSaleForDevice", c, error);
    }
});

export default router;
