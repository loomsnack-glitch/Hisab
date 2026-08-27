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
  ProductSalesSummaryQuerySchema,
  SalesListQuerySchema,
  STATUS_CODES,
  UpdateCustomerSchema,
  UpdateDraftSaleSchema,
  VoidSaleSchema,
  CreatePurchaseSchema,
  PurchaseListQuerySchema,
  UpdatePurchaseSchema,
  UpdateStoreDevicePosSettingsSchema,
  VoidPurchaseSchema,
  WhatsAppAttachConversationCustomerSchema,
  WhatsAppSendConversationTextSchema,
  WhatsAppDueReminderRequestSchema,
  CreateTableKotSchema,
  UpdateTableKotSchema,
  UpdateStandaloneKotSchema,
  UpdateTableOrderSchema,
  CheckoutTableOrderSchema,
} from "@repo/types";
import { handleError, handleServiceResponse } from "@/helpers/service.helper";
import { deviceAuthMiddleware } from "@/middlewares/device-auth.middleware";
import { validateSchema } from "@/middlewares/validate";
import type { AppVariables } from "@/types/hono";
import * as billingService from "@/modules/tenant/billing/billing.service";
import * as catalogService from "@/modules/tenant/catalog/catalog.service";
import * as purchaseService from "@/modules/tenant/purchase/purchase.service";
import * as organizationService from "@/modules/tenant/organization/organization.service";
import * as tableService from "@/modules/tenant/table-service/table-service.service";
import * as kotService from "@/modules/tenant/kot/kot.service";
import * as whatsappService from "@/modules/tenant/whatsapp/whatsapp.service";

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

router.get("/whatsapp/templates", async (c) => {
  try {
    const rawKind = c.req.query("kind");
    const kind =
      rawKind === "bill" ||
      rawKind === "due_reminder" ||
      rawKind === "promotion"
        ? rawKind
        : undefined;
    if (rawKind && !kind)
      return c.json(
        {
          status: "error",
          message: "Invalid template kind",
          code: STATUS_CODES.BAD_REQUEST,
        },
        STATUS_CODES.BAD_REQUEST,
      );
    return handleServiceResponse(
      c,
      await whatsappService.listMessageTemplatesForDevice(
        c.get("authDevice"),
        kind,
      ),
    );
  } catch (error) {
    return handleError(FILE_NAME, "listMessageTemplatesForDevice", c, error);
  }
});

router.get("/tables", async (c) => {
  try {
    return handleServiceResponse(
      c,
      await tableService.getServiceTablesForDevice(c.get("authDevice")),
    );
  } catch (error) {
    return handleError(FILE_NAME, "getServiceTablesForDevice", c, error);
  }
});

router.get("/areas", async (c) => {
  try {
    return handleServiceResponse(
      c,
      await tableService.getServiceAreasForDevice(c.get("authDevice")),
    );
  } catch (error) {
    return handleError(FILE_NAME, "getServiceAreasForDevice", c, error);
  }
});

router.post("/tables/:tableId/allocate", async (c) => {
  try {
    const tableId = c.req.param("tableId");
    const invalidTableId = validateUuidParam(tableId, "Invalid table id");
    if (invalidTableId) return c.json(invalidTableId, invalidTableId.code);
    return handleServiceResponse(
      c,
      await tableService.allocateServiceTableForDevice(
        c.get("authDevice"),
        tableId,
      ),
    );
  } catch (error) {
    return handleError(FILE_NAME, "allocateServiceTableForDevice", c, error);
  }
});

router.post("/tables/:tableId/free", async (c) => {
  try {
    const tableId = c.req.param("tableId");
    const invalidTableId = validateUuidParam(tableId, "Invalid table id");
    if (invalidTableId) return c.json(invalidTableId, invalidTableId.code);
    return handleServiceResponse(
      c,
      await tableService.freeAllocatedServiceTableForDevice(
        c.get("authDevice"),
        tableId,
      ),
    );
  } catch (error) {
    return handleError(
      FILE_NAME,
      "freeAllocatedServiceTableForDevice",
      c,
      error,
    );
  }
});

