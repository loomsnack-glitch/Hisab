import type { SaleDetailDTO } from "@repo/types";

const MAX_LINE_LENGTH = 60;

const formatAmount = (amount: number): string =>
    `₹${Number(amount).toFixed(2)}`;

const formatDate = (value: string | Date | null | undefined): string => {
    if (!value) return "-";
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime())
        ? "-"
        : date.toISOString().replace("T", " ").replace(".000Z", " UTC");
};

const wrapLine = (value: string, maxLength = MAX_LINE_LENGTH): string[] => {
    if (value.length <= maxLength) return [value];

    const words = value.split(/(\s+)/).filter(Boolean);
    const lines: string[] = [];
    let current = "";

    for (const word of words) {
        if (/^\s+$/.test(word)) {
            if (current && !current.endsWith(" ")) current += " ";
            continue;
        }

        if (word.length > maxLength) {
            if (current.trim()) {
                lines.push(current.trimEnd());
                current = "";
            }
            for (let index = 0; index < word.length; index += maxLength) {
                const chunk = word.slice(index, index + maxLength);
                if (
                    chunk.length === maxLength &&
                    index + maxLength < word.length
                ) {
                    lines.push(chunk);
                } else {
                    current = chunk;
                }
            }
            continue;
        }

        if (current.length + word.length > maxLength) {
            lines.push(current.trimEnd());
            current = word;
        } else {
            current += word;
        }
    }

    if (current.trim()) lines.push(current.trimEnd());
    return lines.length > 0 ? lines : [""];
};

const appendWrapped = (lines: string[], value: string): void => {
    for (const line of value.split("\n")) {
        lines.push(...wrapLine(line));
    }
};

const paymentLabel = (status: SaleDetailDTO["paymentStatus"]): string =>
    status.charAt(0).toUpperCase() + status.slice(1);

export const formatInvoiceText = (sale: SaleDetailDTO): string => {
    const lines: string[] = [
        "*Ganatri Invoice*",
        "",
        `Bill: ${sale.saleNumber ?? sale.id}`,
        `Date: ${formatDate(sale.committedAt ?? sale.createdAt)}`,
        `Customer: ${sale.customerNameSnapshot ?? sale.customer?.name ?? "Customer"}`,
        `Phone: ${sale.customerPhoneSnapshot ?? sale.customer?.phone ?? "-"}`,
        "",
        "Items:",
    ];

    for (const item of sale.items) {
        appendWrapped(
            lines,
            `- ${item.productNameSnapshot} x ${item.quantity}: ${formatAmount(Number(item.lineTotal))}`,
        );
        for (const addOn of item.addOns ?? []) {
            appendWrapped(
                lines,
                `  + ${addOn.addOnNameSnapshot} x ${addOn.totalQuantity}: ${formatAmount(Number(addOn.lineTotal))}`,
            );
        }
        for (const component of item.bundleComponents ?? []) {
            appendWrapped(
                lines,
                `  > ${component.productNameSnapshot} x ${component.totalQuantity}`,
            );
            for (const addOn of component.addOns ?? []) {
                appendWrapped(
                    lines,
                    `    + ${addOn.addOnNameSnapshot} x ${addOn.totalQuantity}`,
                );
            }
        }
    }

    lines.push(
        "",
        `Subtotal: ${formatAmount(Number(sale.subtotal))}`,
        `Discount: ${formatAmount(Number(sale.discountTotal))}`,
        `Total: ${formatAmount(Number(sale.grandTotal))}`,
        `Paid: ${formatAmount(Number(sale.paidTotal))}`,
        `Due: ${formatAmount(Number(sale.dueTotal))}`,
        `Payment: ${paymentLabel(sale.paymentStatus)}`,
    );

    if (sale.notes) {
        lines.push("", "Notes:");
        appendWrapped(lines, sale.notes);
    }

    lines.push("", "Thank you for shopping with us.");
    return lines.join("\n");
};
