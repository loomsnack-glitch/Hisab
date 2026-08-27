import { Hono } from "hono";
import { z } from "zod";
import {
  STATUS_CODES,
  InvoiceAppearancePreviewRequestSchema,
  UpdateInvoiceAppearanceSettingsSchema,
} from "@repo/types";
import { handleError, handleServiceResponse } from "@/helpers/service.helper";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { validateSchema } from "@/middlewares/validate";
import type { AppVariables } from "@/types/hono";
import * as invoiceAppearanceService from "./invoice-appearance.service";

const FILE_NAME = "invoice-appearance.routes";
const uuidSchema = z.uuid("Invalid id");

const router = new Hono<{ Variables: AppVariables }>();
router.use("*", authMiddleware);

const noStore = (response: Response): Response => {
  response.headers.set("Cache-Control", "private, no-store");
  return response;
};

const validateUuidParam = (value: string, message: string) => {
  const result = uuidSchema.safeParse(value);
  if (!result.success) {
    return { status: "error" as const, message, code: STATUS_CODES.BAD_REQUEST };
  }
  return null;
};

const StoreDraftSchema = UpdateInvoiceAppearanceSettingsSchema.extend({
  usesOrganizationDefault: z.boolean().optional(),
});

router.get("/:organizationId/invoice-appearance", async (c) => {
  try {
    const organizationId = c.req.param("organizationId");
    const invalid = validateUuidParam(organizationId, "Invalid organization id");
    if (invalid) return c.json(invalid, invalid.code);
    return noStore(handleServiceResponse(
      c,
      await invoiceAppearanceService.getOrganizationInvoiceAppearance(c.get("authUser").id, organizationId),
    ));
  } catch (error) {
    return handleError(FILE_NAME, "getOrganizationInvoiceAppearance", c, error);
  }
});

router.patch(
  "/:organizationId/invoice-appearance",
  validateSchema("json", UpdateInvoiceAppearanceSettingsSchema),
  async (c) => {
    try {
      const organizationId = c.req.param("organizationId");
      const invalid = validateUuidParam(organizationId, "Invalid organization id");
      if (invalid) return c.json(invalid, invalid.code);
      return handleServiceResponse(
        c,
        await invoiceAppearanceService.updateOrganizationInvoiceAppearanceDraft(
          c.get("authUser").id,
          organizationId,
          c.req.valid("json"),
        ),
      );
    } catch (error) {
      return handleError(FILE_NAME, "updateOrganizationInvoiceAppearanceDraft", c, error);
    }
  },
);

router.post("/:organizationId/invoice-appearance/publish", async (c) => {
  try {
    const organizationId = c.req.param("organizationId");
    const invalid = validateUuidParam(organizationId, "Invalid organization id");
    if (invalid) return c.json(invalid, invalid.code);
    return handleServiceResponse(
      c,
      await invoiceAppearanceService.publishOrganizationInvoiceAppearance(c.get("authUser").id, organizationId),
    );
  } catch (error) {
    return handleError(FILE_NAME, "publishOrganizationInvoiceAppearance", c, error);
  }
});

router.post("/:organizationId/invoice-appearance/reset", async (c) => {
  try {
    const organizationId = c.req.param("organizationId");
    const invalid = validateUuidParam(organizationId, "Invalid organization id");
    if (invalid) return c.json(invalid, invalid.code);
    return handleServiceResponse(
      c,
      await invoiceAppearanceService.resetOrganizationInvoiceAppearance(c.get("authUser").id, organizationId),
    );
  } catch (error) {
    return handleError(FILE_NAME, "resetOrganizationInvoiceAppearance", c, error);
  }
});

