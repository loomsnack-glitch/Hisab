import { Hono } from "hono";
import type { Context } from "hono";
import { z } from "zod";
import {
    STATUS_CODES,
    WhatsAppAssignAccountSchema,
    WhatsAppAttachConversationCustomerSchema,
    WhatsAppCreateAccountSchema,
    WhatsAppChangeAccountNumberSchema,
    WhatsAppSendConversationTextSchema,
    WhatsAppSendInvoiceSchema,
    WhatsAppDueReminderRequestSchema,
    WhatsAppCreatePromotionSchema,
    WhatsAppCreateMessageTemplateSchema,
    WhatsAppUpdateMessageTemplateSchema,
    WhatsAppMessageTemplateKindSchema,
    WhatsAppWorkerInboundMessageSchema,
    WhatsAppWorkerMessageEventSchema,
    WhatsAppWorkerInvoiceResultSchema,
    WhatsAppWorkerMessageStatusSchema,
    WhatsAppWorkerStatusUpdateSchema,
} from "@repo/types";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { handleServiceResponse } from "@/helpers/service.helper";
import { validateSchema } from "@/middlewares/validate";
import { whatsappWorkerMiddleware } from "@/middlewares/whatsapp-worker.middleware";
import type { AppVariables } from "@/types/hono";
import * as service from "./whatsapp.service";

const uuidSchema = z.uuid("Invalid id");
const userRouter = new Hono<{ Variables: AppVariables }>();

const invalidUuid = (value: string, message: string) => {
    if (uuidSchema.safeParse(value).success) return null;
    return { status: "error" as const, message, code: STATUS_CODES.BAD_REQUEST };
};

const unexpectedError = (c: Context, error?: unknown) => {
    console.error(
        "[whatsapp] unexpected route error",
        error instanceof Error ? error.message : error ? String(error) : "unknown error",
    );
    return c.json(
        { status: "error", message: "WhatsApp operation failed", code: STATUS_CODES.INTERNAL_SERVER_ERROR },
        STATUS_CODES.INTERNAL_SERVER_ERROR,
    );
};

const unexpectedInternalError = (c: Context, operation: string, error: unknown, message: string) => {
    console.error(`[whatsapp] ${operation}`, error instanceof Error ? error.message : String(error));
    return c.json({ status: "error", message }, 500);
};

const workerPartitionFromQuery = (c: Context): { count: number; index: number } | null => {
    const count = Number(c.req.query("partitionCount") ?? 1);
    const index = Number(c.req.query("partitionIndex") ?? 0);
    if (!Number.isInteger(count) || count < 1 || !Number.isInteger(index) || index < 0 || index >= count) return null;
    return { count, index };
};

userRouter.use("*", authMiddleware);

userRouter.get("/:organizationId/whatsapp/accounts", async c => {
    try {
        const organizationId = c.req.param("organizationId");
        const invalid = invalidUuid(organizationId, "Invalid organization id");
        if (invalid) return c.json(invalid, invalid.code);
        return handleServiceResponse(c, await service.listAccounts(c.get("authUser").id, organizationId));
    } catch (error) {
        return unexpectedError(c, error);
    }
});

userRouter.post(
    "/:organizationId/whatsapp/accounts",
    validateSchema("json", WhatsAppCreateAccountSchema),
    async c => {
        try {
            const organizationId = c.req.param("organizationId");
            const invalid = invalidUuid(organizationId, "Invalid organization id");
            if (invalid) return c.json(invalid, invalid.code);
            return handleServiceResponse(
                c,
                await service.createOrganizationAccount(c.get("authUser").id, organizationId, c.req.valid("json")),
            );
        } catch (error) {
            return unexpectedError(c, error);
        }
    },
);

userRouter.post("/:organizationId/whatsapp/accounts/:accountId/connect", async c => {
    try {
        const organizationId = c.req.param("organizationId");
        const accountId = c.req.param("accountId");
        const invalid = invalidUuid(organizationId, "Invalid organization id") ?? invalidUuid(accountId, "Invalid account id");
        if (invalid) return c.json(invalid, invalid.code);
        return handleServiceResponse(c, await service.connectOrganizationAccount(c.get("authUser").id, organizationId, accountId));
    } catch (error) {
        return unexpectedError(c, error);
    }
});