router.post("/tables/:tableId/order", async (c) => {
  try {
    const tableId = c.req.param("tableId");
    const invalidTableId = validateUuidParam(tableId, "Invalid table id");
    if (invalidTableId) return c.json(invalidTableId, invalidTableId.code);
    return handleServiceResponse(
      c,
      await tableService.startServiceTableOrderForDevice(
        c.get("authDevice"),
        tableId,
      ),
    );
  } catch (error) {
    return handleError(FILE_NAME, "startServiceTableOrderForDevice", c, error);
  }
});

router.get("/tables/:tableId/order", async (c) => {
  try {
    const tableId = c.req.param("tableId");
    const invalidTableId = validateUuidParam(tableId, "Invalid table id");
    if (invalidTableId) return c.json(invalidTableId, invalidTableId.code);
    return handleServiceResponse(
      c,
      await tableService.getServiceTableOrderForDevice(
        c.get("authDevice"),
        tableId,
      ),
    );
  } catch (error) {
    return handleError(FILE_NAME, "getServiceTableOrderForDevice", c, error);
  }
});

router.delete("/tables/:tableId/order", async (c) => {
  try {
    const tableId = c.req.param("tableId");
    const invalidTableId = validateUuidParam(tableId, "Invalid table id");
    if (invalidTableId) return c.json(invalidTableId, invalidTableId.code);
    return handleServiceResponse(
      c,
      await tableService.cancelServiceTableOrderForDevice(
        c.get("authDevice"),
        tableId,
      ),
    );
  } catch (error) {
    return handleError(FILE_NAME, "cancelServiceTableOrderForDevice", c, error);
  }
});

router.patch(
  "/tables/:tableId/order",
  validateSchema("json", UpdateTableOrderSchema),
  async (c) => {
    try {
      const tableId = c.req.param("tableId");
      const invalidTableId = validateUuidParam(tableId, "Invalid table id");
      if (invalidTableId) return c.json(invalidTableId, invalidTableId.code);
      return handleServiceResponse(
        c,
        await kotService.updateActiveTableOrderForDevice(
          c.get("authDevice"),
          tableId,
          c.req.valid("json"),
        ),
      );
    } catch (error) {
      return handleError(
        FILE_NAME,
        "updateActiveTableOrderForDevice",
        c,
        error,
      );
    }
  },
);

router.post(
  "/tables/:tableId/kots",
  validateSchema("json", CreateTableKotSchema),
  async (c) => {
    try {
      const tableId = c.req.param("tableId");
      const invalidTableId = validateUuidParam(tableId, "Invalid table id");
      if (invalidTableId) return c.json(invalidTableId, invalidTableId.code);
      return handleServiceResponse(
        c,
        await kotService.createTableKotForDevice(
          c.get("authDevice"),
          tableId,
          c.req.valid("json"),
        ),
      );
    } catch (error) {
      return handleError(FILE_NAME, "createTableKotForDevice", c, error);
    }
  },
);

router.patch(
  "/tables/:tableId/kots/:kotId",
  validateSchema("json", UpdateTableKotSchema),
  async (c) => {
    try {
      const tableId = c.req.param("tableId");
      const kotId = c.req.param("kotId");
      const invalidTableId = validateUuidParam(tableId, "Invalid table id");
      if (invalidTableId) return c.json(invalidTableId, invalidTableId.code);
      const invalidKotId = validateUuidParam(kotId, "Invalid KOT id");
      if (invalidKotId) return c.json(invalidKotId, invalidKotId.code);
      return handleServiceResponse(
        c,
        await kotService.updateTableKotForDevice(
          c.get("authDevice"),
          tableId,
          kotId,
          c.req.valid("json"),
        ),
      );
    } catch (error) {
      return handleError(FILE_NAME, "updateTableKotForDevice", c, error);
    }
  },
);

