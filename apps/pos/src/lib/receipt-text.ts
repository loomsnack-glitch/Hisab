import type { SaleDetailDTO } from "@repo/types";

import { formatDateTime } from "@/lib/format";

export type ReceiptContext = {
  organizationName?: string | null;
  organizationTagline?: string | null;
  storeName?: string | null;
  storeAddress?: string | null;
  storePhone?: string | null;
};
export const RECEIPT_WIDTH = 42;
const defaultReceiptWidth = 48;
const quantityColumnWidth = 5;
const rateColumnWidth = 8;
const priceColumnWidth = 8;
const summaryValueWidth = 12;
const maximumItemIndent = 4;
const minimumReceiptWidth =
  quantityColumnWidth + rateColumnWidth + priceColumnWidth + maximumItemIndent;

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

const centerText = (value: string, width: number) => {
  const leftPadding = Math.max(Math.floor((width - value.length) / 2), 0);
  return `${" ".repeat(leftPadding)}${value}`;
};

const appendCenteredText = (lines: string[], value: string, width: number) => {
  wrapText(value, width).forEach((line) => lines.push(centerText(line, width)));
};

export const countWrappedReceiptLines = (value: string, width: number) =>
  wrapText(value, width).length;

const appendItemRow = (
  lines: string[],
  name: string,
  quantity: string,
  rate: string,
  price: string,
  itemColumnWidth: number,
  indent = "",
) => {
  const nameLines = wrapText(name, itemColumnWidth - indent.length).map(
    (line, index) =>
      `${index === 0 ? indent : " ".repeat(indent.length)}${line}`,
  );
  const quantityLines = wrapText(quantity, quantityColumnWidth);
  const rateLines = wrapText(rate, rateColumnWidth);
  const priceLines = wrapText(price, priceColumnWidth);
  const rowCount = Math.max(
    nameLines.length,
    quantityLines.length,
    rateLines.length,
    priceLines.length,
  );

  for (let index = 0; index < rowCount; index += 1) {
    lines.push(
      `${(nameLines[index] ?? "").padEnd(itemColumnWidth)}${(quantityLines[index] ?? "").padStart(quantityColumnWidth)}${(rateLines[index] ?? "").padStart(rateColumnWidth)}${(priceLines[index] ?? "").padStart(priceColumnWidth)}`,
    );
  }
};

const appendSummaryRow = (
  lines: string[],
  label: string,
  value: string,
  summaryLabelWidth: number,
) => {
  const labelLines = wrapText(label, summaryLabelWidth);
  const valueLines = wrapText(value, summaryValueWidth);
  const rowCount = Math.max(labelLines.length, valueLines.length);

  for (let index = 0; index < rowCount; index += 1) {
    lines.push(
      `${(labelLines[index] ?? "").padEnd(summaryLabelWidth)}${(valueLines[index] ?? "").padStart(summaryValueWidth)}`,
    );
  }
};

type ReceiptTextOptions = {
  doubleWidthEmphasis?: boolean;
  width?: number;
};

export const formatKotNumberForReceipt = (kotNumber: string) =>
  kotNumber.replace(/^KOT-/i, "");

export const formatKotNumbersForReceipt = (kotNumbers: string[]) =>
  kotNumbers.map(formatKotNumberForReceipt).join(", ");

export const TOKEN_NO_RECEIPT_PREFIX = "TOKEN NO:";

const appendWrappedText = (lines: string[], value: string, width: number) => {
  wrapText(value, width).forEach((line) => lines.push(line));
};