userRouter.post("/:organizationId/whatsapp/accounts/:accountId/disconnect", async c => {
    try {
        const organizationId = c.req.param("organizationId");
        const accountId = c.req.param("accountId");
        const invalid = invalidUuid(organizationId, "Invalid organization id") ?? invalidUuid(accountId, "Invalid account id");
        if (invalid) return c.json(invalid, invalid.code);
        return handleServiceResponse(c, await service.disconnectOrganizationAccount(c.get("authUser").id, organizationId, accountId));
    } catch (error) {
        return unexpectedError(c, error);
    }
});

userRouter.get("/:organizationId/whatsapp/accounts/:accountId", async c => {
    try {
        const organizationId = c.req.param("organizationId");
        const accountId = c.req.param("accountId");
        const invalid = invalidUuid(organizationId, "Invalid organization id") ?? invalidUuid(accountId, "Invalid account id");
        if (invalid) return c.json(invalid, invalid.code);
        return handleServiceResponse(c, await service.getOrganizationAccountStatus(c.get("authUser").id, organizationId, accountId));
    } catch (error) {
        return unexpectedError(c, error);
    }
});

userRouter.post(
    "/:organizationId/whatsapp/accounts/:accountId/change-number",
    validateSchema("json", WhatsAppChangeAccountNumberSchema),
    async c => {
        try {
            const organizationId = c.req.param("organizationId");
            const accountId = c.req.param("accountId");
            const invalid = invalidUuid(organizationId, "Invalid organization id") ?? invalidUuid(accountId, "Invalid account id");
            if (invalid) return c.json(invalid, invalid.code);
            return handleServiceResponse(
                c,
                await service.changeOrganizationAccountNumber(
                    c.get("authUser").id,
                    organizationId,
                    accountId,
                    c.req.valid("json"),
                ),
            );
        } catch (error) {
            return unexpectedError(c, error);
        }
    },
);

userRouter.get("/:organizationId/stores/:storeId/whatsapp/account", async c => {
    try {
        const organizationId = c.req.param("organizationId");
        const storeId = c.req.param("storeId");
        const invalid = invalidUuid(organizationId, "Invalid organization id") ?? invalidUuid(storeId, "Invalid store id");
        if (invalid) return c.json(invalid, invalid.code);
        return handleServiceResponse(c, await service.getAccount(c.get("authUser").id, organizationId, storeId));
    } catch (error) {
        return unexpectedError(c, error);
    }
});

userRouter.post(
    "/:organizationId/stores/:storeId/whatsapp/account/assign",
    validateSchema("json", WhatsAppAssignAccountSchema),
    async c => {
        try {
            const organizationId = c.req.param("organizationId");
            const storeId = c.req.param("storeId");
            const invalid = invalidUuid(organizationId, "Invalid organization id") ?? invalidUuid(storeId, "Invalid store id");
            if (invalid) return c.json(invalid, invalid.code);
            return handleServiceResponse(
                c,
                await service.assignAccount(
                    c.get("authUser").id,
                    organizationId,
                    storeId,
                    c.req.valid("json").whatsappAccountId,
                ),
            );
        } catch (error) {
            return unexpectedError(c, error);
        }
    },
);

userRouter.get("/:organizationId/stores/:storeId/whatsapp/invoice/:saleId", async c => {
    try {
        const organizationId = c.req.param("organizationId");
        const storeId = c.req.param("storeId");
        const saleId = c.req.param("saleId");
        const invalid = invalidUuid(organizationId, "Invalid organization id")
            ?? invalidUuid(storeId, "Invalid store id")
            ?? invalidUuid(saleId, "Invalid sale id");
        if (invalid) return c.json(invalid, invalid.code);
        return handleServiceResponse(c, await service.getInvoiceStatus(c.get("authUser").id, organizationId, storeId, saleId));
    } catch (error) {
        return unexpectedError(c, error);
    }
});

userRouter.post("/:organizationId/stores/:storeId/whatsapp/invoice/:saleId/retry", async c => {
    try {
        const organizationId = c.req.param("organizationId");
        const storeId = c.req.param("storeId");
        const saleId = c.req.param("saleId");
        const invalid = invalidUuid(organizationId, "Invalid organization id")
            ?? invalidUuid(storeId, "Invalid store id")
            ?? invalidUuid(saleId, "Invalid sale id");
        if (invalid) return c.json(invalid, invalid.code);
        return handleServiceResponse(c, await service.retryInvoice(c.get("authUser").id, organizationId, storeId, saleId));
    } catch (error) {
        return unexpectedError(c, error);
    }
});

