import type { PaymentStatus, SaleSummaryDTO } from "@repo/types";
import type { PosStatusTone } from "../components/pos-ui-boundary";
import type { PosTranslationKey } from "./localization-boundary";

type PosPaymentStatusSale = Pick<SaleSummaryDTO, "paymentStatus" | "grandTotal" | "paidTotal" | "dueTotal">;

export type PosPaymentStatusPresentation = {
    status: PaymentStatus;
    labelKey: Extract<PosTranslationKey, "paymentStatusPaid" | "paymentStatusPartial" | "paymentStatusDue">;
    tone: PosStatusTone;
    grandTotal: number;
    paidTotal: number;
    dueTotal: number;
};

const statusPresentation: Record<PaymentStatus, Pick<PosPaymentStatusPresentation, "labelKey" | "tone">> = {
    paid: { labelKey: "paymentStatusPaid", tone: "success" },
    partial: { labelKey: "paymentStatusPartial", tone: "warning" },
    pending: { labelKey: "paymentStatusDue", tone: "warning" },
};

export const getPosPaymentStatusPresentation = (
    sale: PosPaymentStatusSale,
): PosPaymentStatusPresentation => ({
    status: sale.paymentStatus,
    ...statusPresentation[sale.paymentStatus],
    grandTotal: sale.grandTotal,
    paidTotal: sale.paidTotal,
    dueTotal: sale.dueTotal,
});
