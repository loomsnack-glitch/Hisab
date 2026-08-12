import { Hono } from "hono";
import type { Context } from "hono";
import { z } from "zod";
import {
    STATUS_CODES,
    WhatsAppAttachConversationCustomerSchema,
    WhatsAppCreateAccountSchema,
    WhatsAppSendConversationTextSchema,
    WhatsAppSendInvoiceSchema,
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

const unexpectedError = (c: Context) => {
    console.error("[whatsapp] unexpected route error");
    return c.json(
        { status: "error", message: "WhatsApp operation failed", code: STATUS_CODES.INTERNAL_SERVER_ERROR },
        STATUS_CODES.INTERNAL_SERVER_ERROR,
    );
};

const workerPartitionFromQuery = (c: Context): { count: number; index: number } | null => {
    const count = Number(c.req.query("partitionCount") ?? 1);
    const index = Number(c.req.query("partitionIndex") ?? 0);
    if (!Number.isInteger(count) || count < 1 || !Number.isInteger(index) || index < 0 || index >= count) return null;
    return { count, index };
};

userRouter.use("*", authMiddleware);

userRouter.get("/:organizationId/stores/:storeId/whatsapp/account", async c => {
    try {
        const organizationId = c.req.param("organizationId");
        const storeId = c.req.param("storeId");
        const invalid = invalidUuid(organizationId, "Invalid organization id") ?? invalidUuid(storeId, "Invalid store id");
        if (invalid) return c.json(invalid, invalid.code);
        return handleServiceResponse(c, await service.getAccount(c.get("authUser").id, organizationId, storeId));
    } catch {
        return unexpectedError(c);
    }
});

userRouter.post(
    "/:organizationId/stores/:storeId/whatsapp/account",
    validateSchema("json", WhatsAppCreateAccountSchema),
    async c => {
        try {
            const organizationId = c.req.param("organizationId");
            const storeId = c.req.param("storeId");
            const invalid = invalidUuid(organizationId, "Invalid organization id") ?? invalidUuid(storeId, "Invalid store id");
            if (invalid) return c.json(invalid, invalid.code);
            return handleServiceResponse(
                c,
                await service.createAccount(
                    c.get("authUser").id,
                    organizationId,
                    storeId,
                    c.req.valid("json"),
                ),
            );
        } catch {
            return unexpectedError(c);
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
    } catch {
        return unexpectedError(c);
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
    } catch {
        return unexpectedError(c);
    }
});

userRouter.get("/:organizationId/stores/:storeId/whatsapp/conversations", async c => {
    try {
        const organizationId = c.req.param("organizationId");
        const storeId = c.req.param("storeId");
        const invalid = invalidUuid(organizationId, "Invalid organization id") ?? invalidUuid(storeId, "Invalid store id");
        if (invalid) return c.json(invalid, invalid.code);
        return handleServiceResponse(c, await service.listConversations(c.get("authUser").id, organizationId, storeId));
    } catch {
        return unexpectedError(c);
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
    } catch {
        return unexpectedError(c);
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
        } catch {
            return unexpectedError(c);
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
        } catch {
            return unexpectedError(c);
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
    } catch {
        return unexpectedError(c);
    }
});

userRouter.post("/:organizationId/stores/:storeId/whatsapp/account/connect", async c => {
    try {
        const organizationId = c.req.param("organizationId");
        const storeId = c.req.param("storeId");
        const invalid = invalidUuid(organizationId, "Invalid organization id") ?? invalidUuid(storeId, "Invalid store id");
        if (invalid) return c.json(invalid, invalid.code);
        return handleServiceResponse(c, await service.connectAccount(c.get("authUser").id, organizationId, storeId));
    } catch {
        return unexpectedError(c);
    }
});

userRouter.post("/:organizationId/stores/:storeId/whatsapp/account/disconnect", async c => {
    try {
        const organizationId = c.req.param("organizationId");
        const storeId = c.req.param("storeId");
        const invalid = invalidUuid(organizationId, "Invalid organization id") ?? invalidUuid(storeId, "Invalid store id");
        if (invalid) return c.json(invalid, invalid.code);
        return handleServiceResponse(c, await service.disconnectAccount(c.get("authUser").id, organizationId, storeId));
    } catch {
        return unexpectedError(c);
    }
});

userRouter.post("/:organizationId/stores/:storeId/whatsapp/account/sync", async c => {
    try {
        const organizationId = c.req.param("organizationId");
        const storeId = c.req.param("storeId");
        const invalid = invalidUuid(organizationId, "Invalid organization id") ?? invalidUuid(storeId, "Invalid store id");
        if (invalid) return c.json(invalid, invalid.code);
        return handleServiceResponse(c, await service.syncAccount(c.get("authUser").id, organizationId, storeId));
    } catch {
        return unexpectedError(c);
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
            const { saleId } = c.req.valid("json");
            const invalidSaleId = invalidUuid(saleId, "Invalid sale id");
            if (invalidSaleId) return c.json(invalidSaleId, invalidSaleId.code);
            return handleServiceResponse(
                c,
                await service.queueInvoice(c.get("authUser").id, organizationId, storeId, saleId),
            );
        } catch {
            return unexpectedError(c);
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
    } catch {
        return c.json({ status: "error", message: "Worker reconciliation failed" }, 500);
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
        } catch {
            return c.json({ status: "error", message: "Worker status update failed" }, 500);
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
    } catch {
        return c.json({ status: "error", message: "WhatsApp outbox claim failed" }, 500);
    }
});

whatsappInternalRoutes.get("/operations/metrics", async c => {
    try {
        return c.json({ metrics: await service.getOperationsMetrics() });
    } catch {
        return c.json({ status: "error", message: "WhatsApp operations metrics failed" }, 500);
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
    } catch {
        return c.json({ status: "error", message: "WhatsApp outbox result failed" }, 500);
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
    } catch {
        return c.json({ status: "error", message: "WhatsApp message status failed" }, 500);
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
    } catch {
        return c.json({ status: "error", message: "Inbound WhatsApp message failed" }, 500);
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
    } catch {
        return c.json({ status: "error", message: "WhatsApp message event failed" }, 500);
    }
});

export default userRouter;
