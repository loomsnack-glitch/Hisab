import { Hono } from "hono";
import { z } from "zod";
import {
    CreateCategorySchema,
    CreateProductSchema,
    STATUS_CODES,
    UpdateCategorySchema,
    UpdateProductSchema,
} from "@repo/types";
import { handleError, handleServiceResponse } from "@/helpers/service.helper";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { validateSchema } from "@/middlewares/validate";
import type { AppVariables } from "@/types/hono";
import * as catalogService from "./catalog.service";

const FILE_NAME = "catalog.routes";
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

router.get("/:organizationId/categories", async (c) => {
    try {
        const organizationId = c.req.param("organizationId");
        const invalidOrganizationId = validateUuidParam(organizationId, "Invalid organization id");
        if (invalidOrganizationId) {
            return c.json(invalidOrganizationId, invalidOrganizationId.code);
        }

        const authUser = c.get("authUser");
        const serviceResponse = await catalogService.getCategories(authUser.id, organizationId);
        return handleServiceResponse(c, serviceResponse);
    } catch (error) {
        return handleError(FILE_NAME, "getCategories", c, error);
    }
});

router.post("/:organizationId/categories", validateSchema("json", CreateCategorySchema), async (c) => {
    try {
        const organizationId = c.req.param("organizationId");
        const invalidOrganizationId = validateUuidParam(organizationId, "Invalid organization id");
        if (invalidOrganizationId) {
            return c.json(invalidOrganizationId, invalidOrganizationId.code);
        }

        const authUser = c.get("authUser");
        const body = c.req.valid("json");
        const serviceResponse = await catalogService.createCategory(authUser.id, organizationId, body);
        return handleServiceResponse(c, serviceResponse);
    } catch (error) {
        return handleError(FILE_NAME, "createCategory", c, error);
    }
});

router.get("/:organizationId/categories/:categoryId", async (c) => {
    try {
        const organizationId = c.req.param("organizationId");
        const categoryId = c.req.param("categoryId");
        const invalidOrganizationId = validateUuidParam(organizationId, "Invalid organization id");
        if (invalidOrganizationId) {
            return c.json(invalidOrganizationId, invalidOrganizationId.code);
        }

        const invalidCategoryId = validateUuidParam(categoryId, "Invalid category id");
        if (invalidCategoryId) {
            return c.json(invalidCategoryId, invalidCategoryId.code);
        }

        const authUser = c.get("authUser");
        const serviceResponse = await catalogService.getCategoryDetails(authUser.id, organizationId, categoryId);
        return handleServiceResponse(c, serviceResponse);
    } catch (error) {
        return handleError(FILE_NAME, "getCategoryDetails", c, error);
    }
});

router.patch("/:organizationId/categories/:categoryId", validateSchema("json", UpdateCategorySchema), async (c) => {
    try {
        const organizationId = c.req.param("organizationId");
        const categoryId = c.req.param("categoryId");
        const invalidOrganizationId = validateUuidParam(organizationId, "Invalid organization id");
        if (invalidOrganizationId) {
            return c.json(invalidOrganizationId, invalidOrganizationId.code);
        }

        const invalidCategoryId = validateUuidParam(categoryId, "Invalid category id");
        if (invalidCategoryId) {
            return c.json(invalidCategoryId, invalidCategoryId.code);
        }

        const authUser = c.get("authUser");
        const body = c.req.valid("json");
        const serviceResponse = await catalogService.updateCategory(authUser.id, organizationId, categoryId, body);
        return handleServiceResponse(c, serviceResponse);
    } catch (error) {
        return handleError(FILE_NAME, "updateCategory", c, error);
    }
});

router.delete("/:organizationId/categories/:categoryId", async (c) => {
    try {
        const organizationId = c.req.param("organizationId");
        const categoryId = c.req.param("categoryId");
        const invalidOrganizationId = validateUuidParam(organizationId, "Invalid organization id");
        if (invalidOrganizationId) {
            return c.json(invalidOrganizationId, invalidOrganizationId.code);
        }

        const invalidCategoryId = validateUuidParam(categoryId, "Invalid category id");
        if (invalidCategoryId) {
            return c.json(invalidCategoryId, invalidCategoryId.code);
        }

        const authUser = c.get("authUser");
        const serviceResponse = await catalogService.deleteCategory(authUser.id, organizationId, categoryId);
        return handleServiceResponse(c, serviceResponse);
    } catch (error) {
        return handleError(FILE_NAME, "deleteCategory", c, error);
    }
});