router.patch(
  "/sales/:saleId/kots/:kotId",
  validateSchema("json", UpdateStandaloneKotSchema),
  async (c) => {
    try {
      const saleId = c.req.param("saleId");
      const kotId = c.req.param("kotId");
      const invalidSaleId = validateUuidParam(saleId, "Invalid sale id");
      if (invalidSaleId) return c.json(invalidSaleId, invalidSaleId.code);
      const invalidKotId = validateUuidParam(kotId, "Invalid KOT id");
      if (invalidKotId) return c.json(invalidKotId, invalidKotId.code);
      return handleServiceResponse(
        c,
        await kotService.updateStandaloneKotForDevice(
          c.get("authDevice"),
          saleId,
          kotId,
          c.req.valid("json"),
        ),
      );
    } catch (error) {
      return handleError(FILE_NAME, "updateStandaloneKotForDevice", c, error);
    }
  },
);

router.post(
  "/tables/:tableId/checkout",
  validateSchema("json", CheckoutTableOrderSchema),
  async (c) => {
    try {
      const tableId = c.req.param("tableId");
      const invalidTableId = validateUuidParam(tableId, "Invalid table id");
      if (invalidTableId) return c.json(invalidTableId, invalidTableId.code);
      return handleServiceResponse(
        c,
        await kotService.checkoutTableOrderForDevice(
          c.get("authDevice"),
          tableId,
          c.req.valid("json"),
        ),
      );
    } catch (error) {
      return handleError(FILE_NAME, "checkoutTableOrderForDevice", c, error);
    }
  },
);

router.post("/tables/:tableId/free-paid", async (c) => {
  try {
    const tableId = c.req.param("tableId");
    const invalidTableId = validateUuidParam(tableId, "Invalid table id");
    if (invalidTableId) return c.json(invalidTableId, invalidTableId.code);
    return handleServiceResponse(
      c,
      await tableService.freePaidServiceTableForDevice(
        c.get("authDevice"),
        tableId,
      ),
    );
  } catch (error) {
    return handleError(FILE_NAME, "freePaidServiceTableForDevice", c, error);
  }
});

router.post("/tables/:tableId/free-due", async (c) => {
  try {
    const tableId = c.req.param("tableId");
    const invalidTableId = validateUuidParam(tableId, "Invalid table id");
    if (invalidTableId) return c.json(invalidTableId, invalidTableId.code);
    return handleServiceResponse(
      c,
      await tableService.freeDueServiceTableForDevice(
        c.get("authDevice"),
        tableId,
      ),
    );
  } catch (error) {
    return handleError(FILE_NAME, "freeDueServiceTableForDevice", c, error);
  }
});

router.get("/categories", async (c) => {
  try {
    const authDevice = c.get("authDevice");
    const serviceResponse =
      await catalogService.getCategoriesForDevice(authDevice);
    return handleServiceResponse(c, serviceResponse);
  } catch (error) {
    return handleError(FILE_NAME, "getCategoriesForDevice", c, error);
  }
});

router.get("/products", async (c) => {
  try {
    const authDevice = c.get("authDevice");
    const serviceResponse =
      await catalogService.getProductsForDevice(authDevice);
    return handleServiceResponse(c, serviceResponse);
  } catch (error) {
    return handleError(FILE_NAME, "getProductsForDevice", c, error);
  }
});

router.get("/settings", async (c) => {
  try {
    return handleServiceResponse(
      c,
      await organizationService.getPosSettingsForDevice(c.get("authDevice")),
    );
  } catch (error) {
    return handleError(FILE_NAME, "getPosSettingsForDevice", c, error);
  }
});

router.patch(
  "/settings",
  validateSchema("json", UpdateStoreDevicePosSettingsSchema),
  async (c) => {
    try {
      return handleServiceResponse(
        c,
        await organizationService.updatePosSettingsForDevice(
          c.get("authDevice"),
          c.req.valid("json"),
        ),
      );
    } catch (error) {
      return handleError(FILE_NAME, "updatePosSettingsForDevice", c, error);
    }
  },
);

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
    const serviceResponse =
      await catalogService.getSelectableProductAddOnAttachmentsForDevice(
        authDevice,
      );
    return handleServiceResponse(c, serviceResponse);
  } catch (error) {
    return handleError(
      FILE_NAME,
      "getSelectableProductAddOnAttachmentsForDevice",
      c,
      error,
    );
  }
});

