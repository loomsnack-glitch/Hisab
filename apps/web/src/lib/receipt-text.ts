import type { SaleDetailDTO } from "@repo/types";

import { formatDateTime } from "@/lib/format";

const money = (value: number | string | null | undefined) => String(value ?? 0);

export const buildReceiptText = (sale: SaleDetailDTO): string => {
    const separator = "------------------------------------------";
    const doubleSeparator = "==========================================";
    const itemDiscountTotal = sale.items.reduce((total, item) => {
        const parentDiscount = Number(item.discountAmount ?? 0);
        const addOnDiscount = (item.addOns ?? []).reduce(
            (addOnTotal, addOn) => addOnTotal + Number(addOn.discountAmount ?? 0),
            0,
        );
        return total + parentDiscount + addOnDiscount;
    }, 0);
    const discountedItemsSubtotal = Math.max(
        Number(sale.subtotal ?? 0) - itemDiscountTotal,
        0,
    );

    let text = "";
    text += `${doubleSeparator}\n`;
    text += "             INVOICE / RECEIPT\n";
    text += `${doubleSeparator}\n`;
    text += `Bill #: ${sale.saleNumber ? sale.saleNumber : "Draft"}\n`;
    text += `Date: ${formatDateTime(sale.createdAt)}\n`;
    text += `Status: ${sale.status.toUpperCase()} (${sale.paymentStatus.toUpperCase()})\n`;
    text += `Customer: ${sale.customer?.name || "Walk-in Customer"}\n`;
    text += `${separator}\n`;
    text += "ITEM                    QTY    PRICE    TOTAL\n";
    text += `${separator}\n`;

    sale.items.forEach((item) => {
        const name = item.productNameSnapshot.padEnd(20).substring(0, 20);
        const qty = String(Number(item.quantity)).padStart(5);
        const price = money(item.unitPriceSnapshot).padStart(8);
        const total = money(item.lineTotal).padStart(8);
        text += `${name}${qty}${price}${total}\n`;
        if (Number(item.discountAmount) > 0) {
            text += `  * Disc: -${item.discountAmount}\n`;
        }

        (item.addOns ?? []).forEach((addOn) => {
            const addOnName = `+ ${addOn.addOnNameSnapshot}`.padEnd(20).substring(0, 20);
            const addOnQty = String(Number(addOn.totalQuantity)).padStart(5);
            const addOnPrice = money(addOn.unitPriceSnapshot).padStart(8);
            const addOnTotal = money(addOn.lineTotal).padStart(8);
            text += `${addOnName}${addOnQty}${addOnPrice}${addOnTotal}\n`;
        });

        (item.bundleComponents ?? []).forEach((component) => {
            const componentName = `* ${component.productNameSnapshot}`.padEnd(20).substring(0, 20);
            const componentQty = String(Number(component.totalQuantity)).padStart(5);
            text += `${componentName}${componentQty}${" ".repeat(16)}\n`;
            if (Number(component.priceAdjustmentSnapshot ?? 0) !== 0) {
                const adjustment = money(component.priceAdjustmentSnapshot);
                text += `  * Option adjustment: ${adjustment}\n`;
            }
            (component.addOns ?? []).forEach((addOn) => {
                const addOnName = `  + ${addOn.addOnNameSnapshot}`.padEnd(20).substring(0, 20);
                const addOnQty = String(Number(addOn.totalQuantity)).padStart(5);
                const addOnTotal = money(
                    (Number(addOn.unitPriceSnapshot) - Number(addOn.unitDiscountSnapshot)) * Number(addOn.totalQuantity),
                ).padStart(8);
                text += `${addOnName}${addOnQty}${addOnTotal.padStart(16)}\n`;
                if (Number(addOn.unitDiscountSnapshot) > 0) {
                    text += `    * Add-on discount: -${money(Number(addOn.unitDiscountSnapshot) * Number(addOn.totalQuantity))}\n`;
                }
            });
        });
    });

    text += `${separator}\n`;
    text += `Items Subtotal:`.padEnd(30) + String(discountedItemsSubtotal).padStart(12) + "\n";
    if (itemDiscountTotal > 0) {
        text += `Item Discount Included:`.padEnd(30) + String(itemDiscountTotal).padStart(12) + "\n";
    }
    if (Number(sale.orderDiscountAmount) > 0) {
        text += `Order Discount:`.padEnd(30) + String(sale.orderDiscountAmount).padStart(12) + "\n";
    }
    text += `Settlement Total:`.padEnd(30) + money(sale.grandTotal).padStart(12) + "\n";
    text += `Collected:`.padEnd(30) + money(sale.paidTotal).padStart(12) + "\n";
    text += `Due:`.padEnd(30) + money(sale.dueTotal).padStart(12) + "\n";
    text += `${doubleSeparator}\n`;
    text += "           Thank you for shopping!\n";
    text += `${doubleSeparator}\n`;

    return text;
};