userRouter.get("/:organizationId/stores/:storeId/whatsapp/conversations", async c => {
    try {
        const organizationId = c.req.param("organizationId");
        const storeId = c.req.param("storeId");
        const invalid = invalidUuid(organizationId, "Invalid organization id") ?? invalidUuid(storeId, "Invalid store id");
        if (invalid) return c.json(invalid, invalid.code);
        return handleServiceResponse(c, await service.listConversations(c.get("authUser").id, organizationId, storeId));
    } catch (error) {
        return unexpectedError(c, error);
    }
});

userRouter.get("/:organizationId/stores/:storeId/whatsapp/conversations/:conversationId", async c => {
    try {
        const organizationId = c.req.param("organizationId");
        const storeId = c.req.param("storeId");
        const conversationId = c.req.param("conversationId");
        const invalid = invalidUuid(organizationId, "Invalid organization id")
            ?? invalidUuid(storeId, "Invalid store id")
            ?? invalidUuid(conversationId, "Invalid conversation id");
        if (invalid) return c.json(invalid, invalid.code);
        return handleServiceResponse(c, await service.getConversation(c.get("authUser").id, organizationId, storeId, conversationId));
    } catch (error) {
        return unexpectedError(c, error);
    }
});

userRouter.post(
    "/:organizationId/stores/:storeId/whatsapp/conversations/:conversationId/messages",
    validateSchema("json", WhatsAppSendConversationTextSchema),
    async c => {
        try {
            const organizationId = c.req.param("organizationId");
            const storeId = c.req.param("storeId");
            const conversationId = c.req.param("conversationId");
            const invalid = invalidUuid(organizationId, "Invalid organization id")
                ?? invalidUuid(storeId, "Invalid store id")
                ?? invalidUuid(conversationId, "Invalid conversation id");
            if (invalid) return c.json(invalid, invalid.code);
            return handleServiceResponse(c, await service.sendText(c.get("authUser").id, organizationId, storeId, conversationId, c.req.valid("json")));
        } catch (error) {
            return unexpectedError(c, error);
        }
    },
);

userRouter.post(
    "/:organizationId/stores/:storeId/whatsapp/conversations/:conversationId/customer",
    validateSchema("json", WhatsAppAttachConversationCustomerSchema),
    async c => {
        try {
            const organizationId = c.req.param("organizationId");
            const storeId = c.req.param("storeId");
            const conversationId = c.req.param("conversationId");
            const invalid = invalidUuid(organizationId, "Invalid organization id")
                ?? invalidUuid(storeId, "Invalid store id")
                ?? invalidUuid(conversationId, "Invalid conversation id");
            if (invalid) return c.json(invalid, invalid.code);
            return handleServiceResponse(c, await service.attachCustomer(c.get("authUser").id, organizationId, storeId, conversationId, c.req.valid("json")));
        } catch (error) {
            return unexpectedError(c, error);
        }
    },
);

userRouter.get("/:organizationId/stores/:storeId/whatsapp/conversations/:conversationId/messages/:messageId/attachment", async c => {
    try {
        const organizationId = c.req.param("organizationId");
        const storeId = c.req.param("storeId");
        const conversationId = c.req.param("conversationId");
        const messageId = c.req.param("messageId");
        const invalid = invalidUuid(organizationId, "Invalid organization id")
            ?? invalidUuid(storeId, "Invalid store id")
            ?? invalidUuid(conversationId, "Invalid conversation id")
            ?? invalidUuid(messageId, "Invalid message id");
        if (invalid) return c.json(invalid, invalid.code);
        return handleServiceResponse(c, await service.getAttachment(c.get("authUser").id, organizationId, storeId, conversationId, messageId));
    } catch (error) {
        return unexpectedError(c, error);
    }
});

userRouter.post("/:organizationId/stores/:storeId/whatsapp/account/remove", async c => {
    try {
        const organizationId = c.req.param("organizationId");
        const storeId = c.req.param("storeId");
        const invalid = invalidUuid(organizationId, "Invalid organization id") ?? invalidUuid(storeId, "Invalid store id");
        if (invalid) return c.json(invalid, invalid.code);
        return handleServiceResponse(c, await service.removeAccount(c.get("authUser").id, organizationId, storeId));
    } catch (error) {
        return unexpectedError(c, error);
    }
});