router.get("/combos", async (c) => {
  try {
    const serviceResponse =
      await catalogService.getComboProductDetailsForDeviceBulk(
        c.get("authDevice"),
      );
    return handleServiceResponse(c, serviceResponse);
  } catch (error) {
    return handleError(
      FILE_NAME,
      "getComboProductDetailsForDeviceBulk",
      c,
      error,
    );
  }
});

router.get("/combos/:productId", async (c) => {
  try {
    const productId = c.req.param("productId");
    const invalidProductId = validateUuidParam(productId, "Invalid product id");
    if (invalidProductId)
      return c.json(invalidProductId, invalidProductId.code);
    const serviceResponse =
      await catalogService.getComboProductDetailsForDevice(
        c.get("authDevice"),
        productId,
      );
    return handleServiceResponse(c, serviceResponse);
  } catch (error) {
    return handleError(FILE_NAME, "getComboProductDetailsForDevice", c, error);
  }
});

router.get(
  "/customers",
  validateSchema("query", CustomerListQuerySchema),
  async (c) => {
    try {
      const authDevice = c.get("authDevice");
      const query = c.req.valid("query");
      const serviceResponse = await billingService.getCustomersForDevice(
        authDevice,
        query,
      );
      return handleServiceResponse(c, serviceResponse);
    } catch (error) {
      return handleError(FILE_NAME, "getCustomersForDevice", c, error);
    }
  },
);

router.post(
  "/customers",
  validateSchema("json", CreateCustomerSchema),
  async (c) => {
    try {
      const authDevice = c.get("authDevice");
      const body = c.req.valid("json");
      const serviceResponse = await billingService.createCustomerForDevice(
        authDevice,
        body,
      );
      return handleServiceResponse(c, serviceResponse);
    } catch (error) {
      return handleError(FILE_NAME, "createCustomerForDevice", c, error);
    }
  },
);

router.patch(
  "/customers/:customerId",
  validateSchema("json", UpdateCustomerSchema),
  async (c) => {
    try {
      const customerId = c.req.param("customerId");
      const invalidCustomerId = validateUuidParam(
        customerId,
        "Invalid customer id",
      );
      if (invalidCustomerId) {
        return c.json(invalidCustomerId, invalidCustomerId.code);
      }

      const authDevice = c.get("authDevice");
      const body = c.req.valid("json");
      const serviceResponse = await billingService.updateCustomerForDevice(
        authDevice,
        customerId,
        body,
      );
      return handleServiceResponse(c, serviceResponse);
    } catch (error) {
      return handleError(FILE_NAME, "updateCustomerForDevice", c, error);
    }
  },
);

router.get(
  "/sales",
  validateSchema("query", SalesListQuerySchema),
  async (c) => {
    try {
      const authDevice = c.get("authDevice");
      const query = c.req.valid("query");
      const serviceResponse = await billingService.getSalesForDevice(
        authDevice,
        query,
      );
      return handleServiceResponse(c, serviceResponse);
    } catch (error) {
      return handleError(FILE_NAME, "getSalesForDevice", c, error);
    }
  },
);

router.get(
  "/product-sales-summary",
  validateSchema("query", ProductSalesSummaryQuerySchema),
  async (c) => {
    try {
      const serviceResponse =
        await billingService.getProductSalesSummaryForDevice(
          c.get("authDevice"),
          c.req.valid("query"),
        );
      return handleServiceResponse(c, serviceResponse);
    } catch (error) {
      return handleError(
        FILE_NAME,
        "getProductSalesSummaryForDevice",
        c,
        error,
      );
    }
  },
);

router.get("/sales/:saleId/whatsapp", async (c) => {
  try {
    const saleId = c.req.param("saleId");
    const invalidSaleId = validateUuidParam(saleId, "Invalid sale id");
    if (invalidSaleId) return c.json(invalidSaleId, invalidSaleId.code);
    return handleServiceResponse(
      c,
      await whatsappService.getInvoiceStatusForDevice(
        c.get("authDevice"),
        saleId,
      ),
    );
  } catch (error) {
    return handleError(FILE_NAME, "getInvoiceStatusForDevice", c, error);
  }
});

