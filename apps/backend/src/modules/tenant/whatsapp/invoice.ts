import {
  phoneSchema,
  STATUS_CODES,
  type SaleDetailDTO,
  type ServiceResponse,
  type WhatsAppInvoiceQueueResponseDTO,
} from "@repo/types";
import * as storage from "@/services/storage";
import * as billingRepository from "@/modules/tenant/billing/billing.repository";
import * as organizationRepository from "@/modules/tenant/organization/organization.repository";
import * as repository from "./whatsapp.repository";
import { renderSalePdf } from "./invoice-pdf";

const privateBucket = () => process.env.MINIO_BUCKET_NAME?.trim() || "";

const invoiceObjectKey = (
  organizationId: string,
  storeId: string,
  saleId: string,
) => `whatsapp-invoices/${organizationId}/${storeId}/${saleId}.pdf`;

const invoiceFileName = (sale: SaleDetailDTO) => {
  const number = sale.saleNumber?.trim() || sale.id;
  return `sale-${number.replace(/[^a-zA-Z0-9_-]/g, "-")}.pdf`;
};

const loadSaleDetail = async (
  organizationId: string,
  storeId: string,
  saleId: string,
): Promise<SaleDetailDTO | null> => {
  const sale = await billingRepository.getSaleById(
    organizationId,
    storeId,
    saleId,
  );
  if (!sale) return null;

  const [items, payments] = await Promise.all([
    billingRepository.getSaleItemsBySaleId(saleId),
    billingRepository.getPaymentsBySaleId(saleId),
  ]);
  return {
    ...sale,
    items,
    payments,
    orderDiscountAmount: Number(sale.discountTotal),
  };
};

const response = (
  saleId: string,
  request: repository.InvoiceOutboxRecord,
  alreadyQueued: boolean,
): ServiceResponse<WhatsAppInvoiceQueueResponseDTO> => ({
  status: "success",
  message: alreadyQueued
    ? "Invoice is already queued for WhatsApp"
    : "Invoice queued for WhatsApp",
  data: {
    saleId,
    messageId: request.messageId,
    outboxId: request.outboxId,
    messageStatus: request.messageStatus,
    outboxStatus: request.outboxStatus,
    alreadyQueued,
  },
  code: alreadyQueued ? STATUS_CODES.SUCCESS : STATUS_CODES.CREATED,
});

export const queueInvoice = async (
  userId: string,
  organizationId: string,
  storeId: string,
  saleId: string,
): Promise<ServiceResponse<WhatsAppInvoiceQueueResponseDTO | null>> => {
  const organization = await organizationRepository.getOrganizationByIdForUser(
    organizationId,
    userId,
  );
  if (!organization) {
    return {
      status: "error",
      message: "Organization not found",
      data: null,
      code: STATUS_CODES.NOT_FOUND,
    };
  }

  const store = await organizationRepository.getStoreById(
    organizationId,
    storeId,
  );
  if (!store) {
    return {
      status: "error",
      message: "Store not found",
      data: null,
      code: STATUS_CODES.NOT_FOUND,
    };
  }

  const sale = await loadSaleDetail(organizationId, storeId, saleId);
  if (!sale) {
    return {
      status: "error",
      message: "Sale not found",
      data: null,
      code: STATUS_CODES.NOT_FOUND,
    };
  }
  if (sale.status !== "completed") {
    return {
      status: "error",
      message: "Only completed sales can be sent by WhatsApp",
      data: null,
      code: STATUS_CODES.CONFLICT,
    };
  }

  const customerPhone =
    sale.customerPhoneSnapshot ?? sale.customer?.phone ?? null;
  const parsedPhone = phoneSchema.safeParse(customerPhone);
  if (!sale.customerId || !parsedPhone.success) {
    return {
      status: "error",
      message:
        "A customer with a valid international phone number is required for WhatsApp invoices",
      data: null,
      code: STATUS_CODES.BAD_REQUEST,
    };
  }

  const account = await repository.getAccount(organizationId, storeId);
  if (!account) {
    return {
      status: "error",
      message: "Link the Store WhatsApp account before sending invoices",
      data: null,
      code: STATUS_CODES.CONFLICT,
    };
  }

  const existing = await repository.getInvoiceOutbox(
    organizationId,
    storeId,
    account.id,
    saleId,
  );
  if (existing) return response(saleId, existing, true);

  if (account.status !== "connected") {
    return {
      status: "error",
      message: "Connect the Store WhatsApp account before sending invoices",
      data: null,
      code: STATUS_CODES.CONFLICT,
    };
  }

  const bucket = privateBucket();
  if (!bucket) {
    return {
      status: "error",
      message: "Private invoice storage is not configured",
      data: null,
      code: STATUS_CODES.INTERNAL_SERVER_ERROR,
    };
  }

  const objectKey = invoiceObjectKey(organizationId, storeId, saleId);
  let uploaded = false;
  try {
    const pdf = await renderSalePdf(sale);
    await storage.uploadBuffer(bucket, objectKey, pdf, "application/pdf");
    uploaded = true;

    const request = await repository.createInvoiceOutbox({
      organizationId,
      storeId,
      whatsappAccountId: account.id,
      saleId,
      customerId: sale.customerId,
      customerPhone: parsedPhone.data,
      customerName:
        sale.customerNameSnapshot ?? sale.customer?.name ?? "Customer",
      messageId: crypto.randomUUID(),
      idempotencyKey: `invoice:${saleId}`,
      attachmentStorageKey: objectKey,
      attachmentFileName: invoiceFileName(sale),
    });
    return response(saleId, request, false);
  } catch (error) {
    try {
      const existingAfterFailure = await repository.getInvoiceOutbox(
        organizationId,
        storeId,
        account.id,
        saleId,
      );
      if (existingAfterFailure)
        return response(saleId, existingAfterFailure, true);
    } catch {
      // Preserve the original preparation failure when the race check cannot run.
    }

    if (uploaded) {
      try {
        await storage.deleteObject(bucket, objectKey);
      } catch (cleanupError) {
        console.error(
          "[whatsapp] invoice object cleanup failed",
          cleanupError instanceof Error ? cleanupError.message : "unknown",
        );
      }
    }
    console.error(
      "[whatsapp] invoice preparation failed",
      error instanceof Error ? error.message : "unknown",
    );
    return {
      status: "error",
      message: "Invoice PDF could not be prepared. The Sale remains completed.",
      data: null,
      code: STATUS_CODES.INTERNAL_SERVER_ERROR,
    };
  }
};
