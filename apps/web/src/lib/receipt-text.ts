import type { SaleDetailDTO } from "@repo/types";

import { formatDateTime } from "@/lib/format";

export type ReceiptContext = {
    organizationName?: string | null;
    storeName?: string | null;
    storeAddress?: string | null;
    storePhone?: string | null;
};

const receiptWidth = 48;
const itemColumnWidth = 27;
const quantityColumnWidth = 5;
const rateColumnWidth = 8;
const priceColumnWidth = 8;
const summaryLabelWidth = 36;
const summaryValueWidth = 12;

const money = (value: number | string | null | undefined) => String(value ?? 0);

const wrapText = (value: string, width: number) => {
    const words = value.trim().split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let current = "";

    for (const word of words) {
        if (word.length > width) {
            if (current) {
                lines.push(current);
                current = "";
            }
            for (let index = 0; index < word.length; index += width) {
                lines.push(word.slice(index, index + width));
            }
            continue;
        }

        const next = current ? `${current} ${word}` : word;
        if (next.length > width) {
            lines.push(current);
            current = word;
        } else {
            current = next;
        }
    }

    if (current) {
        lines.push(current);
    }

    return lines.length > 0 ? lines : [""];
};

const centerText = (value: string) => {
    const text = value.slice(0, receiptWidth);
    const leftPadding = Math.max(Math.floor((receiptWidth - text.length) / 2), 0);
    return `${" ".repeat(leftPadding)}${text}`;
};

const appendItemRow = (lines: string[], name: string, quantity: string, rate: string, price: string) => {
    const nameLines = wrapText(name, itemColumnWidth);
    nameLines.forEach((nameLine, index) => {
        lines.push(
            index === 0
                ? `${nameLine.padEnd(itemColumnWidth)}${quantity.padStart(quantityColumnWidth)}${rate.padStart(rateColumnWidth)}${price.padStart(priceColumnWidth)}`
                : nameLine.padEnd(receiptWidth),
        );
    });
};

const appendSummaryRow = (lines: string[], label: string, value: string) => {
    lines.push(`${label.padEnd(summaryLabelWidth)}${value.padStart(summaryValueWidth)}`);
};

export const buildReceiptText = (sale: SaleDetailDTO, context: ReceiptContext = {}): string => {
    const separator = "-".repeat(receiptWidth);
    const doubleSeparator = "=".repeat(receiptWidth);
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

    const lines: string[] = [];
    const organizationName = context.organizationName?.trim();
    const storeName = context.storeName?.trim();
    const storeAddress = context.storeAddress?.trim();
    const storePhone = context.storePhone?.trim();

    lines.push(doubleSeparator);
    if (organizationName) lines.push(centerText(organizationName));
    if (storeName) lines.push(centerText(storeName));
    if (storeAddress) wrapText(storeAddress, receiptWidth).forEach((line) => lines.push(centerText(line)));
    if (storePhone) lines.push(centerText(`Phone: ${storePhone}`));
    lines.push(centerText("INVOICE / RECEIPT"));
    if (organizationName || storeName || storeAddress || storePhone) lines.push(separator);
    lines.push(`Bill #: ${sale.saleNumber ? sale.saleNumber : "Draft"}`);
    lines.push(`Date: ${formatDateTime(sale.createdAt)}`);
    const customerWithPhone = sale.customer?.phone ? sale.customer : null;
    lines.push(`Customer: ${customerWithPhone?.name || "Walk-in Customer"}`);
    if (customerWithPhone?.phone) lines.push(`Phone: ${customerWithPhone.phone}`);
    lines.push(separator);
    lines.push(
        `${"ITEM".padEnd(itemColumnWidth)}${"QTY".padStart(quantityColumnWidth)}${"RATE".padStart(rateColumnWidth)}${"PRICE".padStart(priceColumnWidth)}`,
    );
    lines.push(separator);

    sale.items.forEach((item) => {
        appendItemRow(
            lines,
            item.productNameSnapshot,
            String(Number(item.quantity)),
            money(item.unitPriceSnapshot),
            money(item.lineTotal),
        );
        if (Number(item.discountAmount) > 0) {
            wrapText(`  * Discount: -${item.discountAmount}`, receiptWidth).forEach((line) => lines.push(line));
        }

        (item.addOns ?? []).forEach((addOn) => {
            appendItemRow(
                lines,
                `+ ${addOn.addOnNameSnapshot}`,
                String(Number(addOn.totalQuantity)),
                money(addOn.unitPriceSnapshot),
                money(addOn.lineTotal),
            );
        });

        (item.bundleComponents ?? []).forEach((component) => {
            appendItemRow(
                lines,
                `* ${component.productNameSnapshot}`,
                String(Number(component.totalQuantity)),
                money(component.unitPriceSnapshot),
                "",
            );
            if (Number(component.priceAdjustmentSnapshot ?? 0) !== 0) {
                const adjustment = money(component.priceAdjustmentSnapshot);
                wrapText(`  * Option adjustment: ${adjustment}`, receiptWidth).forEach((line) => lines.push(line));
            }
            (component.addOns ?? []).forEach((addOn) => {
                const addOnRate = Number(addOn.unitPriceSnapshot) - Number(addOn.unitDiscountSnapshot);
                const addOnTotal = addOnRate * Number(addOn.totalQuantity);
                appendItemRow(
                    lines,
                    `  + ${addOn.addOnNameSnapshot}`,
                    String(Number(addOn.totalQuantity)),
                    money(addOnRate),
                    money(addOnTotal),
                );
                if (Number(addOn.unitDiscountSnapshot) > 0) {
                    wrapText(
                        `    * Add-on discount: -${money(Number(addOn.unitDiscountSnapshot) * Number(addOn.totalQuantity))}`,
                        receiptWidth,
                    ).forEach((line) => lines.push(line));
                }
            });
        });
    });

    lines.push(separator);
    appendSummaryRow(lines, "Subtotal:", String(discountedItemsSubtotal));
    if (itemDiscountTotal > 0) {
        appendSummaryRow(lines, "Item Discount:", `-${itemDiscountTotal}`);
    }
    if (Number(sale.orderDiscountAmount) > 0) {
        appendSummaryRow(lines, "Order Discount:", `-${sale.orderDiscountAmount}`);
    }
    lines.push(doubleSeparator);
    lines.push(centerText(`FINAL AMOUNT: ${money(sale.grandTotal)}`));
    lines.push(doubleSeparator);
    lines.push(centerText("Thank you! Visit again"));
    lines.push(doubleSeparator);

    return lines.join("\n") + "\n";
};