router.post("/sales/:saleId/whatsapp", async (c) => {
  try {
    const saleId = c.req.param("saleId");
    const invalidSaleId = validateUuidParam(saleId, "Invalid sale id");
    if (invalidSaleId) return c.json(invalidSaleId, invalidSaleId.code);
    const payload = await c.req.json().catch(() => ({}));
    const customMessage =
      typeof payload?.customMessage === "string"
        ? payload.customMessage
        : undefined;
    const templateId =
      typeof payload?.templateId === "string" ? payload.templateId : undefined;
    const invalidTemplateId = templateId
      ? validateUuidParam(templateId, "Invalid template id")
      : null;
    if (invalidTemplateId)
      return c.json(invalidTemplateId, invalidTemplateId.code);
    return handleServiceResponse(
      c,
      await whatsappService.queueInvoiceForDevice(
        c.get("authDevice"),
        saleId,
        customMessage,
        templateId,
      ),
    );
  } catch (error) {
    return handleError(FILE_NAME, "queueInvoiceForDevice", c, error);
  }
});

router.post("/sales/:saleId/whatsapp/retry", async (c) => {
  try {
    const saleId = c.req.param("saleId");
    const invalidSaleId = validateUuidParam(saleId, "Invalid sale id");
    if (invalidSaleId) return c.json(invalidSaleId, invalidSaleId.code);
    return handleServiceResponse(
      c,
      await whatsappService.retryInvoiceForDevice(c.get("authDevice"), saleId),
    );
  } catch (error) {
    return handleError(FILE_NAME, "retryInvoiceForDevice", c, error);
  }
});

router.post("/sales/:saleId/whatsapp/resend", async (c) => {
  try {
    const saleId = c.req.param("saleId");
    const invalidSaleId = validateUuidParam(saleId, "Invalid sale id");
    if (invalidSaleId) return c.json(invalidSaleId, invalidSaleId.code);
    const payload = await c.req.json().catch(() => ({}));
    const requestId = typeof payload?.requestId === "string" ? payload.requestId : undefined;
    return handleServiceResponse(
      c,
      await whatsappService.resendInvoiceForDevice(c.get("authDevice"), saleId, requestId),
    );
  } catch (error) {
    return handleError(FILE_NAME, "resendInvoiceForDevice", c, error);
  }
});

router.post("/customers/:customerId/whatsapp/due-reminder", async (c) => {
  try {
    const customerId = c.req.param("customerId");
    const invalid = validateUuidParam(customerId, "Invalid customer id");
    if (invalid) return c.json(invalid, invalid.code);
    const payload = await c.req.json().catch(() => ({}));
    const parsed = WhatsAppDueReminderRequestSchema.safeParse(payload);
    if (!parsed.success)
      return c.json(
        { status: "error", message: "Invalid due reminder request" },
        STATUS_CODES.BAD_REQUEST,
      );
    return handleServiceResponse(
      c,
      await whatsappService.queueDueReminderForDevice(
        c.get("authDevice"),
        customerId,
        parsed.data.customMessage,
        parsed.data.saleId,
      ),
    );
  } catch (error) {
    return handleError(FILE_NAME, "queueDueReminderForDevice", c, error);
  }
});

router.get("/sales/:saleId/whatsapp/due-reminder", async (c) => {
  try {
    const saleId = c.req.param("saleId");
    const invalidSaleId = validateUuidParam(saleId, "Invalid sale id");
    if (invalidSaleId) return c.json(invalidSaleId, invalidSaleId.code);
    return handleServiceResponse(
      c,
      await whatsappService.getDueReminderStatusForDevice(
        c.get("authDevice"),
        saleId,
      ),
    );
  } catch (error) {
    return handleError(FILE_NAME, "getDueReminderStatusForDevice", c, error);
  }
});

router.get("/whatsapp/conversations", async (c) => {
  try {
    return handleServiceResponse(
      c,
      await whatsappService.listConversationsForDevice(c.get("authDevice")),
    );
  } catch (error) {
    return handleError(FILE_NAME, "listConversationsForDevice", c, error);
  }
});

router.get("/whatsapp/account", async (c) => {
  try {
    return handleServiceResponse(
      c,
      await whatsappService.getAccountForDevice(c.get("authDevice")),
    );
  } catch (error) {
    return handleError(FILE_NAME, "getAccountForDevice", c, error);
  }
});

