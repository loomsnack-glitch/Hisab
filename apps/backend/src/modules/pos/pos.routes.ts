import { Hono } from "hono";
import { z } from "zod";
import {
    CommitSaleSchema,
    CompleteSaleSchema,
    ReplaceSaleSchema,
    CreateCustomerSchema,
    CreateDraftSaleSchema,
    CreatePaymentSchema,
    CustomerListQuerySchema,
    SalesListQuerySchema,
    STATUS_CODES,
    UpdateCustomerSchema,
    UpdateDraftSaleSchema,
    VoidSaleSchema,
    CreatePurchaseSchema,
    PurchaseListQuerySchema,
    UpdatePurchaseSchema,
    VoidPurchaseSchema,
} from "@repo/types";
import { handleError, handleServiceResponse } from "@/helpers/service.helper";
import { deviceAuthMiddleware } from "@/middlewares/device-auth.middleware";
import { validateSchema } from "@/middlewares/validate";
import type { AppVariables } from "@/types/hono";
import * as billingService from "@/modules/tenant/billing/billing.service";
import * as catalogService from "@/modules/tenant/catalog/catalog.service";
import * as purchaseService from "@/modules/tenant/purchase/purchase.service";

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

router.get("/combos", async (c) => {
    try {
        const serviceResponse = await catalogService.getComboProductDetailsForDeviceBulk(c.get("authDevice"));
        return handleServiceResponse(c, serviceResponse);
    } catch (error) {
        return handleError(FILE_NAME, "getComboProductDetailsForDeviceBulk", c, error);
    }
});

router.get("/combos/:productId", async (c) => {
    try {
        const productId = c.req.param("productId");
        const invalidProductId = validateUuidParam(productId, "Invalid product id");
        if (invalidProductId) return c.json(invalidProductId, invalidProductId.code);
        const serviceResponse = await catalogService.getComboProductDetailsForDevice(c.get("authDevice"), productId);
        return handleServiceResponse(c, serviceResponse);
    } catch (error) {
        return handleError(FILE_NAME, "getComboProductDetailsForDevice", c, error);
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

router.patch("/customers/:customerId", validateSchema("json", UpdateCustomerSchema), async (c) => {
    try {
        const customerId = c.req.param("customerId");
        const invalidCustomerId = validateUuidParam(customerId, "Invalid customer id");
        if (invalidCustomerId) {
            return c.json(invalidCustomerId, invalidCustomerId.code);
        }

        const authDevice = c.get("authDevice");
        const body = c.req.valid("json");
        const serviceResponse = await billingService.updateCustomerForDevice(authDevice, customerId, body);
        return handleServiceResponse(c, serviceResponse);
    } catch (error) {
        return handleError(FILE_NAME, "updateCustomerForDevice", c, error);
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

router.get("/purchases", validateSchema("query", PurchaseListQuerySchema), async (c) => {
    try {
        return handleServiceResponse(
            c,
            await purchaseService.getPurchasesForDevice(c.get("authDevice"), c.req.valid("query")),
        );
    } catch (error) {
        return handleError(FILE_NAME, "getPurchasesForDevice", c, error);
    }
});

router.get("/purchases/summary", async (c) => {
    try {
        return handleServiceResponse(c, await purchaseService.getSummaryForDevice(c.get("authDevice")));
    } catch (error) {
        return handleError(FILE_NAME, "getSummaryForDevice", c, error);
    }
});

router.post("/purchases", validateSchema("json", CreatePurchaseSchema), async (c) => {
    try {
        return handleServiceResponse(
            c,
            await purchaseService.createPurchaseForDevice(c.get("authDevice"), c.req.valid("json")),
        );
    } catch (error) {
        return handleError(FILE_NAME, "createPurchaseForDevice", c, error);
    }
});

router.get("/purchases/:purchaseId", async (c) => {
    try {
        const purchaseId = c.req.param("purchaseId");
        const invalid = validateUuidParam(purchaseId, "Invalid purchase id");
        if (invalid) return c.json(invalid, invalid.code);
        return handleServiceResponse(c, await purchaseService.getPurchaseForDevice(c.get("authDevice"), purchaseId));
    } catch (error) {
        return handleError(FILE_NAME, "getPurchaseForDevice", c, error);
    }
});

router.patch("/purchases/:purchaseId", validateSchema("json", UpdatePurchaseSchema), async (c) => {
    try {
        const purchaseId = c.req.param("purchaseId");
        const invalid = validateUuidParam(purchaseId, "Invalid purchase id");
        if (invalid) return c.json(invalid, invalid.code);
        return handleServiceResponse(
            c,
            await purchaseService.updatePurchaseForDevice(c.get("authDevice"), purchaseId, c.req.valid("json")),
        );
    } catch (error) {
        return handleError(FILE_NAME, "updatePurchaseForDevice", c, error);
    }
});

router.post("/purchases/:purchaseId/void", validateSchema("json", VoidPurchaseSchema), async (c) => {
    try {
        const purchaseId = c.req.param("purchaseId");
        const invalid = validateUuidParam(purchaseId, "Invalid purchase id");
        if (invalid) return c.json(invalid, invalid.code);
        return handleServiceResponse(
            c,
            await purchaseService.voidPurchaseForDevice(c.get("authDevice"), purchaseId, c.req.valid("json")),
        );
    } catch (error) {
        return handleError(FILE_NAME, "voidPurchaseForDevice", c, error);
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

router.post("/sales/complete", validateSchema("json", CompleteSaleSchema), async (c) => {
    try {
        const authDevice = c.get("authDevice");
        const body = c.req.valid("json");
        const serviceResponse = await billingService.completeSaleForDevice(authDevice, body);
        return handleServiceResponse(c, serviceResponse);
    } catch (error) {
        return handleError(FILE_NAME, "completeSaleForDevice", c, error);
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

router.post("/sales/:saleId/replace", validateSchema("json", ReplaceSaleSchema), async (c) => {
    try {
        const saleId = c.req.param("saleId");
        const invalidSaleId = validateUuidParam(saleId, "Invalid sale id");
        if (invalidSaleId) {
            return c.json(invalidSaleId, invalidSaleId.code);
        }

        const authDevice = c.get("authDevice");
        const body = c.req.valid("json");
        const serviceResponse = await billingService.replaceSaleForDevice(authDevice, saleId, body);
        return handleServiceResponse(c, serviceResponse);
    } catch (error) {
        return handleError(FILE_NAME, "replaceSaleForDevice", c, error);
    }
});

router.delete("/sales/:saleId", async (c) => {
    try {
        const saleId = c.req.param("saleId");
        const invalidSaleId = validateUuidParam(saleId, "Invalid sale id");
        if (invalidSaleId) {
            return c.json(invalidSaleId, invalidSaleId.code);
        }

        const authDevice = c.get("authDevice");
        const serviceResponse = await billingService.deleteDraftSaleForDevice(authDevice, saleId);
        return handleServiceResponse(c, serviceResponse);
    } catch (error) {
        return handleError(FILE_NAME, "deleteDraftSaleForDevice", c, error);
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
