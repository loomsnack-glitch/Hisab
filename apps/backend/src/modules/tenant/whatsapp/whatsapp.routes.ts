import { Hono } from "hono";
import type { Context } from "hono";
import { z } from "zod";
import {
    STATUS_CODES,
    WhatsAppCreateAccountSchema,
    WhatsAppSendInvoiceSchema,
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
        return c.json({ accounts: await service.getWorkerAccounts() });
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
        return c.json(await service.claimInvoiceForWorker());
    } catch {
        return c.json({ status: "error", message: "WhatsApp outbox claim failed" }, 500);
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

export default userRouter;