router.get("/:organizationId/categories/:categoryId/products", async (c) => {
    try {
        const organizationId = c.req.param("organizationId");
        const categoryId = c.req.param("categoryId");
        const invalidOrganizationId = validateUuidParam(organizationId, "Invalid organization id");
        if (invalidOrganizationId) {
            return c.json(invalidOrganizationId, invalidOrganizationId.code);
        }

        const invalidCategoryId = validateUuidParam(categoryId, "Invalid category id");
        if (invalidCategoryId) {
            return c.json(invalidCategoryId, invalidCategoryId.code);
        }

        const authUser = c.get("authUser");
        const serviceResponse = await catalogService.getCategoryProducts(authUser.id, organizationId, categoryId);
        return handleServiceResponse(c, serviceResponse);
    } catch (error) {
        return handleError(FILE_NAME, "getCategoryProducts", c, error);
    }
});

router.get("/:organizationId/products", async (c) => {
    try {
        const organizationId = c.req.param("organizationId");
        const invalidOrganizationId = validateUuidParam(organizationId, "Invalid organization id");
        if (invalidOrganizationId) {
            return c.json(invalidOrganizationId, invalidOrganizationId.code);
        }

        const authUser = c.get("authUser");
        const serviceResponse = await catalogService.getProducts(authUser.id, organizationId);
        return handleServiceResponse(c, serviceResponse);
    } catch (error) {
        return handleError(FILE_NAME, "getProducts", c, error);
    }
});

router.post("/:organizationId/products", validateSchema("json", CreateProductSchema), async (c) => {
    try {
        const organizationId = c.req.param("organizationId");
        const invalidOrganizationId = validateUuidParam(organizationId, "Invalid organization id");
        if (invalidOrganizationId) {
            return c.json(invalidOrganizationId, invalidOrganizationId.code);
        }

        const authUser = c.get("authUser");
        const body = c.req.valid("json");
        const serviceResponse = await catalogService.createProduct(authUser.id, organizationId, body);
        return handleServiceResponse(c, serviceResponse);
    } catch (error) {
        return handleError(FILE_NAME, "createProduct", c, error);
    }
});

router.get("/:organizationId/products/:productId", async (c) => {
    try {
        const organizationId = c.req.param("organizationId");
        const productId = c.req.param("productId");
        const invalidOrganizationId = validateUuidParam(organizationId, "Invalid organization id");
        if (invalidOrganizationId) {
            return c.json(invalidOrganizationId, invalidOrganizationId.code);
        }

        const invalidProductId = validateUuidParam(productId, "Invalid product id");
        if (invalidProductId) {
            return c.json(invalidProductId, invalidProductId.code);
        }

        const authUser = c.get("authUser");
        const serviceResponse = await catalogService.getProductDetails(authUser.id, organizationId, productId);
        return handleServiceResponse(c, serviceResponse);
    } catch (error) {
        return handleError(FILE_NAME, "getProductDetails", c, error);
    }
});

router.patch("/:organizationId/products/:productId", validateSchema("json", UpdateProductSchema), async (c) => {
    try {
        const organizationId = c.req.param("organizationId");
        const productId = c.req.param("productId");
        const invalidOrganizationId = validateUuidParam(organizationId, "Invalid organization id");
        if (invalidOrganizationId) {
            return c.json(invalidOrganizationId, invalidOrganizationId.code);
        }

        const invalidProductId = validateUuidParam(productId, "Invalid product id");
        if (invalidProductId) {
            return c.json(invalidProductId, invalidProductId.code);
        }

        const authUser = c.get("authUser");
        const body = c.req.valid("json");
        const serviceResponse = await catalogService.updateProduct(authUser.id, organizationId, productId, body);
        return handleServiceResponse(c, serviceResponse);
    } catch (error) {
        return handleError(FILE_NAME, "updateProduct", c, error);
    }
});

router.delete("/:organizationId/products/:productId", async (c) => {
    try {
        const organizationId = c.req.param("organizationId");
        const productId = c.req.param("productId");
        const invalidOrganizationId = validateUuidParam(organizationId, "Invalid organization id");
        if (invalidOrganizationId) {
            return c.json(invalidOrganizationId, invalidOrganizationId.code);
        }

        const invalidProductId = validateUuidParam(productId, "Invalid product id");
        if (invalidProductId) {
            return c.json(invalidProductId, invalidProductId.code);
        }

        const authUser = c.get("authUser");
        const serviceResponse = await catalogService.deleteProduct(authUser.id, organizationId, productId);
        return handleServiceResponse(c, serviceResponse);
    } catch (error) {
        return handleError(FILE_NAME, "deleteProduct", c, error);
    }
});

export default router;
