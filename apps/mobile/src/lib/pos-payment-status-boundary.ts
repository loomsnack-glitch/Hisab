import type { PaymentStatus, SaleSummaryDTO } from "@repo/types";
import type { PosStatusTone } from "../components/pos-ui-boundary";
import type { PosTranslationKey } from "./localization-boundary";

type PosPaymentStatusSale = Pick<SaleSummaryDTO, "paymentStatus" | "grandTotal" | "paidTotal" | "dueTotal">;

export type PosPaymentStatusPresentation = {
    status: PaymentStatus;
    labelKey: Extract<PosTranslationKey, "paymentStatusPaid" | "paymentStatusPartial" | "paymentStatusDue">;
    descriptionKey: Extract<PosTranslationKey, "paymentStatusPaidDescription" | "paymentStatusPartialDescription" | "paymentStatusDueDescription">;
    receiptLabel: "Paid" | "Partial" | "Due";
    tone: PosStatusTone;
    grandTotal: number;
    paidTotal: number;
    dueTotal: number;
};

const statusPresentation: Record<PaymentStatus, Pick<PosPaymentStatusPresentation, "labelKey" | "descriptionKey" | "receiptLabel" | "tone">> = {
    paid: { labelKey: "paymentStatusPaid", descriptionKey: "paymentStatusPaidDescription", receiptLabel: "Paid", tone: "success" },
    partial: { labelKey: "paymentStatusPartial", descriptionKey: "paymentStatusPartialDescription", receiptLabel: "Partial", tone: "warning" },
    pending: { labelKey: "paymentStatusDue", descriptionKey: "paymentStatusDueDescription", receiptLabel: "Due", tone: "warning" },
};

export const getPosPaymentStatusReceiptLabel = (status: PaymentStatus) => statusPresentation[status].receiptLabel;

export const getPosPaymentStatusPresentation = (
    sale: PosPaymentStatusSale,
): PosPaymentStatusPresentation => ({
    status: sale.paymentStatus,
    ...statusPresentation[sale.paymentStatus],
    grandTotal: sale.grandTotal,
    paidTotal: sale.paidTotal,
    dueTotal: sale.dueTotal,
});
