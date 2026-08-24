import PDFDocument from "pdfkit";
import type { CustomerDTO, SaleSummaryDTO } from "@repo/types";

export type DueReminderPdfContext = {
    organizationName?: string | null;
    storeName?: string | null;
    storeAddress?: string | null;
};

const amount = (value: number | string | null | undefined): string => {
    const number = Number(value ?? 0);
    return `Rs. ${(Number.isFinite(number) ? number : 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const clean = (value: string | null | undefined): string => value?.trim() ?? "";

export const renderDueReminderPdf = (
    customer: CustomerDTO,
    sales: SaleSummaryDTO[],
    context: DueReminderPdfContext = {},
): Promise<Buffer> => new Promise((resolve, reject) => {
    const document = new PDFDocument({
        size: "A4",
        margin: 48,
        compress: true,
        info: { Title: "Due statement", Subject: "Outstanding balance", Creator: "Ganatri" },
    });
    const chunks: Buffer[] = [];
    document.on("data", (chunk: Uint8Array) => chunks.push(Buffer.from(chunk)));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);

    const organizationName = clean(context.organizationName) || "Ganatri";
    const storeName = clean(context.storeName);
    const storeAddress = clean(context.storeAddress);
    const totalDue = sales.reduce((sum, sale) => sum + Number(sale.dueTotal ?? 0), 0);

    document.fillColor("#111827").font("Helvetica-Bold").fontSize(22).text(organizationName, { align: "center" });
    if (storeName) document.font("Helvetica").fontSize(10).text(storeName, { align: "center" });
    if (storeAddress) document.fontSize(9).fillColor("#4b5563").text(storeAddress, { align: "center" });
    document.moveDown(0.8);
    document.font("Helvetica-Bold").fontSize(15).fillColor("#111827").text("DUE STATEMENT", { align: "center" });
    document.moveDown(1);
    document.font("Helvetica-Bold").fontSize(10).text("CUSTOMER");
    document.font("Helvetica").fontSize(11).text(customer.name);
    if (customer.phone) document.fontSize(10).fillColor("#4b5563").text(customer.phone);
    document.moveDown(1);

    document.fillColor("#111827").font("Helvetica-Bold").fontSize(10).text("OUTSTANDING BILLS");
    document.moveDown(0.4);
    for (const sale of sales) {
        const invoice = sale.saleNumber ?? sale.id;
        const y = document.y;
        document.font("Helvetica").fontSize(10).text(`Invoice #${invoice}`, 48, y, { width: 330 });
        document.text(amount(sale.dueTotal), 390, y, { width: 154, align: "right" });
        document.moveDown(0.7);
    }
    document.moveDown(0.6);
    document.moveTo(48, document.y).lineTo(544, document.y).strokeColor("#d1d5db").stroke();
    document.moveDown(0.8);
    document.font("Helvetica-Bold").fontSize(13).text("Total due", 48, document.y, { width: 330 });
    document.text(amount(totalDue), 390, document.y, { width: 154, align: "right" });
    document.moveDown(2);
    document.font("Helvetica").fontSize(10).fillColor("#4b5563").text("Please contact the Store if you have already completed this payment.");
    document.end();
});