userRouter.post("/:organizationId/stores/:storeId/whatsapp/account/sync", async c => {
    try {
        const organizationId = c.req.param("organizationId");
        const storeId = c.req.param("storeId");
        const invalid = invalidUuid(organizationId, "Invalid organization id") ?? invalidUuid(storeId, "Invalid store id");
        if (invalid) return c.json(invalid, invalid.code);
        return handleServiceResponse(c, await service.syncAccount(c.get("authUser").id, organizationId, storeId));
    } catch (error) {
        return unexpectedError(c, error);
    }
});

userRouter.post(
    "/:organizationId/stores/:storeId/whatsapp/invoice",
    validateSchema("json", WhatsAppSendInvoiceSchema),
    async c => {
        try {
            const organizationId = c.req.param("organizationId");
            const storeId = c.req.param("storeId");
            const invalid = invalidUuid(organizationId, "Invalid organization id") ?? invalidUuid(storeId, "Invalid store id");
            if (invalid) return c.json(invalid, invalid.code);
            const { saleId, customMessage, templateId } = c.req.valid("json");
            const invalidSaleId = invalidUuid(saleId, "Invalid sale id");
            if (invalidSaleId) return c.json(invalidSaleId, invalidSaleId.code);
            const invalidTemplateId = templateId ? invalidUuid(templateId, "Invalid template id") : null;
            if (invalidTemplateId) return c.json(invalidTemplateId, invalidTemplateId.code);
            return handleServiceResponse(
                c,
                await service.queueInvoice(c.get("authUser").id, organizationId, storeId, saleId, customMessage, templateId),
            );
        } catch (error) {
            return unexpectedError(c, error);
        }
    },
);

userRouter.get("/:organizationId/stores/:storeId/whatsapp/templates", async c => {
    try {
        const organizationId = c.req.param("organizationId");
        const storeId = c.req.param("storeId");
        const invalid = invalidUuid(organizationId, "Invalid organization id") ?? invalidUuid(storeId, "Invalid store id");
        if (invalid) return c.json(invalid, invalid.code);
        const rawKind = c.req.query("kind");
        const parsedKind = rawKind ? WhatsAppMessageTemplateKindSchema.safeParse(rawKind) : null;
        if (parsedKind && !parsedKind.success) return c.json({ status: "error", message: "Invalid template kind" }, STATUS_CODES.BAD_REQUEST);
        return handleServiceResponse(c, await service.listMessageTemplates(c.get("authUser").id, organizationId, storeId, parsedKind?.success ? parsedKind.data : undefined));
    } catch (error) {
        return unexpectedError(c, error);
    }
});

userRouter.post(
    "/:organizationId/stores/:storeId/whatsapp/templates",
    validateSchema("json", WhatsAppCreateMessageTemplateSchema),
    async c => {
        try {
            const organizationId = c.req.param("organizationId");
            const storeId = c.req.param("storeId");
            const invalid = invalidUuid(organizationId, "Invalid organization id") ?? invalidUuid(storeId, "Invalid store id");
            if (invalid) return c.json(invalid, invalid.code);
            return handleServiceResponse(c, await service.createMessageTemplate(c.get("authUser").id, organizationId, storeId, c.req.valid("json")));
        } catch (error) {
            return unexpectedError(c, error);
        }
    },
);

userRouter.patch(
    "/:organizationId/stores/:storeId/whatsapp/templates/:templateId",
    validateSchema("json", WhatsAppUpdateMessageTemplateSchema),
    async c => {
        try {
            const organizationId = c.req.param("organizationId");
            const storeId = c.req.param("storeId");
            const templateId = c.req.param("templateId");
            const invalid = invalidUuid(organizationId, "Invalid organization id")
                ?? invalidUuid(storeId, "Invalid store id")
                ?? invalidUuid(templateId, "Invalid template id");
            if (invalid) return c.json(invalid, invalid.code);
            return handleServiceResponse(c, await service.updateMessageTemplate(c.get("authUser").id, organizationId, storeId, templateId, c.req.valid("json")));
        } catch (error) {
            return unexpectedError(c, error);
        }
    },
);

userRouter.delete("/:organizationId/stores/:storeId/whatsapp/templates/:templateId", async c => {
    try {
        const organizationId = c.req.param("organizationId");
        const storeId = c.req.param("storeId");
        const templateId = c.req.param("templateId");
        const invalid = invalidUuid(organizationId, "Invalid organization id")
            ?? invalidUuid(storeId, "Invalid store id")
            ?? invalidUuid(templateId, "Invalid template id");
        if (invalid) return c.json(invalid, invalid.code);
        return handleServiceResponse(c, await service.deleteMessageTemplate(c.get("authUser").id, organizationId, storeId, templateId));
    } catch (error) {
        return unexpectedError(c, error);
    }
});