export const buildReceiptText = (
  sale: SaleDetailDTO,
  context: ReceiptContext = {},
  options: ReceiptTextOptions = {},
): string => {
  const width = options.width ?? defaultReceiptWidth;
  if (!Number.isInteger(width) || width < minimumReceiptWidth) {
    throw new Error(
      `Receipt width must be an integer of at least ${minimumReceiptWidth}`,
    );
  }
  const itemColumnWidth =
    width - quantityColumnWidth - rateColumnWidth - priceColumnWidth;
  const emphasisWidth = Math.floor(width / 2);
  const summaryLabelWidth = width - summaryValueWidth;
  const separator = "-".repeat(width);
  const doubleSeparator = "=".repeat(width);
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
  const organizationTagline = context.organizationTagline?.trim();
  const storeName = context.storeName?.trim();
  const storeAddress = context.storeAddress?.trim();
  const storePhone = context.storePhone?.trim();

  lines.push(doubleSeparator);
  if (organizationName) {
    appendCenteredText(
      lines,
      organizationName,
      options.doubleWidthEmphasis ? emphasisWidth : width,
    );
  }
  if (organizationTagline) {
    appendCenteredText(lines, organizationTagline, width);
  }
  if (storeName) appendCenteredText(lines, storeName, width);
  if (storeAddress) appendCenteredText(lines, storeAddress, width);
  if (storePhone) appendCenteredText(lines, `Phone: ${storePhone}`, width);
  appendCenteredText(lines, "INVOICE / RECEIPT", width);
  if (
    organizationName ||
    organizationTagline ||
    storeName ||
    storeAddress ||
    storePhone
  )
    lines.push(separator);
  appendWrappedText(
    lines,
    `Bill No: ${sale.saleNumber ? sale.saleNumber : "Draft"}`,
    width,
  );
  if (sale.serviceTableLabel) {
    appendWrappedText(lines, `Table No: ${sale.serviceTableLabel}`, width);
  }
  if (sale.kotNumbers && sale.kotNumbers.length > 0) {
    appendWrappedText(
      lines,
      `KOT NO: ${formatKotNumbersForReceipt(sale.kotNumbers)}`,
      width,
    );
  }
  if (sale.tokenNumber) {
    const tokenLine = `${TOKEN_NO_RECEIPT_PREFIX} ${sale.tokenNumber}`;
    if (options.doubleWidthEmphasis) {
      appendCenteredText(lines, tokenLine, emphasisWidth);
    } else {
      appendWrappedText(lines, tokenLine, width);
    }
  }
  appendWrappedText(lines, `Date: ${formatDateTime(sale.createdAt)}`, width);
  const customerWithPhone = sale.customer?.phone ? sale.customer : null;
  appendWrappedText(
    lines,
    `Customer: ${customerWithPhone?.name || "Walk-in Customer"}`,
    width,
  );
  if (customerWithPhone?.phone)
    appendWrappedText(lines, `Phone: ${customerWithPhone.phone}`, width);
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
      itemColumnWidth,
    );
    if (Number(item.discountAmount) > 0) {
      wrapText(`  * Discount: -${item.discountAmount}`, width).forEach((line) =>
        lines.push(line),
      );
    }

    (item.addOns ?? []).forEach((addOn) => {
      appendItemRow(
        lines,
        `+ ${addOn.addOnNameSnapshot}`,
        String(Number(addOn.totalQuantity)),
        money(addOn.unitPriceSnapshot),
        money(addOn.lineTotal),
        itemColumnWidth,
        "  ",
      );
    });

    (item.bundleComponents ?? []).forEach((component) => {
      appendItemRow(
        lines,
        `* ${component.productNameSnapshot}`,
        String(Number(component.totalQuantity)),
        money(component.unitPriceSnapshot),
        "",
        itemColumnWidth,
        "  ",
      );
      if (Number(component.priceAdjustmentSnapshot ?? 0) !== 0) {
        const adjustment = money(component.priceAdjustmentSnapshot);
        wrapText(`  * Option adjustment: ${adjustment}`, width).forEach(
          (line) => lines.push(line),
        );
      }
      (component.addOns ?? []).forEach((addOn) => {
        const addOnRate =
          Number(addOn.unitPriceSnapshot) - Number(addOn.unitDiscountSnapshot);
        const addOnTotal = addOnRate * Number(addOn.totalQuantity);
        appendItemRow(
          lines,
          `+ ${addOn.addOnNameSnapshot}`,
          String(Number(addOn.totalQuantity)),
          money(addOnRate),
          money(addOnTotal),
          itemColumnWidth,
          "    ",
        );
        if (Number(addOn.unitDiscountSnapshot) > 0) {
          wrapText(
            `    * Add-on discount: -${money(Number(addOn.unitDiscountSnapshot) * Number(addOn.totalQuantity))}`,
            width,
          ).forEach((line) => lines.push(line));
        }
      });
    });
  });

  lines.push(separator);
  appendSummaryRow(
    lines,
    "Subtotal:",
    String(discountedItemsSubtotal),
    summaryLabelWidth,
  );
  if (itemDiscountTotal > 0) {
    appendSummaryRow(
      lines,
      "Item Discount:",
      `-${itemDiscountTotal}`,
      summaryLabelWidth,
    );
  }
  if (Number(sale.orderDiscountAmount) > 0) {
    appendSummaryRow(
      lines,
      "Order Discount:",
      `-${sale.orderDiscountAmount}`,
      summaryLabelWidth,
    );
  }
  lines.push(doubleSeparator);
  appendCenteredText(
    lines,
    `FINAL AMOUNT: ${money(sale.grandTotal)}`,
    options.doubleWidthEmphasis ? emphasisWidth : width,
  );
  lines.push(doubleSeparator);
  appendCenteredText(lines, "Thank you! Visit again", width);
  lines.push(doubleSeparator);

  return lines.join("\n") + "\n";
};
