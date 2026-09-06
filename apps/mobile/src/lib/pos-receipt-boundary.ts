import type { SaleDetailDTO } from "@repo/types";
import { getPosPaymentStatusReceiptLabel } from "./pos-payment-status-boundary";

type PosReceiptSale = Pick<SaleDetailDTO, "id" | "saleNumber" | "createdAt" | "items" | "paymentStatus" | "grandTotal" | "paidTotal" | "dueTotal">;

const money = (value: number | null | undefined) => String(value ?? 0);

export const buildPosDigitalReceiptText = (sale: PosReceiptSale) => {
    const lines = [
        "SALE RECEIPT",
        `Bill No: ${sale.saleNumber ?? sale.id}`,
        `Date: ${new Date(sale.createdAt).toISOString()}`,
        "",
        "ITEMS",
    ];

    for (const item of sale.items) {
        lines.push(`${item.productNameSnapshot} x${Number(item.quantity)} ${money(item.lineTotal)}`);
        for (const addOn of item.addOns ?? []) {
            lines.push(`  + ${addOn.addOnNameSnapshot} x${Number(addOn.totalQuantity)} ${money(addOn.lineTotal)}`);
        }
    }

    lines.push(
        "",
        `TOTAL: ${money(sale.grandTotal)}`,
        `COLLECTED: ${money(sale.paidTotal)}`,
        `DUE: ${money(sale.dueTotal)}`,
        `PAYMENT STATUS: ${getPosPaymentStatusReceiptLabel(sale.paymentStatus)}`,
        "",
        "Thank you! Visit again.",
    );

    return lines.join("\n");
};

export type PosReceiptShareContent = { title: string; message: string };
export type PosReceiptShareAction = "shared" | "dismissed" | "failed";

export const sharePosDigitalReceipt = async (
    sale: PosReceiptSale,
    share: (content: PosReceiptShareContent) => Promise<{ action?: string }>,
): Promise<PosReceiptShareAction> => {
    try {
        const response = await share({
            title: `Sale ${sale.saleNumber ?? sale.id}`,
            message: buildPosDigitalReceiptText(sale),
        });
        return response.action === "dismissedAction" ? "dismissed" : "shared";
    } catch {
        return "failed";
    }
};