userRouter.post("/:organizationId/stores/:storeId/whatsapp/customers/:customerId/due-reminder", async c => {
    try {
        const organizationId = c.req.param("organizationId");
        const storeId = c.req.param("storeId");
        const customerId = c.req.param("customerId");
        const invalid = invalidUuid(organizationId, "Invalid organization id")
            ?? invalidUuid(storeId, "Invalid store id")
            ?? invalidUuid(customerId, "Invalid customer id");
        if (invalid) return c.json(invalid, invalid.code);
        const payload = await c.req.json().catch(() => ({}));
        const parsed = WhatsAppDueReminderRequestSchema.safeParse(payload);
        if (!parsed.success) return c.json({ status: "error", message: "Invalid due reminder request" }, STATUS_CODES.BAD_REQUEST);
        return handleServiceResponse(c, await service.queueDueReminder(c.get("authUser").id, organizationId, storeId, customerId, parsed.data.customMessage, parsed.data.saleId));
    } catch (error) {
        return unexpectedError(c, error);
    }
});

userRouter.get("/:organizationId/stores/:storeId/whatsapp/due-reminder/:saleId", async c => {
    try {
        const organizationId = c.req.param("organizationId");
        const storeId = c.req.param("storeId");
        const saleId = c.req.param("saleId");
        const invalid = invalidUuid(organizationId, "Invalid organization id")
            ?? invalidUuid(storeId, "Invalid store id")
            ?? invalidUuid(saleId, "Invalid sale id");
        if (invalid) return c.json(invalid, invalid.code);
        return handleServiceResponse(c, await service.getDueReminderStatus(c.get("authUser").id, organizationId, storeId, saleId));
    } catch (error) {
        return unexpectedError(c, error);
    }
});

userRouter.post(
    "/:organizationId/stores/:storeId/whatsapp/promotions",
    validateSchema("json", WhatsAppCreatePromotionSchema),
    async c => {
        try {
            const organizationId = c.req.param("organizationId");
            const storeId = c.req.param("storeId");
            const invalid = invalidUuid(organizationId, "Invalid organization id") ?? invalidUuid(storeId, "Invalid store id");
            if (invalid) return c.json(invalid, invalid.code);
            return handleServiceResponse(c, await service.createPromotion(c.get("authUser").id, organizationId, storeId, c.req.valid("json")));
        } catch (error) {
            return unexpectedError(c, error);
        }
    },
);

export const whatsappInternalRoutes = new Hono();
whatsappInternalRoutes.use("*", whatsappWorkerMiddleware);

whatsappInternalRoutes.get("/accounts", async c => {
    try {
        const partition = workerPartitionFromQuery(c);
        if (!partition) return c.json({ status: "error", message: "Invalid worker partition" }, STATUS_CODES.BAD_REQUEST);
        return c.json({ accounts: await service.getWorkerAccounts(partition) });
    } catch (error) {
        return unexpectedInternalError(c, "worker reconciliation failed", error, "Worker reconciliation failed");
    }
});

whatsappInternalRoutes.post(
    "/accounts/:accountId/status",
    validateSchema("json", WhatsAppWorkerStatusUpdateSchema),
    async c => {
        try {
            const accountId = c.req.param("accountId");
            if (!uuidSchema.safeParse(accountId).success) {
                return c.json({ status: "error", message: "Invalid account id" }, STATUS_CODES.BAD_REQUEST);
            }
            const account = await service.receiveWorkerStatus(accountId, c.req.valid("json"));
            if (!account) {
                return c.json({ status: "error", message: "WhatsApp account not found" }, STATUS_CODES.NOT_FOUND);
            }
            return c.json({ status: "success" });
        } catch (error) {
            return unexpectedInternalError(c, "worker status update failed", error, "Worker status update failed");
        }
    },
);

whatsappInternalRoutes.get("/outbox/next", async c => {
    try {
        const partition = workerPartitionFromQuery(c);
        if (!partition) return c.json({ status: "error", message: "Invalid worker partition" }, STATUS_CODES.BAD_REQUEST);
        const workerId = c.req.header("x-whatsapp-worker-id")?.trim() || "worker";
        if (!/^[a-zA-Z0-9._-]{1,100}$/.test(workerId)) {
            return c.json({ status: "error", message: "Invalid worker id" }, STATUS_CODES.BAD_REQUEST);
        }
        return c.json(await service.claimInvoiceForWorker(workerId, partition));
    } catch (error) {
        return unexpectedInternalError(c, "WhatsApp outbox claim failed", error, "WhatsApp outbox claim failed");
    }
});