router.post("/whatsapp/account/connect", async (c) => {
  try {
    return handleServiceResponse(
      c,
      await whatsappService.connectAccountForDevice(c.get("authDevice")),
    );
  } catch (error) {
    return handleError(FILE_NAME, "connectAccountForDevice", c, error);
  }
});

router.post("/whatsapp/sync", async (c) => {
  try {
    return handleServiceResponse(
      c,
      await whatsappService.syncAccountForDevice(c.get("authDevice")),
    );
  } catch (error) {
    return handleError(FILE_NAME, "syncAccountForDevice", c, error);
  }
});

router.get("/whatsapp/conversations/:conversationId", async (c) => {
  try {
    const conversationId = c.req.param("conversationId");
    const invalid = validateUuidParam(
      conversationId,
      "Invalid conversation id",
    );
    if (invalid) return c.json(invalid, invalid.code);
    return handleServiceResponse(
      c,
      await whatsappService.getConversationForDevice(
        c.get("authDevice"),
        conversationId,
      ),
    );
  } catch (error) {
    return handleError(FILE_NAME, "getConversationForDevice", c, error);
  }
});

router.post(
  "/whatsapp/conversations/:conversationId/messages",
  validateSchema("json", WhatsAppSendConversationTextSchema),
  async (c) => {
    try {
      const conversationId = c.req.param("conversationId");
      const invalid = validateUuidParam(
        conversationId,
        "Invalid conversation id",
      );
      if (invalid) return c.json(invalid, invalid.code);
      return handleServiceResponse(
        c,
        await whatsappService.sendTextForDevice(
          c.get("authDevice"),
          conversationId,
          c.req.valid("json"),
        ),
      );
    } catch (error) {
      return handleError(FILE_NAME, "sendTextForDevice", c, error);
    }
  },
);

router.post(
  "/whatsapp/conversations/:conversationId/customer",
  validateSchema("json", WhatsAppAttachConversationCustomerSchema),
  async (c) => {
    try {
      const conversationId = c.req.param("conversationId");
      const invalid = validateUuidParam(
        conversationId,
        "Invalid conversation id",
      );
      if (invalid) return c.json(invalid, invalid.code);
      return handleServiceResponse(
        c,
        await whatsappService.attachCustomerForDevice(
          c.get("authDevice"),
          conversationId,
          c.req.valid("json"),
        ),
      );
    } catch (error) {
      return handleError(FILE_NAME, "attachCustomerForDevice", c, error);
    }
  },
);

router.get(
  "/whatsapp/conversations/:conversationId/messages/:messageId/attachment",
  async (c) => {
    try {
      const conversationId = c.req.param("conversationId");
      const messageId = c.req.param("messageId");
      const invalid =
        validateUuidParam(conversationId, "Invalid conversation id") ??
        validateUuidParam(messageId, "Invalid message id");
      if (invalid) return c.json(invalid, invalid.code);
      return handleServiceResponse(
        c,
        await whatsappService.getAttachmentForDevice(
          c.get("authDevice"),
          conversationId,
          messageId,
        ),
      );
    } catch (error) {
      return handleError(FILE_NAME, "getAttachmentForDevice", c, error);
    }
  },
);

router.get(
  "/purchases",
  validateSchema("query", PurchaseListQuerySchema),
  async (c) => {
    try {
      return handleServiceResponse(
        c,
        await purchaseService.getPurchasesForDevice(
          c.get("authDevice"),
          c.req.valid("query"),
        ),
      );
    } catch (error) {
      return handleError(FILE_NAME, "getPurchasesForDevice", c, error);
    }
  },
);

router.get("/purchases/summary", async (c) => {
  try {
    return handleServiceResponse(
      c,
      await purchaseService.getSummaryForDevice(c.get("authDevice")),
    );
  } catch (error) {
    return handleError(FILE_NAME, "getSummaryForDevice", c, error);
  }
});

router.post(
  "/purchases",
  validateSchema("json", CreatePurchaseSchema),
  async (c) => {
    try {
      return handleServiceResponse(
        c,
        await purchaseService.createPurchaseForDevice(
          c.get("authDevice"),
          c.req.valid("json"),
        ),
      );
    } catch (error) {
      return handleError(FILE_NAME, "createPurchaseForDevice", c, error);
    }
  },
);