router.get("/:organizationId/stores/:storeId/invoice-appearance", async (c) => {
  try {
    const organizationId = c.req.param("organizationId");
    const storeId = c.req.param("storeId");
    const invalidOrg = validateUuidParam(organizationId, "Invalid organization id");
    if (invalidOrg) return c.json(invalidOrg, invalidOrg.code);
    const invalidStore = validateUuidParam(storeId, "Invalid store id");
    if (invalidStore) return c.json(invalidStore, invalidStore.code);
    return noStore(handleServiceResponse(
      c,
      await invoiceAppearanceService.getStoreInvoiceAppearance(c.get("authUser").id, organizationId, storeId),
    ));
  } catch (error) {
    return handleError(FILE_NAME, "getStoreInvoiceAppearance", c, error);
  }
});

router.patch(
  "/:organizationId/stores/:storeId/invoice-appearance",
  validateSchema("json", StoreDraftSchema),
  async (c) => {
    try {
      const organizationId = c.req.param("organizationId");
      const storeId = c.req.param("storeId");
      const invalidOrg = validateUuidParam(organizationId, "Invalid organization id");
      if (invalidOrg) return c.json(invalidOrg, invalidOrg.code);
      const invalidStore = validateUuidParam(storeId, "Invalid store id");
      if (invalidStore) return c.json(invalidStore, invalidStore.code);
      return handleServiceResponse(
        c,
        await invoiceAppearanceService.updateStoreInvoiceAppearanceDraft(
          c.get("authUser").id,
          organizationId,
          storeId,
          c.req.valid("json"),
        ),
      );
    } catch (error) {
      return handleError(FILE_NAME, "updateStoreInvoiceAppearanceDraft", c, error);
    }
  },
);

router.post("/:organizationId/stores/:storeId/invoice-appearance/publish", async (c) => {
  try {
    const organizationId = c.req.param("organizationId");
    const storeId = c.req.param("storeId");
    const invalidOrg = validateUuidParam(organizationId, "Invalid organization id");
    if (invalidOrg) return c.json(invalidOrg, invalidOrg.code);
    const invalidStore = validateUuidParam(storeId, "Invalid store id");
    if (invalidStore) return c.json(invalidStore, invalidStore.code);
    return handleServiceResponse(
      c,
      await invoiceAppearanceService.publishStoreInvoiceAppearance(c.get("authUser").id, organizationId, storeId),
    );
  } catch (error) {
    return handleError(FILE_NAME, "publishStoreInvoiceAppearance", c, error);
  }
});

router.post("/:organizationId/stores/:storeId/invoice-appearance/reset", async (c) => {
  try {
    const organizationId = c.req.param("organizationId");
    const storeId = c.req.param("storeId");
    const invalidOrg = validateUuidParam(organizationId, "Invalid organization id");
    if (invalidOrg) return c.json(invalidOrg, invalidOrg.code);
    const invalidStore = validateUuidParam(storeId, "Invalid store id");
    if (invalidStore) return c.json(invalidStore, invalidStore.code);
    return handleServiceResponse(
      c,
      await invoiceAppearanceService.resetStoreInvoiceAppearance(c.get("authUser").id, organizationId, storeId),
    );
  } catch (error) {
    return handleError(FILE_NAME, "resetStoreInvoiceAppearance", c, error);
  }
});

router.post(
  "/:organizationId/stores/:storeId/invoice-appearance/preview",
  validateSchema("json", InvoiceAppearancePreviewRequestSchema),
  async (c) => {
    try {
      const organizationId = c.req.param("organizationId");
      const storeId = c.req.param("storeId");
      const invalidOrg = validateUuidParam(organizationId, "Invalid organization id");
      if (invalidOrg) return c.json(invalidOrg, invalidOrg.code);
      const invalidStore = validateUuidParam(storeId, "Invalid store id");
      if (invalidStore) return c.json(invalidStore, invalidStore.code);
      const body = c.req.valid("json");
      const { viewport, mode, usesOrganizationDefault, ...updates } = body;
      return handleServiceResponse(
        c,
        await invoiceAppearanceService.previewInvoiceAppearance(
          c.get("authUser").id,
          organizationId,
          storeId,
          { ...updates, viewport, mode, usesOrganizationDefault },
        ),
      );
    } catch (error) {
      return handleError(FILE_NAME, "previewInvoiceAppearance", c, error);
    }
  },
);

export default router;