whatsappInternalRoutes.get("/operations/metrics", async c => {
    try {
        return c.json({ metrics: await service.getOperationsMetrics() });
    } catch (error) {
        return unexpectedInternalError(c, "WhatsApp operations metrics failed", error, "WhatsApp operations metrics failed");
    }
});

whatsappInternalRoutes.get("/accounts/:accountId/history-anchors", async c => {
    try {
        const accountId = c.req.param("accountId");
        if (!uuidSchema.safeParse(accountId).success) {
            return c.json({ status: "error", message: "Invalid account id" }, STATUS_CODES.BAD_REQUEST);
        }
        return c.json({ anchors: await service.getHistoryAnchorsForWorker(accountId) });
    } catch (error) {
        return unexpectedInternalError(c, "WhatsApp history anchors failed", error, "WhatsApp history anchors failed");
    }
});

whatsappInternalRoutes.post("/outbox/:outboxId/result", async c => {
    try {
        const outboxId = c.req.param("outboxId");
        if (!uuidSchema.safeParse(outboxId).success) {
            return c.json({ status: "error", message: "Invalid outbox id" }, STATUS_CODES.BAD_REQUEST);
        }
        const body = await c.req.json();
        const parsed = WhatsAppWorkerInvoiceResultSchema.safeParse(body);
        if (!parsed.success) return c.json({ status: "error", message: "Invalid invoice result" }, STATUS_CODES.BAD_REQUEST);
        const accepted = await service.receiveInvoiceResult(outboxId, parsed.data);
        return c.json({ status: accepted ? "success" : "ignored" });
    } catch (error) {
        return unexpectedInternalError(c, "WhatsApp outbox result failed", error, "WhatsApp outbox result failed");
    }
});

whatsappInternalRoutes.post("/accounts/:accountId/messages/status", async c => {
    try {
        const accountId = c.req.param("accountId");
        if (!uuidSchema.safeParse(accountId).success) {
            return c.json({ status: "error", message: "Invalid account id" }, STATUS_CODES.BAD_REQUEST);
        }
        const parsed = WhatsAppWorkerMessageStatusSchema.safeParse(await c.req.json());
        if (!parsed.success) return c.json({ status: "error", message: "Invalid message status" }, STATUS_CODES.BAD_REQUEST);
        const accepted = await service.receiveInvoiceMessageStatus(accountId, parsed.data);
        return c.json({ status: accepted ? "success" : "ignored" });
    } catch (error) {
        return unexpectedInternalError(c, "WhatsApp message status failed", error, "WhatsApp message status failed");
    }
});

whatsappInternalRoutes.post("/accounts/:accountId/messages/inbound", async c => {
    try {
        const accountId = c.req.param("accountId");
        if (!uuidSchema.safeParse(accountId).success) {
            return c.json({ status: "error", message: "Invalid account id" }, STATUS_CODES.BAD_REQUEST);
        }
        const parsed = WhatsAppWorkerInboundMessageSchema.safeParse(await c.req.json());
        if (!parsed.success) return c.json({ status: "error", message: "Invalid inbound message" }, STATUS_CODES.BAD_REQUEST);
        const result = await service.ingestInboundMessage(accountId, parsed.data);
        return c.json({ status: "success", ...result });
    } catch (error) {
        return unexpectedInternalError(c, "Inbound WhatsApp message failed", error, "Inbound WhatsApp message failed");
    }
});

whatsappInternalRoutes.post("/accounts/:accountId/messages/events", async c => {
    try {
        const accountId = c.req.param("accountId");
        if (!uuidSchema.safeParse(accountId).success) {
            return c.json({ status: "error", message: "Invalid account id" }, STATUS_CODES.BAD_REQUEST);
        }
        const parsed = WhatsAppWorkerMessageEventSchema.safeParse(await c.req.json());
        if (!parsed.success) return c.json({ status: "error", message: "Invalid WhatsApp message event" }, STATUS_CODES.BAD_REQUEST);
        const result = await service.ingestMessageEvent(accountId, parsed.data);
        return c.json({ status: "success", ...result });
    } catch (error) {
        return unexpectedInternalError(c, "WhatsApp message event failed", error, "WhatsApp message event failed");
    }
});

export default userRouter;
