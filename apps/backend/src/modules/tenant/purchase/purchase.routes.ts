import { Hono } from "hono";
import { z } from "zod";
import { CreatePurchaseSchema, PurchaseListQuerySchema, STATUS_CODES, UpdatePurchaseSchema, VoidPurchaseSchema } from "@repo/types";
import { handleError, handleServiceResponse } from "@/helpers/service.helper";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { validateSchema } from "@/middlewares/validate";
import type { AppVariables } from "@/types/hono";
import * as purchaseService from "./purchase.service";

const FILE_NAME = "purchase.routes";
const uuidSchema = z.uuid("Invalid id");
const router = new Hono<{ Variables: AppVariables }>();

const validateId = (value: string, message: string) => {
    const result = uuidSchema.safeParse(value);
    return result.success ? null : { status: "error" as const, message, code: STATUS_CODES.BAD_REQUEST };
};

router.use("*", authMiddleware);

router.get("/:organizationId/stores/:storeId/purchases", validateSchema("query", PurchaseListQuerySchema), async (c) => {
    try {
        const organizationId = c.req.param("organizationId");
        const storeId = c.req.param("storeId");
        const invalid = validateId(organizationId, "Invalid organization id") ?? validateId(storeId, "Invalid store id");
        if (invalid) return c.json(invalid, invalid.code);
        return handleServiceResponse(c, await purchaseService.getPurchases(c.get("authUser").id, organizationId, storeId, c.req.valid("query")));
    } catch (error) { return handleError(FILE_NAME, "getPurchases", c, error); }
});

router.get("/:organizationId/stores/:storeId/purchases/summary", async (c) => {
    try {
        const organizationId = c.req.param("organizationId");
        const storeId = c.req.param("storeId");
        const invalid = validateId(organizationId, "Invalid organization id") ?? validateId(storeId, "Invalid store id");
        if (invalid) return c.json(invalid, invalid.code);
        return handleServiceResponse(c, await purchaseService.getSummary(c.get("authUser").id, organizationId, storeId));
    } catch (error) { return handleError(FILE_NAME, "getSummary", c, error); }
});

router.post("/:organizationId/stores/:storeId/purchases", validateSchema("json", CreatePurchaseSchema), async (c) => {
    try {
        const organizationId = c.req.param("organizationId");
        const storeId = c.req.param("storeId");
        const invalid = validateId(organizationId, "Invalid organization id") ?? validateId(storeId, "Invalid store id");
        if (invalid) return c.json(invalid, invalid.code);
        return handleServiceResponse(c, await purchaseService.createPurchase(c.get("authUser").id, organizationId, storeId, c.req.valid("json")));
    } catch (error) { return handleError(FILE_NAME, "createPurchase", c, error); }
});

router.get("/:organizationId/stores/:storeId/purchases/:purchaseId", async (c) => {
    try {
        const organizationId = c.req.param("organizationId");
        const storeId = c.req.param("storeId");
        const purchaseId = c.req.param("purchaseId");
        const invalid = validateId(organizationId, "Invalid organization id") ?? validateId(storeId, "Invalid store id") ?? validateId(purchaseId, "Invalid purchase id");
        if (invalid) return c.json(invalid, invalid.code);
        return handleServiceResponse(c, await purchaseService.getPurchase(c.get("authUser").id, organizationId, storeId, purchaseId));
    } catch (error) { return handleError(FILE_NAME, "getPurchase", c, error); }
});

router.patch("/:organizationId/stores/:storeId/purchases/:purchaseId", validateSchema("json", UpdatePurchaseSchema), async (c) => {
    try {
        const organizationId = c.req.param("organizationId");
        const storeId = c.req.param("storeId");
        const purchaseId = c.req.param("purchaseId");
        const invalid = validateId(organizationId, "Invalid organization id") ?? validateId(storeId, "Invalid store id") ?? validateId(purchaseId, "Invalid purchase id");
        if (invalid) return c.json(invalid, invalid.code);
        return handleServiceResponse(c, await purchaseService.updatePurchase(c.get("authUser").id, organizationId, storeId, purchaseId, c.req.valid("json")));
    } catch (error) { return handleError(FILE_NAME, "updatePurchase", c, error); }
});

router.post("/:organizationId/stores/:storeId/purchases/:purchaseId/void", validateSchema("json", VoidPurchaseSchema), async (c) => {
    try {
        const organizationId = c.req.param("organizationId");
        const storeId = c.req.param("storeId");
        const purchaseId = c.req.param("purchaseId");
        const invalid = validateId(organizationId, "Invalid organization id") ?? validateId(storeId, "Invalid store id") ?? validateId(purchaseId, "Invalid purchase id");
        if (invalid) return c.json(invalid, invalid.code);
        return handleServiceResponse(c, await purchaseService.voidPurchase(c.get("authUser").id, organizationId, storeId, purchaseId, c.req.valid("json")));
    } catch (error) { return handleError(FILE_NAME, "voidPurchase", c, error); }
});

export default router;