router.get("/purchases/:purchaseId", async (c) => {
  try {
    const purchaseId = c.req.param("purchaseId");
    const invalid = validateUuidParam(purchaseId, "Invalid purchase id");
    if (invalid) return c.json(invalid, invalid.code);
    return handleServiceResponse(
      c,
      await purchaseService.getPurchaseForDevice(
        c.get("authDevice"),
        purchaseId,
      ),
    );
  } catch (error) {
    return handleError(FILE_NAME, "getPurchaseForDevice", c, error);
  }
});

router.patch(
  "/purchases/:purchaseId",
  validateSchema("json", UpdatePurchaseSchema),
  async (c) => {
    try {
      const purchaseId = c.req.param("purchaseId");
      const invalid = validateUuidParam(purchaseId, "Invalid purchase id");
      if (invalid) return c.json(invalid, invalid.code);
      return handleServiceResponse(
        c,
        await purchaseService.updatePurchaseForDevice(
          c.get("authDevice"),
          purchaseId,
          c.req.valid("json"),
        ),
      );
    } catch (error) {
      return handleError(FILE_NAME, "updatePurchaseForDevice", c, error);
    }
  },
);

router.post(
  "/purchases/:purchaseId/void",
  validateSchema("json", VoidPurchaseSchema),
  async (c) => {
    try {
      const purchaseId = c.req.param("purchaseId");
      const invalid = validateUuidParam(purchaseId, "Invalid purchase id");
      if (invalid) return c.json(invalid, invalid.code);
      return handleServiceResponse(
        c,
        await purchaseService.voidPurchaseForDevice(
          c.get("authDevice"),
          purchaseId,
          c.req.valid("json"),
        ),
      );
    } catch (error) {
      return handleError(FILE_NAME, "voidPurchaseForDevice", c, error);
    }
  },
);

router.post(
  "/sales",
  validateSchema("json", CreateDraftSaleSchema),
  async (c) => {
    try {
      const authDevice = c.get("authDevice");
      const body = c.req.valid("json");
      const serviceResponse = await billingService.createDraftSaleForDevice(
        authDevice,
        body,
      );
      return handleServiceResponse(c, serviceResponse);
    } catch (error) {
      return handleError(FILE_NAME, "createDraftSaleForDevice", c, error);
    }
  },
);

router.post(
  "/sales/complete",
  validateSchema("json", CompleteSaleSchema),
  async (c) => {
    try {
      const authDevice = c.get("authDevice");
      const body = c.req.valid("json");
      const serviceResponse = await billingService.completeSaleForDevice(
        authDevice,
        body,
      );
      return handleServiceResponse(c, serviceResponse);
    } catch (error) {
      return handleError(FILE_NAME, "completeSaleForDevice", c, error);
    }
  },
);

router.get("/kots", async (c) => {
  try {
    return handleServiceResponse(
      c,
      await kotService.listKitchenKotsForDevice(c.get("authDevice")),
    );
  } catch (error) {
    return handleError(FILE_NAME, "listKitchenKotsForDevice", c, error);
  }
});

router.post("/kots/:kotId/complete", async (c) => {
  try {
    const kotId = c.req.param("kotId");
    const invalidKotId = validateUuidParam(kotId, "Invalid KOT id");
    if (invalidKotId) return c.json(invalidKotId, invalidKotId.code);
    return handleServiceResponse(
      c,
      await kotService.completeKitchenKotForDevice(c.get("authDevice"), kotId),
    );
  } catch (error) {
    return handleError(FILE_NAME, "completeKitchenKotForDevice", c, error);
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
    const serviceResponse = await billingService.getSaleDetailsForDevice(
      authDevice,
      saleId,
    );
    return handleServiceResponse(c, serviceResponse);
  } catch (error) {
    return handleError(FILE_NAME, "getSaleDetailsForDevice", c, error);
  }
});

router.patch(
  "/sales/:saleId",
  validateSchema("json", UpdateDraftSaleSchema),
  async (c) => {
    try {
      const saleId = c.req.param("saleId");
      const invalidSaleId = validateUuidParam(saleId, "Invalid sale id");
      if (invalidSaleId) {
        return c.json(invalidSaleId, invalidSaleId.code);
      }

      const authDevice = c.get("authDevice");
      const body = c.req.valid("json");
      const serviceResponse = await billingService.updateDraftSaleForDevice(
        authDevice,
        saleId,
        body,
      );
      return handleServiceResponse(c, serviceResponse);
    } catch (error) {
      return handleError(FILE_NAME, "updateDraftSaleForDevice", c, error);
    }
  },
);

router.post(
  "/sales/:saleId/replace",
  validateSchema("json", ReplaceSaleSchema),
  async (c) => {
    try {
      const saleId = c.req.param("saleId");
      const invalidSaleId = validateUuidParam(saleId, "Invalid sale id");
      if (invalidSaleId) {
        return c.json(invalidSaleId, invalidSaleId.code);
      }

      const authDevice = c.get("authDevice");
      const body = c.req.valid("json");
      const serviceResponse = await billingService.replaceSaleForDevice(
        authDevice,
        saleId,
        body,
      );
      return handleServiceResponse(c, serviceResponse);
    } catch (error) {
      return handleError(FILE_NAME, "replaceSaleForDevice", c, error);
    }
  },
);

router.delete("/sales/:saleId", async (c) => {
  try {
    const saleId = c.req.param("saleId");
    const invalidSaleId = validateUuidParam(saleId, "Invalid sale id");
    if (invalidSaleId) {
      return c.json(invalidSaleId, invalidSaleId.code);
    }

    const authDevice = c.get("authDevice");
    const serviceResponse = await billingService.deleteDraftSaleForDevice(
      authDevice,
      saleId,
    );
    return handleServiceResponse(c, serviceResponse);
  } catch (error) {
    return handleError(FILE_NAME, "deleteDraftSaleForDevice", c, error);
  }
});

router.post(
  "/sales/:saleId/commit",
  validateSchema("json", CommitSaleSchema),
  async (c) => {
    try {
      const saleId = c.req.param("saleId");
      const invalidSaleId = validateUuidParam(saleId, "Invalid sale id");
      if (invalidSaleId) {
        return c.json(invalidSaleId, invalidSaleId.code);
      }

      const authDevice = c.get("authDevice");
      const body = c.req.valid("json");
      const serviceResponse = await billingService.commitSaleForDevice(
        authDevice,
        saleId,
        body,
      );
      return handleServiceResponse(c, serviceResponse);
    } catch (error) {
      return handleError(FILE_NAME, "commitSaleForDevice", c, error);
    }
  },
);

router.post(
  "/sales/:saleId/payments",
  validateSchema("json", CreatePaymentSchema),
  async (c) => {
    try {
      const saleId = c.req.param("saleId");
      const invalidSaleId = validateUuidParam(saleId, "Invalid sale id");
      if (invalidSaleId) {
        return c.json(invalidSaleId, invalidSaleId.code);
      }

      const authDevice = c.get("authDevice");
      const body = c.req.valid("json");
      const serviceResponse = await billingService.collectPaymentForDevice(
        authDevice,
        saleId,
        body,
      );
      return handleServiceResponse(c, serviceResponse);
    } catch (error) {
      return handleError(FILE_NAME, "collectPaymentForDevice", c, error);
    }
  },
);

router.post(
  "/sales/:saleId/void",
  validateSchema("json", VoidSaleSchema),
  async (c) => {
    try {
      const saleId = c.req.param("saleId");
      const invalidSaleId = validateUuidParam(saleId, "Invalid sale id");
      if (invalidSaleId) {
        return c.json(invalidSaleId, invalidSaleId.code);
      }

      const authDevice = c.get("authDevice");
      const body = c.req.valid("json");
      const serviceResponse = await billingService.voidSaleForDevice(
        authDevice,
        saleId,
        body,
      );
      return handleServiceResponse(c, serviceResponse);
    } catch (error) {
      return handleError(FILE_NAME, "voidSaleForDevice", c, error);
    }
  },
);

export default router;
